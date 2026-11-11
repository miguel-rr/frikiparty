import type { PotGroup } from '@/lib/tournament/pot-groups';

/**
 * The general auction ("subasta general"): one engine for pots, a free
 * market or both, with open or sealed bids, random lots or nomination by
 * turns. Event-sourced like the pot auction: the state is
 * `foldMarket(events)` and commands only propose the events that follow.
 * Every random choice is made in a command and written in its event, so
 * the fold (and any replay) is deterministic.
 *
 * Groups come from the pots: each team takes its quota of each group
 * (one, at most one, one or two, or as many as it needs). Groups are
 * auctioned in pot order, skipping the captains' pot.
 */

type BiddingMode = 'open' | 'sealed';
/** Sealed bids: the winner pays their own bid, or the second plus one. */
type SealedPrice = 'own' | 'second_plus_one';
/** What everyone sees after each lot. */
type BidReveal = 'all' | 'winner' | 'end';
type LotOrder = 'random' | 'nomination';
/** Turn order for nominating, set once and repeated every round. */
/**
 * Who nominates first. `draw_each_round` draws again every time all
 * captains have had their turn.
 */
type TurnOrder = 'draw' | 'draw_each_round' | 'ranking' | 'inverse_ranking';
/** Money kept back for each seat still to fill after this one. */
type Reserve = 'none' | 'one' | 'minimum';

/**
 * `auction`: players are bought. `draft`: on their turn each captain just
 * picks one (no money), from the group on the table.
 */
type MarketMode = 'auction' | 'draft';
/** Draft turns: the same order every round, or reversed every other one. */
type DraftOrder = 'linear' | 'snake';

type MarketConfig = {
  mode: MarketMode;
  draftOrder: DraftOrder;
  bidding: BiddingMode;
  sealedPrice: SealedPrice;
  reveal: BidReveal;
  lotOrder: LotOrder;
  turnOrder: TurnOrder;
  budget: number;
  /** Extra money per place a captain is below the best captain (0 = none). */
  compensationPerPlace: number;
  /** Minimum price per pot (same index as the pots; captains' pot ignored). */
  minBids: number[];
  reserve: Reserve;
  /** Sealed: time to bid on each lot. Open: time before the first bid. */
  lotTimeMs: number;
  /** Open: each bid gives at least this much time to answer. */
  countdownMs: number;
  /** Sealed: each captain's bank for the whole auction (0 = no bank). */
  timeBankMs: number;
};

const DEFAULT_MARKET_CONFIG: MarketConfig = {
  mode: 'auction',
  draftOrder: 'snake',
  bidding: 'sealed',
  sealedPrice: 'second_plus_one',
  reveal: 'all',
  lotOrder: 'nomination',
  turnOrder: 'draw',
  budget: 100,
  compensationPerPlace: 0,
  minBids: [],
  reserve: 'one',
  lotTimeMs: 45_000,
  countdownMs: 15_000,
  timeBankMs: 0,
};

type MarketPhase =
  | 'idle' // between lots: the organiser moves on
  | 'nominating' // a captain chooses the next lot
  | 'lot' // bidding on a lot
  | 'paused'
  | 'closed';

type MarketBid = { captainId: string; amount: number; at: number };

type MarketLot = {
  playerId: string;
  groupIndex: number;
  nominatorId: string | null;
  /** Sealed: base deadline (bank time runs after it). Open: deadline. */
  deadlineAt: number;
  /** Sealed bids so far, or the open bids in order. */
  bids: MarketBid[];
};

type MarketSale = {
  playerId: string;
  groupIndex: number;
  captainId: string;
  amount: number;
  kind: 'sold' | 'auto' | 'raffle' | 'pick';
  /** Every bid of the lot (sealed), best first. */
  bids: { captainId: string; amount: number }[];
  /** How a tie at the top was settled, if there was one. */
  tieBreak: 'money' | 'draw' | null;
  at: number;
  seq: number;
};

type MarketState = {
  config: MarketConfig;
  pots: string[][];
  groups: PotGroup[];
  captainIds: string[];
  captainPotIndex: number;
  teamSize: number;
  budgets: Record<string, number>;
  /** Time bank left per captain, in ms. */
  banks: Record<string, number>;
  rosters: Record<string, string[]>;
  /** Groups to auction, in order. */
  walk: number[];
  walkCursor: number;
  /** The group being auctioned, once it has started. */
  startedGroup: number | null;
  /** Random order: players still to call in this pass of the group. */
  queue: string[];
  /** Random order: sales in this pass (a pass without any ends in a raffle). */
  passSales: number;
  turnOrder: string[];
  turnCursor: number;
  /** Draft: turns taken so far (decides the snake's direction). */
  turnCount: number;
  nominatorId: string | null;
  lot: MarketLot | null;
  phase: MarketPhase;
  pausedPhase: MarketPhase | null;
  pausedRemainingMs: number | null;
  /** When the next timer resolves (lot end, bank time included). */
  deadlineAt: number | null;
  sales: MarketSale[];
  lastSale: MarketSale | null;
  lastUnsold: string | null;
  startedAt: number | null;
  closedAt: number | null;
  lastSeq: number;
};

type MarketEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  at: number;
  undoneBySeq: number | null;
};

type EventDraft = {
  type: string;
  payload?: Record<string, unknown>;
  at?: number;
};
type CommandResult = { events: EventDraft[] } | { error: string };

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const strList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

const shuffleWith = <T>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

// ── Rules ────────────────────────────────────────────────────────────

const assignedSet = (state: MarketState) =>
  new Set(Object.values(state.rosters).flat());

const unsoldIn = (state: MarketState, groupIndex: number) => {
  const assigned = assignedSet(state);
  return (state.pots[groupIndex] ?? []).filter((id) => !assigned.has(id));
};

const countFrom = (
  state: MarketState,
  captainId: string,
  groupIndex: number,
) => {
  const group = new Set(state.pots[groupIndex] ?? []);
  return (state.rosters[captainId] ?? []).filter((id) => group.has(id)).length;
};

/** Seats left besides the captain's own. */
const freeSeats = (state: MarketState, captainId: string) =>
  state.teamSize - 1 - (state.rosters[captainId] ?? []).length;

/** Groups after `groupIndex` where the captain still must take one. */
const mandatoryLater = (
  state: MarketState,
  captainId: string,
  groupIndex: number,
) =>
  state.walk.filter((index) => {
    if (index === groupIndex) return false;
    const quota = state.groups[index]?.quota;
    if (quota !== 'one' && quota !== 'one_or_two') return false;
    return (
      countFrom(state, captainId, index) === 0 &&
      unsoldIn(state, index).length > 0
    );
  }).length;

/** Whether a captain may take one more player from a group now. */
const canTake = (state: MarketState, captainId: string, groupIndex: number) => {
  if (freeSeats(state, captainId) < 1) return false;
  if (
    freeSeats(state, captainId) - 1 <
    mandatoryLater(state, captainId, groupIndex)
  ) {
    return false;
  }
  const quota = state.groups[groupIndex]?.quota ?? 'one';
  const count = countFrom(state, captainId, groupIndex);
  if (quota === 'fill') return true;
  if (quota === 'one_or_two') {
    if (count >= 2) return false;
    if (count === 0) return true;
    // A second only if everyone without one can still get one.
    const withoutOne = state.captainIds.filter(
      (id) => countFrom(state, id, groupIndex) === 0,
    ).length;
    return unsoldIn(state, groupIndex).length - 1 >= withoutOne;
  }
  return count === 0;
};

const eligibleFor = (state: MarketState, groupIndex: number) =>
  state.captainIds.filter((id) => canTake(state, id, groupIndex));

const minBidFor = (state: MarketState, groupIndex: number) =>
  Math.max(0, state.config.minBids[groupIndex] ?? 1);

/** The smallest minimum still to be paid anywhere, for the reserve. */
const reserveUnit = (state: MarketState) => {
  if (state.config.reserve === 'none') return 0;
  if (state.config.reserve === 'one') return 1;
  const mins = state.walk.map((index) => minBidFor(state, index));
  return mins.length > 0 ? Math.min(...mins) : 0;
};

/** The most a captain can bid now, keeping the reserve for later seats. */
const maxBidFor = (state: MarketState, captainId: string) =>
  Math.max(
    0,
    (state.budgets[captainId] ?? 0) -
      reserveUnit(state) * Math.max(0, freeSeats(state, captainId) - 1),
  );

/** A captain's floor on this lot: the minimum, or all they can if less. */
const floorFor = (state: MarketState, captainId: string, groupIndex: number) =>
  Math.min(minBidFor(state, groupIndex), maxBidFor(state, captainId));

const currentGroup = (state: MarketState) =>
  state.walk[state.walkCursor] ?? null;

const groupDone = (state: MarketState, groupIndex: number) =>
  unsoldIn(state, groupIndex).length === 0 ||
  eligibleFor(state, groupIndex).length === 0;

// ── Fold ─────────────────────────────────────────────────────────────

const emptyMarket = (): MarketState => ({
  config: DEFAULT_MARKET_CONFIG,
  pots: [],
  groups: [],
  captainIds: [],
  captainPotIndex: 0,
  teamSize: 1,
  budgets: {},
  banks: {},
  rosters: {},
  walk: [],
  walkCursor: 0,
  startedGroup: null,
  queue: [],
  passSales: 0,
  turnOrder: [],
  turnCursor: 0,
  turnCount: 0,
  nominatorId: null,
  lot: null,
  phase: 'idle',
  pausedPhase: null,
  pausedRemainingMs: null,
  deadlineAt: null,
  sales: [],
  lastSale: null,
  lastUnsold: null,
  startedAt: null,
  closedAt: null,
  lastSeq: 0,
});

/** Sealed: when the lot really ends, waiting for banks of pending captains. */
const sealedDeadline = (state: MarketState, lot: MarketLot) => {
  const submitted = new Set(lot.bids.map((bid) => bid.captainId));
  const pending = eligibleFor(state, lot.groupIndex).filter(
    (id) => !submitted.has(id),
  );
  if (pending.length === 0) return lot.deadlineAt;
  return Math.max(
    lot.deadlineAt,
    ...pending.map((id) => lot.deadlineAt + (state.banks[id] ?? 0)),
  );
};

const applyBank = (state: MarketState, used: unknown) => {
  if (!used || typeof used !== 'object') return;
  for (const [captainId, ms] of Object.entries(
    used as Record<string, unknown>,
  )) {
    state.banks[captainId] = Math.max(
      0,
      (state.banks[captainId] ?? 0) - num(ms),
    );
  }
};

const settleSale = (
  state: MarketState,
  event: MarketEvent,
  kind: MarketSale['kind'],
) => {
  const p = event.payload;
  const captainId = str(p.captainId);
  const playerId = str(p.playerId);
  const amount = Math.min(state.budgets[captainId] ?? 0, num(p.amount));
  state.budgets[captainId] = (state.budgets[captainId] ?? 0) - amount;
  state.rosters[captainId] = [...(state.rosters[captainId] ?? []), playerId];
  const sale: MarketSale = {
    playerId,
    groupIndex: num(p.groupIndex),
    captainId,
    amount,
    kind,
    bids: (p.bids as MarketSale['bids']) ?? [],
    tieBreak: (p.tieBreak as MarketSale['tieBreak']) ?? null,
    at: event.at,
    seq: event.seq,
  };
  state.sales.push(sale);
  state.lastSale = sale;
  state.queue = state.queue.filter((id) => id !== playerId);
  return sale;
};

const foldMarket = (events: MarketEvent[]): MarketState => {
  const state = emptyMarket();
  for (const event of events) {
    state.lastSeq = event.seq;
    if (event.undoneBySeq !== null) continue;
    const p = event.payload;
    switch (event.type) {
      case 'market_started': {
        state.config = {
          ...DEFAULT_MARKET_CONFIG,
          ...(p.config as Partial<MarketConfig>),
        };
        state.pots = (p.pots as string[][]) ?? [];
        state.groups = (p.groups as PotGroup[]) ?? [];
        state.captainIds = strList(p.captainIds);
        state.captainPotIndex = num(p.captainPotIndex);
        state.teamSize = num(p.teamSize, 1);
        state.budgets = { ...((p.budgets as Record<string, number>) ?? {}) };
        state.banks = Object.fromEntries(
          state.captainIds.map((id) => [id, state.config.timeBankMs]),
        );
        state.rosters = Object.fromEntries(
          state.captainIds.map((id) => [id, [] as string[]]),
        );
        state.walk = (p.walk as number[]) ?? [];
        state.turnOrder = strList(p.turnOrder);
        state.startedAt = event.at;
        state.phase = 'idle';
        break;
      }
      case 'market_config_changed': {
        state.config = {
          ...state.config,
          ...(p.config as Partial<MarketConfig>),
        };
        break;
      }
      case 'group_started': {
        const groupIndex = num(p.groupIndex);
        state.walkCursor = Math.max(0, state.walk.indexOf(groupIndex));
        state.startedGroup = groupIndex;
        state.queue = strList(p.queue);
        state.passSales = 0;
        state.phase = 'idle';
        break;
      }
      case 'pass_started': {
        state.queue = strList(p.queue);
        state.passSales = 0;
        state.phase = 'idle';
        break;
      }
      case 'turn_started': {
        state.nominatorId = str(p.captainId);
        state.turnCursor = num(p.turnCursor);
        state.turnCount = num(p.turnCount, state.turnCount);
        if (Array.isArray(p.turnOrder)) state.turnOrder = strList(p.turnOrder);
        state.phase = 'nominating';
        state.lastSale = null;
        state.lastUnsold = null;
        break;
      }
      case 'lot_opened': {
        const playerId = str(p.playerId);
        const opening = p.openingBid as MarketBid | undefined;
        state.queue = state.queue.filter((id) => id !== playerId);
        state.lot = {
          playerId,
          groupIndex: num(p.groupIndex),
          nominatorId: p.nominatorId ? str(p.nominatorId) : null,
          deadlineAt: num(p.deadlineAt),
          bids: opening ? [opening] : [],
        };
        state.phase = 'lot';
        state.lastSale = null;
        state.lastUnsold = null;
        state.deadlineAt =
          state.config.bidding === 'sealed'
            ? sealedDeadline(state, state.lot)
            : state.lot.deadlineAt;
        break;
      }
      case 'sealed_bid': {
        if (!state.lot) break;
        const captainId = str(p.captainId);
        state.lot.bids = [
          ...state.lot.bids.filter((bid) => bid.captainId !== captainId),
          { captainId, amount: num(p.amount), at: event.at },
        ];
        applyBank(state, p.bankUsed);
        state.deadlineAt = sealedDeadline(state, state.lot);
        break;
      }
      case 'open_bid': {
        if (!state.lot) break;
        state.lot.bids = [
          ...state.lot.bids,
          { captainId: str(p.captainId), amount: num(p.amount), at: event.at },
        ];
        state.lot.deadlineAt = num(p.deadlineAt);
        state.deadlineAt = state.lot.deadlineAt;
        break;
      }
      case 'lot_sold':
      case 'lot_auto_assigned': {
        applyBank(state, p.bankUsed);
        settleSale(state, event, event.type === 'lot_sold' ? 'sold' : 'auto');
        state.passSales += 1;
        state.lot = null;
        state.nominatorId = null;
        state.phase = 'idle';
        state.deadlineAt = null;
        break;
      }
      case 'player_picked': {
        settleSale(state, { ...event, payload: { ...p, amount: 0 } }, 'pick');
        state.nominatorId = null;
        state.phase = 'idle';
        break;
      }
      case 'lot_unsold': {
        applyBank(state, p.bankUsed);
        state.lastUnsold = state.lot?.playerId ?? null;
        state.lot = null;
        state.nominatorId = null;
        state.phase = 'idle';
        state.deadlineAt = null;
        break;
      }
      case 'raffle_assigned': {
        const assignments =
          (p.assignments as {
            captainId: string;
            playerId: string;
            amount: number;
          }[]) ?? [];
        for (const assignment of assignments) {
          settleSale(
            state,
            { ...event, payload: { ...assignment, groupIndex: p.groupIndex } },
            'raffle',
          );
        }
        state.queue = [];
        state.phase = 'idle';
        break;
      }
      case 'paused': {
        state.pausedPhase = state.phase;
        state.pausedRemainingMs =
          p.remainingMs === null ? null : num(p.remainingMs);
        state.phase = 'paused';
        state.deadlineAt = null;
        break;
      }
      case 'resumed': {
        state.phase = state.pausedPhase ?? 'idle';
        state.pausedPhase = null;
        const shift = num(p.shiftMs);
        if (state.lot) state.lot.deadlineAt += shift;
        state.deadlineAt = state.lot
          ? state.config.bidding === 'sealed'
            ? sealedDeadline(state, state.lot)
            : state.lot.deadlineAt
          : null;
        state.pausedRemainingMs = null;
        break;
      }
      case 'market_closed': {
        state.phase = 'closed';
        state.closedAt = event.at;
        state.deadlineAt = null;
        state.lot = null;
        break;
      }
      default:
        break;
    }
  }
  return state;
};

// ── Commands ─────────────────────────────────────────────────────────

/** Each captain's starting money: the budget plus any compensation. */
const startingBudgets = (
  captainIds: string[],
  ranking: string[],
  config: Pick<MarketConfig, 'budget' | 'compensationPerPlace'>,
) => {
  const place = new Map(ranking.map((id, index) => [id, index]));
  const byRank = [...captainIds].sort(
    (a, b) => (place.get(a) ?? 0) - (place.get(b) ?? 0),
  );
  return Object.fromEntries(
    byRank.map((id, index) => [
      id,
      config.budget + config.compensationPerPlace * index,
    ]),
  );
};

const startMarketEvents = (input: {
  pots: string[][];
  groups: PotGroup[];
  captainIds: string[];
  captainPotIndex: number;
  teamSize: number;
  ranking: string[];
  config: MarketConfig;
  now: number;
  random?: () => number;
}): EventDraft[] => {
  const random = input.random ?? Math.random;
  const place = new Map(input.ranking.map((id, index) => [id, index]));
  const byRank = [...input.captainIds].sort(
    (a, b) => (place.get(a) ?? 0) - (place.get(b) ?? 0),
  );
  const turnOrder =
    input.config.turnOrder === 'draw' ||
    input.config.turnOrder === 'draw_each_round'
      ? shuffleWith(input.captainIds, random)
      : input.config.turnOrder === 'ranking'
        ? byRank
        : [...byRank].reverse();
  const walk = input.pots
    .map((_, index) => index)
    .filter(
      (index) =>
        index !== input.captainPotIndex && (input.pots[index]?.length ?? 0) > 0,
    );
  return [
    {
      type: 'market_started',
      at: input.now,
      payload: {
        config: input.config,
        pots: input.pots,
        groups: input.groups,
        captainIds: input.captainIds,
        captainPotIndex: input.captainPotIndex,
        teamSize: input.teamSize,
        budgets: startingBudgets(input.captainIds, input.ranking, input.config),
        walk,
        turnOrder,
      },
    },
  ];
};

const closeEvent = (state: MarketState, now: number): EventDraft => ({
  type: 'market_closed',
  at: now,
  payload: { rosters: state.rosters },
});

/** The next captain in the turn order who can take someone from the group. */
const nextNominator = (state: MarketState, groupIndex: number) => {
  const count = state.turnOrder.length;
  for (let step = 0; step < count; step += 1) {
    const cursor = (state.turnCursor + step) % count;
    const captainId = state.turnOrder[cursor];
    if (captainId && canTake(state, captainId, groupIndex)) {
      return { captainId, cursor };
    }
  }
  return null;
};

/**
 * Draft: whose turn it is. Turn n of a round of n captains; the snake
 * reverses the order every other round. Captains who can't take anyone
 * from the group lose that turn.
 */
const nextDrafter = (state: MarketState, groupIndex: number) => {
  const count = state.turnOrder.length;
  if (count === 0) return null;
  for (let step = 0; step < 2 * count; step += 1) {
    const turn = state.turnCount + step;
    const round = Math.floor(turn / count);
    const position = turn % count;
    const index =
      state.config.draftOrder === 'snake' && round % 2 === 1
        ? count - 1 - position
        : position;
    const captainId = state.turnOrder[index];
    if (captainId && canTake(state, captainId, groupIndex)) {
      return { captainId, turnCount: turn + 1 };
    }
  }
  return null;
};

/** Draft: the captain on turn picks a player of the group on the table. */
const draftPick = (
  state: MarketState,
  captainId: string,
  playerId: string,
  now: number,
): CommandResult => {
  if (
    state.config.mode !== 'draft' ||
    state.phase !== 'nominating' ||
    state.nominatorId !== captainId
  ) {
    return { error: 'No es tu turno de elegir.' };
  }
  const groupIndex = currentGroup(state);
  if (groupIndex === null || !unsoldIn(state, groupIndex).includes(playerId)) {
    return { error: 'Ese jugador no está disponible ahora.' };
  }
  return {
    events: [
      {
        type: 'player_picked',
        at: now,
        payload: { playerId, groupIndex, captainId },
      },
    ],
  };
};

const openLotEvent = (
  state: MarketState,
  playerId: string,
  groupIndex: number,
  now: number,
  nominatorId: string | null,
  openingAmount: number | null,
): EventDraft => ({
  type: 'lot_opened',
  at: now,
  payload: {
    playerId,
    groupIndex,
    nominatorId,
    deadlineAt: now + state.config.lotTimeMs,
    ...(nominatorId !== null && openingAmount !== null
      ? {
          openingBid: {
            captainId: nominatorId,
            amount: openingAmount,
            at: now,
          },
        }
      : {}),
  },
});

/**
 * Organiser: move on. Opens the next group, the next random lot, the next
 * nominator's turn, an outright assignment, a raffle, or closes.
 */
const marketNext = (
  state: MarketState,
  now: number,
  random: () => number = Math.random,
): CommandResult => {
  if (state.phase !== 'idle') {
    return { error: 'Ahora mismo no toca pasar al siguiente lote.' };
  }
  let cursor = state.startedGroup === null ? 0 : state.walkCursor;
  let groupIndex = state.walk[cursor];
  while (groupIndex !== undefined && groupDone(state, groupIndex)) {
    cursor += 1;
    groupIndex = state.walk[cursor];
  }
  if (groupIndex === undefined) return { events: [closeEvent(state, now)] };
  if (state.startedGroup !== groupIndex) {
    return {
      events: [
        {
          type: 'group_started',
          at: now,
          payload: {
            groupIndex,
            queue: shuffleWith(unsoldIn(state, groupIndex), random),
          },
        },
      ],
    };
  }
  const eligible = eligibleFor(state, groupIndex);
  const unsold = unsoldIn(state, groupIndex);
  // A lone captain left for this group takes what's left, at the minimum.
  if (eligible.length === 1) {
    const captainId = eligible[0] ?? '';
    const playerId =
      state.config.lotOrder === 'random'
        ? (state.queue[0] ?? unsold[0])
        : unsold[0];
    return {
      events: [
        {
          type: 'lot_auto_assigned',
          at: now,
          payload: {
            playerId,
            groupIndex,
            captainId,
            amount: floorFor(state, captainId, groupIndex),
          },
        },
      ],
    };
  }
  if (state.config.mode === 'draft') {
    const next = nextDrafter(state, groupIndex);
    if (!next) return { events: [closeEvent(state, now)] };
    return {
      events: [
        {
          type: 'turn_started',
          at: now,
          payload: {
            captainId: next.captainId,
            turnCursor: state.turnCursor,
            turnCount: next.turnCount,
          },
        },
      ],
    };
  }
  if (state.config.lotOrder === 'nomination') {
    let next = nextNominator(state, groupIndex);
    if (!next) return { events: [closeEvent(state, now)] };
    // A full round has gone by (the turn wraps to the start): new draw.
    const roundOver =
      state.turnCount > 0 &&
      (state.turnCursor === 0 || next.cursor < state.turnCursor);
    let redrawn: string[] | null = null;
    if (state.config.turnOrder === 'draw_each_round' && roundOver) {
      redrawn = shuffleWith(state.turnOrder, random);
      next =
        nextNominator(
          { ...state, turnOrder: redrawn, turnCursor: 0 },
          groupIndex,
        ) ?? next;
    }
    const order = redrawn ?? state.turnOrder;
    return {
      events: [
        {
          type: 'turn_started',
          at: now,
          payload: {
            captainId: next.captainId,
            turnCursor: (next.cursor + 1) % Math.max(1, order.length),
            turnCount: state.turnCount + 1,
            ...(redrawn ? { turnOrder: redrawn } : {}),
          },
        },
      ],
    };
  }
  const queued = state.queue.filter((id) => unsold.includes(id));
  if (queued.length > 0) {
    return {
      events: [
        openLotEvent(state, queued[0] ?? '', groupIndex, now, null, null),
      ],
    };
  }
  // The pass is over with players left: a new pass, or a raffle when the
  // whole pass went by without a sale.
  if (state.passSales === 0) {
    return { events: [raffleEvent(state, groupIndex, now, random)] };
  }
  return {
    events: [
      {
        type: 'pass_started',
        at: now,
        payload: { groupIndex, queue: shuffleWith(unsold, random) },
      },
    ],
  };
};

/** Unsold players of a group handed out at random, at the minimum. */
const raffleEvent = (
  state: MarketState,
  groupIndex: number,
  now: number,
  random: () => number,
): EventDraft => {
  // Work on a scratch copy so each assignment sees the previous ones.
  const scratch: MarketState = {
    ...state,
    rosters: Object.fromEntries(
      Object.entries(state.rosters).map(([id, roster]) => [id, [...roster]]),
    ),
  };
  const assignments: { captainId: string; playerId: string; amount: number }[] =
    [];
  for (const playerId of shuffleWith(unsoldIn(state, groupIndex), random)) {
    const options = eligibleFor(scratch, groupIndex);
    if (options.length === 0) break;
    const captainId = options[Math.floor(random() * options.length)] ?? '';
    assignments.push({
      captainId,
      playerId,
      amount: floorFor(scratch, captainId, groupIndex),
    });
    scratch.rosters[captainId] = [
      ...(scratch.rosters[captainId] ?? []),
      playerId,
    ];
  }
  return {
    type: 'raffle_assigned',
    at: now,
    payload: { groupIndex, assignments },
  };
};

/**
 * The nominator puts a player of the current group up, with an opening
 * bid of at least their floor (so the lot never goes unsold).
 */
const nominate = (
  state: MarketState,
  captainId: string,
  playerId: string,
  amount: number,
  now: number,
): CommandResult => {
  if (state.phase !== 'nominating' || state.nominatorId !== captainId) {
    return { error: 'No es tu turno de nominar.' };
  }
  const groupIndex = currentGroup(state);
  if (groupIndex === null || !unsoldIn(state, groupIndex).includes(playerId)) {
    return { error: 'Ese jugador no está en juego ahora.' };
  }
  const floor = floorFor(state, captainId, groupIndex);
  if (amount < floor) return { error: `Tienes que pujar al menos ${floor}.` };
  if (amount > maxBidFor(state, captainId)) {
    return { error: `Como mucho puedes pujar ${maxBidFor(state, captainId)}.` };
  }
  const opened = openLotEvent(
    state,
    playerId,
    groupIndex,
    now,
    captainId,
    amount,
  );
  // Nobody else can bid on this player: it's the nominator's at once.
  const others = eligibleFor(state, groupIndex).filter(
    (id) => id !== captainId,
  );
  if (others.length === 0) {
    return {
      events: [
        opened,
        {
          type: 'lot_sold',
          at: now,
          payload: {
            playerId,
            groupIndex,
            captainId,
            amount: Math.min(amount, floorFor(state, captainId, groupIndex)),
            bids: [{ captainId, amount }],
            tieBreak: null,
            bankUsed: {},
          },
        },
      ],
    };
  }
  return { events: [opened] };
};

/** Sorts sealed bids best first: amount, then money left, then the draw. */
const rankSealed = (
  state: MarketState,
  bids: MarketBid[],
  random: () => number,
) => {
  const keyed = bids.map((bid) => ({ bid, draw: random() }));
  keyed.sort(
    (a, b) =>
      b.bid.amount - a.bid.amount ||
      (state.budgets[b.bid.captainId] ?? 0) -
        (state.budgets[a.bid.captainId] ?? 0) ||
      a.draw - b.draw,
  );
  const [first, second] = keyed;
  let tieBreak: MarketSale['tieBreak'] = null;
  if (first && second && first.bid.amount === second.bid.amount) {
    tieBreak =
      (state.budgets[first.bid.captainId] ?? 0) !==
      (state.budgets[second.bid.captainId] ?? 0)
        ? 'money'
        : 'draw';
  }
  return { ranked: keyed.map((entry) => entry.bid), tieBreak };
};

/** Bank time each captain spent on this lot, up to `at`. */
const bankUse = (state: MarketState, lot: MarketLot, at: number) => {
  if (state.config.bidding !== 'sealed' || state.config.timeBankMs <= 0) {
    return {};
  }
  const submitted = new Set(lot.bids.map((bid) => bid.captainId));
  const used: Record<string, number> = {};
  for (const captainId of eligibleFor(state, lot.groupIndex)) {
    if (submitted.has(captainId)) continue;
    const over = Math.max(0, at - lot.deadlineAt);
    const spent = Math.min(state.banks[captainId] ?? 0, over);
    if (spent > 0) used[captainId] = spent;
  }
  return used;
};

/** The events that settle a lot: sold to the best bid, or unsold. */
const resolveLot = (
  state: MarketState,
  at: number,
  random: () => number,
): EventDraft[] => {
  const lot = state.lot;
  if (!lot) return [];
  const bankUsed = bankUse(state, lot, at);
  // 0 means "no bid", except the nominator's opening bid.
  const valid = lot.bids.filter(
    (bid) => bid.amount > 0 || bid.captainId === lot.nominatorId,
  );
  if (valid.length === 0) {
    return [
      { type: 'lot_unsold', at, payload: { playerId: lot.playerId, bankUsed } },
    ];
  }
  if (state.config.bidding === 'open') {
    const best = valid[valid.length - 1] as MarketBid;
    return [
      {
        type: 'lot_sold',
        at,
        payload: {
          playerId: lot.playerId,
          groupIndex: lot.groupIndex,
          captainId: best.captainId,
          amount: best.amount,
          bids: [...valid]
            .reverse()
            .map(({ captainId, amount }) => ({ captainId, amount })),
          tieBreak: null,
          bankUsed,
        },
      },
    ];
  }
  const { ranked, tieBreak } = rankSealed(state, valid, random);
  const winner = ranked[0] as MarketBid;
  const second = ranked[1];
  const minimum = floorFor(state, winner.captainId, lot.groupIndex);
  const price =
    state.config.sealedPrice === 'own'
      ? winner.amount
      : Math.min(winner.amount, second ? second.amount + 1 : minimum);
  return [
    {
      type: 'lot_sold',
      at,
      payload: {
        playerId: lot.playerId,
        groupIndex: lot.groupIndex,
        captainId: winner.captainId,
        amount: Math.max(price, Math.min(minimum, winner.amount)),
        bids: ranked.map(({ captainId, amount }) => ({ captainId, amount })),
        tieBreak,
        bankUsed,
      },
    },
  ];
};

/** A captain's bid on the lot on the table. */
const marketBid = (
  state: MarketState,
  captainId: string,
  amount: number,
  now: number,
  random: () => number = Math.random,
): CommandResult => {
  const lot = state.lot;
  if (state.phase !== 'lot' || !lot) {
    return { error: 'La puja no está abierta ahora mismo.' };
  }
  if (!canTake(state, captainId, lot.groupIndex)) {
    return { error: 'No puedes llevarte a este jugador.' };
  }
  if (!Number.isInteger(amount) || amount < 0) {
    return { error: 'La puja tiene que ser un número entero.' };
  }
  const max = maxBidFor(state, captainId);
  if (amount > max) return { error: `Como mucho puedes pujar ${max}.` };
  if (state.config.bidding === 'open') {
    const high = lot.bids[lot.bids.length - 1];
    const floor = high
      ? high.amount + 1
      : Math.max(1, floorFor(state, captainId, lot.groupIndex));
    if (amount < floor) return { error: `La puja mínima ahora es ${floor}.` };
    if (high?.captainId === captainId) {
      return { error: 'Ya vas ganando este lote.' };
    }
    return {
      events: [
        {
          type: 'open_bid',
          at: now,
          payload: {
            captainId,
            amount,
            deadlineAt: Math.max(
              lot.deadlineAt,
              now + state.config.countdownMs,
            ),
          },
        },
      ],
    };
  }
  if (now > (state.deadlineAt ?? lot.deadlineAt)) {
    return { error: 'Se acabó el tiempo de este lote.' };
  }
  const floor = Math.max(1, floorFor(state, captainId, lot.groupIndex));
  const isNominator = lot.nominatorId === captainId;
  if (amount < floor && (isNominator || amount !== 0)) {
    return {
      error: isNominator
        ? `Como has nominado, tienes que pujar al menos ${floor}.`
        : `La puja mínima es ${floor} (o 0 para no pujar).`,
    };
  }
  const bankUsed =
    state.config.timeBankMs > 0 && now > lot.deadlineAt
      ? {
          [captainId]: Math.min(
            state.banks[captainId] ?? 0,
            now - lot.deadlineAt,
          ),
        }
      : {};
  const events: EventDraft[] = [
    { type: 'sealed_bid', at: now, payload: { captainId, amount, bankUsed } },
  ];
  // Everyone who can bid has: open the envelopes now.
  const submitted = new Set([
    ...lot.bids.map((bid) => bid.captainId),
    captainId,
  ]);
  const everyone = eligibleFor(state, lot.groupIndex).every((id) =>
    submitted.has(id),
  );
  if (everyone) {
    const after = foldPreview(state, captainId, amount, now);
    events.push(
      ...resolveLot(after, now, random).map((event) => ({
        ...event,
        payload: { ...event.payload, bankUsed: {} },
      })),
    );
  }
  return { events };
};

/** The state right after a sealed bid, to resolve in the same command. */
const foldPreview = (
  state: MarketState,
  captainId: string,
  amount: number,
  now: number,
): MarketState => {
  if (!state.lot) return state;
  const lot: MarketLot = {
    ...state.lot,
    bids: [
      ...state.lot.bids.filter((bid) => bid.captainId !== captainId),
      { captainId, amount, at: now },
    ],
  };
  return { ...state, lot };
};

/**
 * Timer resolution at `now`: the lot ends when its time (and the banks of
 * whoever hasn't bid) runs out. Missing sealed bids count as no bid.
 */
const settleMarket = (
  state: MarketState,
  now: number,
  random: () => number = Math.random,
): EventDraft[] => {
  if (
    state.phase !== 'lot' ||
    state.deadlineAt === null ||
    now < state.deadlineAt
  ) {
    return [];
  }
  return resolveLot(state, state.deadlineAt, random);
};

const pauseMarket = (state: MarketState, now: number): CommandResult => {
  if (state.phase === 'paused' || state.phase === 'closed') {
    return { error: 'La subasta no está en marcha.' };
  }
  return {
    events: [
      {
        type: 'paused',
        at: now,
        payload: {
          remainingMs:
            state.deadlineAt === null
              ? null
              : Math.max(0, state.deadlineAt - now),
          pausedAt: now,
        },
      },
    ],
  };
};

const resumeMarket = (
  state: MarketState,
  events: MarketEvent[],
  now: number,
): CommandResult => {
  if (state.phase !== 'paused')
    return { error: 'La subasta no está en pausa.' };
  const pausedAt = [...events]
    .reverse()
    .find((event) => event.type === 'paused' && event.undoneBySeq === null)?.at;
  return {
    events: [
      {
        type: 'resumed',
        at: now,
        payload: { shiftMs: pausedAt === undefined ? 0 : now - pausedAt },
      },
    ],
  };
};

const changeMarketConfig = (
  config: Partial<Pick<MarketConfig, 'lotTimeMs' | 'countdownMs' | 'reveal'>>,
  now: number,
): CommandResult => ({
  events: [{ type: 'market_config_changed', at: now, payload: { config } }],
});

/**
 * What a viewer may see: sealed bids stay sealed until the lot ends, and
 * the reveal option decides how much of each finished lot is shown.
 */
const publicMarket = (state: MarketState): MarketState => {
  const sealed = state.config.bidding === 'sealed';
  const hideAll = state.config.reveal === 'end' && state.phase !== 'closed';
  const showBids = state.config.reveal === 'all' || state.phase === 'closed';
  const lot = state.lot
    ? {
        ...state.lot,
        bids: sealed
          ? state.lot.bids.map((bid) => ({ ...bid, amount: -1 }))
          : state.lot.bids,
      }
    : null;
  const sale = (entry: MarketSale): MarketSale => ({
    ...entry,
    amount: hideAll ? -1 : entry.amount,
    bids: showBids ? entry.bids : [],
  });
  return {
    ...state,
    lot,
    budgets: hideAll
      ? Object.fromEntries(Object.keys(state.budgets).map((id) => [id, -1]))
      : state.budgets,
    sales: state.sales.map(sale),
    lastSale: state.lastSale ? sale(state.lastSale) : null,
  };
};

export {
  type BiddingMode,
  type BidReveal,
  type CommandResult as MarketCommandResult,
  canTake,
  changeMarketConfig,
  currentGroup,
  DEFAULT_MARKET_CONFIG,
  type DraftOrder,
  draftPick,
  type EventDraft as MarketEventDraft,
  eligibleFor,
  floorFor,
  foldMarket,
  freeSeats,
  type LotOrder,
  type MarketConfig,
  type MarketEvent,
  type MarketMode,
  type MarketPhase,
  type MarketSale,
  type MarketState,
  marketBid,
  marketNext,
  maxBidFor,
  minBidFor,
  nominate,
  pauseMarket,
  publicMarket,
  type Reserve,
  resumeMarket,
  type SealedPrice,
  settleMarket,
  startingBudgets,
  startMarketEvents,
  type TurnOrder,
  unsoldIn,
};
