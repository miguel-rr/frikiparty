import { shuffle } from '@/lib/tournament/ranking';

/**
 * The live auction, event-sourced: the state below is never mutated by
 * hand — it is `foldAuction(events)`, and every command only proposes the
 * events that would follow. Undo marks events as undone; the fold skips
 * them (live plan §3.2, §6.3).
 *
 * Pot walk: the best auctioned pot first (the one right after the
 * captains'), one lot at a time in a random order. A lot opens with an
 * initial timer; the first bid starts the lockout + countdown cycle; the
 * countdown expiring sells. A lot nobody bids on is "unsold" and waits
 * for the organiser to move on; when a pot's queue runs dry its unsold
 * players go round again, and a round with no sale at all ends in a
 * raffle. A lone unsold player with a lone captain still needing one is
 * assigned outright. Every player reaches a team paying the pot's minimum
 * or whatever the captain has left.
 */

type AuctionConfig = {
  initialTimerMs: number;
  countdownMs: number;
  countdownShortMs: number;
  countdownShortAfterBids: number;
  lockoutMs: number;
};

type AuctionPhase =
  | 'idle' // between lots: the organiser confirms the next one
  | 'lot_open' // initial timer running, no bid yet
  | 'lockout' // a bid just landed; controls disabled briefly
  | 'countdown' // bidding open, clock running
  | 'unsold_wait' // initial timer expired unbid; organiser confirms skipping
  | 'raffle_wait' // a full round without a sale; organiser draws lots
  | 'paused'
  | 'closed';

type Sale = {
  playerId: string;
  potIndex: number;
  captainId: string;
  amount: number;
  kind: 'sold' | 'auto' | 'raffle';
  at: number;
  seq: number;
};

type AuctionLiveState = {
  config: AuctionConfig;
  pots: string[][];
  captainIds: string[];
  captainPotIndex: number;
  minBidByPot: number[];
  budget: number;
  budgets: Record<string, number>;
  rosters: Record<string, string[]>;
  /** Auctioned pots, best first. */
  potWalk: number[];
  potCursor: number;
  round: number;
  /** Players still to be called in the current pot's current round. */
  queue: string[];
  /** Players called this round and left unsold (for the next round). */
  unsoldThisRound: string[];
  salesThisRound: number;
  currentLot: {
    playerId: string;
    potIndex: number;
    bidCount: number;
    highBid: { captainId: string; amount: number } | null;
  } | null;
  phase: AuctionPhase;
  /** The phase to return to after a pause. */
  pausedPhase: AuctionPhase | null;
  deadlineAt: number | null;
  pausedRemainingMs: number | null;
  sales: Sale[];
  lastSale: Sale | null;
  /** The raffle's pairings, kept for the reveal. */
  lastRaffle: { captainId: string; playerId: string }[] | null;
  startedAt: number | null;
  closedAt: number | null;
  /** Seq of the last event folded in. */
  lastSeq: number;
};

type AuctionEvent = {
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

const DEFAULT_AUCTION_CONFIG: AuctionConfig = {
  initialTimerMs: 30_000,
  countdownMs: 20_000,
  countdownShortMs: 15_000,
  countdownShortAfterBids: 6,
  lockoutMs: 1_500,
};

/**
 * Minimum price per pot: the worst auctioned pot costs 50, the next one
 * up 100, and so on; the captains' pot is never auctioned (0).
 */
const computeMinBids = (pots: string[][], captainPotIndex: number) => {
  const auctioned = pots
    .map((_, index) => index)
    .filter((index) => index !== captainPotIndex);
  const minBids = new Array<number>(pots.length).fill(0);
  auctioned.forEach((potIndex, position) => {
    minBids[potIndex] = 50 * (auctioned.length - position);
  });
  return { minBids, potWalk: auctioned };
};

/** The events that open an auction, given its configuration. */
const startAuctionEvents = (input: {
  pots: string[][];
  captainIds: string[];
  captainPotIndex: number;
  config: AuctionConfig;
  now: number;
}): EventDraft[] => {
  const { minBids, potWalk } = computeMinBids(
    input.pots,
    input.captainPotIndex,
  );
  const budget = 2 * minBids.reduce((total, price) => total + price, 0);
  return [
    {
      type: 'auction_started',
      at: input.now,
      payload: {
        pots: input.pots,
        captainIds: input.captainIds,
        captainPotIndex: input.captainPotIndex,
        config: input.config,
        minBidByPot: minBids,
        budget,
        potWalk,
      },
    },
    ...(potWalk[0] !== undefined
      ? [potRoundEvent(input.pots, potWalk[0], 1, input.now)]
      : []),
  ];
};

const potRoundEvent = (
  pots: string[][],
  potIndex: number,
  round: number,
  now: number,
  players?: string[],
): EventDraft => ({
  type: 'pot_round_started',
  at: now,
  payload: {
    potIndex,
    round,
    queue: shuffle(players ?? pots[potIndex] ?? []),
  },
});

const emptyState = (): AuctionLiveState => ({
  config: DEFAULT_AUCTION_CONFIG,
  pots: [],
  captainIds: [],
  captainPotIndex: 0,
  minBidByPot: [],
  budget: 0,
  budgets: {},
  rosters: {},
  potWalk: [],
  potCursor: 0,
  round: 0,
  queue: [],
  unsoldThisRound: [],
  salesThisRound: 0,
  currentLot: null,
  phase: 'idle',
  pausedPhase: null,
  deadlineAt: null,
  pausedRemainingMs: null,
  sales: [],
  lastSale: null,
  lastRaffle: null,
  startedAt: null,
  closedAt: null,
  lastSeq: 0,
});

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const strList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

/** Captains still without a player from `potIndex`. */
const captainsNeeding = (state: AuctionLiveState, potIndex: number) => {
  const potPlayers = new Set(state.pots[potIndex] ?? []);
  return state.captainIds.filter(
    (captainId) =>
      !(state.rosters[captainId] ?? []).some((id) => potPlayers.has(id)),
  );
};

/**
 * The next valid bid. Zero when nobody who still needs a player from this
 * pot can afford the minimum: then the broke captains bid freely
 * (core-logic's last rule).
 */
const minNextBid = (state: AuctionLiveState) => {
  const lot = state.currentLot;
  if (!lot) return 0;
  if (lot.highBid) return lot.highBid.amount + 1;
  const minimum = state.minBidByPot[lot.potIndex] ?? 0;
  const needing = captainsNeeding(state, lot.potIndex);
  const anyoneCanAfford = needing.some(
    (captainId) => (state.budgets[captainId] ?? 0) >= minimum,
  );
  return anyoneCanAfford ? minimum : 0;
};

/** Captains allowed to bid on the current lot right now. */
const eligibleBidders = (state: AuctionLiveState) => {
  const lot = state.currentLot;
  if (!lot) return [];
  const floor = minNextBid(state);
  return captainsNeeding(state, lot.potIndex).filter(
    (captainId) => (state.budgets[captainId] ?? 0) >= floor,
  );
};

const countdownFor = (state: AuctionLiveState, bidCount: number) =>
  bidCount >= state.config.countdownShortAfterBids
    ? state.config.countdownShortMs
    : state.config.countdownMs;

const charge = (
  state: AuctionLiveState,
  captainId: string,
  playerId: string,
  amount: number,
) => {
  const paid = Math.min(state.budgets[captainId] ?? 0, amount);
  state.budgets[captainId] = (state.budgets[captainId] ?? 0) - paid;
  state.rosters[captainId] = [...(state.rosters[captainId] ?? []), playerId];
  return paid;
};

/** Rebuilds the state from the log; undone events are skipped. */
const foldAuction = (events: AuctionEvent[]): AuctionLiveState => {
  const state = emptyState();
  for (const event of events) {
    state.lastSeq = event.seq;
    if (event.undoneBySeq !== null) continue;
    const p = event.payload;
    switch (event.type) {
      case 'auction_started': {
        state.pots = (p.pots as string[][]) ?? [];
        state.captainIds = strList(p.captainIds);
        state.captainPotIndex = num(p.captainPotIndex);
        state.config = {
          ...DEFAULT_AUCTION_CONFIG,
          ...(p.config as AuctionConfig),
        };
        state.minBidByPot = (p.minBidByPot as number[]) ?? [];
        state.budget = num(p.budget);
        state.potWalk = (p.potWalk as number[]) ?? [];
        state.potCursor = 0;
        state.budgets = Object.fromEntries(
          state.captainIds.map((id) => [id, state.budget]),
        );
        state.rosters = Object.fromEntries(
          state.captainIds.map((id) => [id, [] as string[]]),
        );
        state.startedAt = event.at;
        state.phase = 'idle';
        break;
      }
      case 'auction_config_changed': {
        state.config = { ...state.config, ...(p.config as AuctionConfig) };
        break;
      }
      case 'pot_round_started': {
        const potIndex = num(p.potIndex);
        state.potCursor = Math.max(0, state.potWalk.indexOf(potIndex));
        state.round = num(p.round, 1);
        state.queue = strList(p.queue);
        state.unsoldThisRound = [];
        state.salesThisRound = 0;
        state.currentLot = null;
        state.phase = 'idle';
        state.deadlineAt = null;
        break;
      }
      case 'lot_opened': {
        const playerId = str(p.playerId);
        state.queue = state.queue.filter((id) => id !== playerId);
        state.currentLot = {
          playerId,
          potIndex: num(p.potIndex),
          bidCount: 0,
          highBid: null,
        };
        state.phase = 'lot_open';
        state.deadlineAt = num(p.deadlineAt);
        state.lastSale = null;
        state.lastRaffle = null;
        break;
      }
      case 'bid_placed': {
        if (!state.currentLot) break;
        state.currentLot.bidCount += 1;
        state.currentLot.highBid = {
          captainId: str(p.captainId),
          amount: num(p.amount),
        };
        state.phase = 'lockout';
        state.deadlineAt = num(p.lockoutUntil);
        break;
      }
      case 'lockout_ended': {
        state.phase = 'countdown';
        state.deadlineAt = num(p.countdownUntil);
        break;
      }
      case 'lot_sold':
      case 'lot_auto_assigned': {
        const playerId = str(p.playerId);
        const captainId = str(p.captainId);
        const potIndex = num(p.potIndex);
        const paid = charge(state, captainId, playerId, num(p.amount));
        const sale: Sale = {
          playerId,
          potIndex,
          captainId,
          amount: paid,
          kind: event.type === 'lot_sold' ? 'sold' : 'auto',
          at: event.at,
          seq: event.seq,
        };
        state.sales.push(sale);
        state.lastSale = sale;
        state.salesThisRound += 1;
        state.queue = state.queue.filter((id) => id !== playerId);
        state.currentLot = null;
        state.phase = 'idle';
        state.deadlineAt = null;
        break;
      }
      case 'lot_unsold': {
        state.phase = 'unsold_wait';
        state.deadlineAt = null;
        break;
      }
      case 'lot_skipped_confirmed': {
        if (state.currentLot) {
          state.unsoldThisRound.push(state.currentLot.playerId);
        }
        state.currentLot = null;
        state.phase = 'idle';
        break;
      }
      case 'raffle_started': {
        state.phase = 'raffle_wait';
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
        const potIndex = num(p.potIndex);
        state.lastRaffle = assignments.map(({ captainId, playerId }) => ({
          captainId,
          playerId,
        }));
        for (const assignment of assignments) {
          const paid = charge(
            state,
            assignment.captainId,
            assignment.playerId,
            assignment.amount,
          );
          const sale: Sale = {
            playerId: assignment.playerId,
            potIndex,
            captainId: assignment.captainId,
            amount: paid,
            kind: 'raffle',
            at: event.at,
            seq: event.seq,
          };
          state.sales.push(sale);
          state.lastSale = sale;
        }
        state.unsoldThisRound = [];
        state.queue = [];
        state.currentLot = null;
        state.phase = 'idle';
        break;
      }
      case 'paused': {
        state.pausedPhase = state.phase;
        state.pausedRemainingMs = num(p.remainingMs);
        state.phase = 'paused';
        state.deadlineAt = null;
        break;
      }
      case 'resumed': {
        state.phase = state.pausedPhase ?? 'idle';
        state.pausedPhase = null;
        state.deadlineAt = p.deadlineAt === null ? null : num(p.deadlineAt);
        state.pausedRemainingMs = null;
        break;
      }
      case 'undo': {
        // The undone events are already skipped; this reopens the lot fresh.
        if (state.currentLot) {
          state.currentLot.bidCount = 0;
          state.currentLot.highBid = null;
          state.phase = 'lot_open';
          state.deadlineAt = num(p.deadlineAt);
          state.lastSale = null;
        }
        break;
      }
      case 'auction_closed': {
        state.phase = 'closed';
        state.closedAt = event.at;
        state.deadlineAt = null;
        break;
      }
      default:
        break;
    }
  }
  return state;
};

/** Whether the current pot still has anyone unsold anywhere. */
const unsoldInPot = (state: AuctionLiveState, potIndex: number) => {
  const assigned = new Set(Object.values(state.rosters).flat());
  return (state.pots[potIndex] ?? []).filter((id) => !assigned.has(id));
};

const isDone = (state: AuctionLiveState) =>
  state.potWalk.every(
    (potIndex) =>
      unsoldInPot(state, potIndex).length === 0 ||
      captainsNeeding(state, potIndex).length === 0,
  );

/**
 * What follows once a lot is settled and the organiser asks for the next
 * one: the next queued player, a new round for the pot's leftovers, an
 * outright assignment, a raffle, the next pot, or the end.
 */
const advance = (state: AuctionLiveState, now: number): CommandResult => {
  const potIndex = state.potWalk[state.potCursor];
  if (potIndex === undefined) {
    return {
      events: [
        {
          type: 'auction_closed',
          at: now,
          payload: { rosters: state.rosters },
        },
      ],
    };
  }
  const needing = captainsNeeding(state, potIndex);
  const unsold = unsoldInPot(state, potIndex);
  if (unsold.length === 0 || needing.length === 0) {
    return nextPot(state, now);
  }
  // A lone leftover with a lone captain in need is theirs outright.
  if (unsold.length === 1 && needing.length === 1) {
    const playerId = unsold[0] ?? '';
    const captainId = needing[0] ?? '';
    return {
      events: [
        {
          type: 'lot_auto_assigned',
          at: now,
          payload: {
            playerId,
            captainId,
            potIndex,
            amount: state.minBidByPot[potIndex] ?? 0,
          },
        },
      ],
    };
  }
  if (state.queue.length > 0) {
    const playerId = state.queue[0] ?? '';
    return {
      events: [
        {
          type: 'lot_opened',
          at: now,
          payload: {
            playerId,
            potIndex,
            round: state.round,
            deadlineAt: now + state.config.initialTimerMs,
          },
        },
      ],
    };
  }
  // Queue exhausted with players left: another round, or a raffle when the
  // whole round passed without a single sale.
  if (state.salesThisRound === 0 && state.round > 0) {
    return {
      events: [
        {
          type: 'raffle_started',
          at: now,
          payload: { potIndex, players: unsold, captains: needing },
        },
      ],
    };
  }
  return {
    events: [potRoundEvent(state.pots, potIndex, state.round + 1, now, unsold)],
  };
};

const nextPot = (state: AuctionLiveState, now: number): CommandResult => {
  const nextIndex = state.potWalk[state.potCursor + 1];
  if (nextIndex === undefined) {
    return {
      events: [
        {
          type: 'auction_closed',
          at: now,
          payload: { rosters: state.rosters },
        },
      ],
    };
  }
  return { events: [potRoundEvent(state.pots, nextIndex, 1, now)] };
};

/** Organiser: open the next lot (or whatever follows). */
const confirmNext = (state: AuctionLiveState, now: number): CommandResult => {
  if (state.phase !== 'idle')
    return { error: 'Ahora mismo no toca abrir un lote.' };
  if (state.potWalk.length === 0 || isDone(state)) {
    return {
      events: [
        {
          type: 'auction_closed',
          at: now,
          payload: { rosters: state.rosters },
        },
      ],
    };
  }
  return advance(state, now);
};

/** Organiser: acknowledge an unsold lot and move on. */
const confirmSkip = (state: AuctionLiveState, now: number): CommandResult => {
  if (state.phase !== 'unsold_wait' || !state.currentLot) {
    return { error: 'No hay ningún lote desierto que pasar.' };
  }
  return {
    events: [
      {
        type: 'lot_skipped_confirmed',
        at: now,
        payload: { playerId: state.currentLot.playerId },
      },
    ],
  };
};

/** Organiser: draw the raffle for a pot nobody bid on. */
const runRaffle = (state: AuctionLiveState, now: number): CommandResult => {
  if (state.phase !== 'raffle_wait')
    return { error: 'No hay sorteo pendiente.' };
  const potIndex = state.potWalk[state.potCursor];
  if (potIndex === undefined) return { error: 'No hay bombo en curso.' };
  const players = shuffle(unsoldInPot(state, potIndex));
  const captains = shuffle(captainsNeeding(state, potIndex));
  const amount = state.minBidByPot[potIndex] ?? 0;
  const assignments = players
    .map((playerId, index) => ({
      playerId,
      captainId: captains[index],
      amount,
    }))
    .filter(
      (a): a is { playerId: string; captainId: string; amount: number } =>
        a.captainId !== undefined,
    );
  return {
    events: [
      { type: 'raffle_assigned', at: now, payload: { potIndex, assignments } },
    ],
  };
};

/** A captain's bid. */
const placeBid = (
  state: AuctionLiveState,
  captainId: string,
  amount: number,
  now: number,
): CommandResult => {
  if (state.phase !== 'lot_open' && state.phase !== 'countdown') {
    return { error: 'La puja no está abierta ahora mismo.' };
  }
  if (!eligibleBidders(state).includes(captainId)) {
    return { error: 'No puedes pujar por este jugador.' };
  }
  const floor = minNextBid(state);
  if (amount < floor)
    return { error: `La puja mínima ahora mismo es ${floor}.` };
  if (amount > (state.budgets[captainId] ?? 0)) {
    return { error: 'No te queda tanto oro.' };
  }
  return {
    events: [
      {
        type: 'bid_placed',
        at: now,
        payload: {
          captainId,
          amount,
          lockoutUntil: now + state.config.lockoutMs,
        },
      },
    ],
  };
};

/**
 * Timer resolution: the events due at `now`, if the deadline has passed.
 * Their `at` is the deadline itself so replays keep the real pacing.
 */
const settle = (state: AuctionLiveState, now: number): EventDraft[] => {
  if (state.deadlineAt === null || now < state.deadlineAt) return [];
  const at = state.deadlineAt;
  const lot = state.currentLot;
  if (!lot) return [];
  if (state.phase === 'lot_open') {
    return [{ type: 'lot_unsold', at, payload: { playerId: lot.playerId } }];
  }
  if (state.phase === 'lockout') {
    return [
      {
        type: 'lockout_ended',
        at,
        payload: { countdownUntil: at + countdownFor(state, lot.bidCount) },
      },
    ];
  }
  if (state.phase === 'countdown' && lot.highBid) {
    return [
      {
        type: 'lot_sold',
        at,
        payload: {
          playerId: lot.playerId,
          potIndex: lot.potIndex,
          captainId: lot.highBid.captainId,
          amount: lot.highBid.amount,
        },
      },
    ];
  }
  return [];
};

const pause = (state: AuctionLiveState, now: number): CommandResult => {
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
        },
      },
    ],
  };
};

const resume = (state: AuctionLiveState, now: number): CommandResult => {
  if (state.phase !== 'paused')
    return { error: 'La subasta no está en pausa.' };
  return {
    events: [
      {
        type: 'resumed',
        at: now,
        payload: {
          deadlineAt:
            state.pausedRemainingMs === null
              ? null
              : now + state.pausedRemainingMs,
        },
      },
    ],
  };
};

/**
 * Organiser's undo: the current lot goes back to its opening (bids and
 * sale forgotten). Allowed while the lot is on the table or right after
 * its sale, before the next one is confirmed. Returns the seqs to mark as
 * undone plus the `undo` event.
 */
const undoLot = (
  events: AuctionEvent[],
  state: AuctionLiveState,
  now: number,
): { undoneSeqs: number[]; event: EventDraft } | { error: string } => {
  const live = events.filter((e) => e.undoneBySeq === null);
  const lastOpen = [...live].reverse().find((e) => e.type === 'lot_opened');
  if (!lastOpen) return { error: 'No hay ningún lote que deshacer.' };
  const after = live.filter((e) => e.seq > lastOpen.seq);
  const blocking = after.find((e) =>
    [
      'pot_round_started',
      'lot_opened',
      'raffle_assigned',
      'auction_closed',
      'lot_skipped_confirmed',
    ].includes(e.type),
  );
  if (blocking || state.phase === 'paused') {
    return {
      error:
        'Sólo se puede deshacer el último lote antes de abrir el siguiente.',
    };
  }
  return {
    undoneSeqs: after.map((e) => e.seq),
    event: {
      type: 'undo',
      at: now,
      payload: {
        lotSeq: lastOpen.seq,
        deadlineAt: now + state.config.initialTimerMs,
      },
    },
  };
};

const changeConfig = (
  config: Partial<AuctionConfig>,
  now: number,
): CommandResult => ({
  events: [{ type: 'auction_config_changed', at: now, payload: { config } }],
});

export {
  type AuctionConfig,
  type AuctionEvent,
  type AuctionLiveState,
  type AuctionPhase,
  type CommandResult,
  captainsNeeding,
  changeConfig,
  confirmNext,
  confirmSkip,
  countdownFor,
  DEFAULT_AUCTION_CONFIG,
  type EventDraft,
  eligibleBidders,
  foldAuction,
  minNextBid,
  pause,
  placeBid,
  resume,
  runRaffle,
  type Sale,
  settle,
  startAuctionEvents,
  undoLot,
  unsoldInPot,
};
