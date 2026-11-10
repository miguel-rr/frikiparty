import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  changeMarketConfig,
  DEFAULT_MARKET_CONFIG,
  draftPick,
  eligibleFor,
  floorFor,
  foldMarket,
  type MarketCommandResult,
  type MarketConfig,
  type MarketEvent,
  type MarketEventDraft,
  type MarketState,
  marketBid,
  marketNext,
  maxBidFor,
  nominate,
  pauseMarket,
  publicMarket,
  resumeMarket,
  settleMarket,
  startingBudgets,
  startMarketEvents,
  unsoldIn,
} from './market-auction';
import {
  buildPotGroups,
  type GroupQuota,
  type PotLayout,
  type RingCount,
} from './pot-groups';

/**
 * Seeded simulation of the general auction and the free draft: thousands
 * of random rooms (layouts, options, captains with different habits) and,
 * after every event, the rules that must always hold. A failure prints its
 * seed; `SIM_SEED=<seed>` replays just that room and `SIM_RUNS=<n>` runs
 * more of them.
 */

const RUNS = Number(process.env.SIM_RUNS ?? 400);
const ONLY_SEED = process.env.SIM_SEED ? Number(process.env.SIM_SEED) : null;

const rng = (seed: number) => {
  // Spread small seeds, or their first draws all come out near 0.
  let x = (Math.imul(seed, 2654435761) >>> 0) % 2147483646 || 1;
  for (let i = 0; i < 10; i += 1) x = (x * 16807) % 2147483647;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
};

const pick = <T>(random: () => number, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)] as T;
const between = (random: () => number, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

type Habit = 'eager' | 'stingy' | 'passive' | 'random';

type Scenario = {
  seed: number;
  pots: string[][];
  quotas: GroupQuota[];
  captainIds: string[];
  teamSize: number;
  ranking: string[];
  config: MarketConfig;
  habits: Record<string, Habit>;
};

const LAYOUTS: PotLayout[] = [
  'ranking',
  'criterion_ranking',
  'criterion_market',
  'market',
];

const buildScenario = (seed: number): Scenario => {
  const random = rng(seed);
  const playerCount = between(random, 6, 24);
  const teamSize = between(random, 2, 5);
  const teamCount = Math.ceil(playerCount / teamSize);
  const order = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const rings: Record<string, RingCount> = Object.fromEntries(
    order.map((id) => [
      id,
      {
        rings: random() < 0.4 ? 0 : between(random, 1, 3),
        individualRings: random() < 0.7 ? 0 : 1,
      },
    ]),
  );
  const built = buildPotGroups({
    order,
    teamCount,
    teamSize,
    rings,
    layout: pick(random, LAYOUTS),
    criterion: pick(random, ['no_team_ring', 'no_ring'] as const),
    surplus: pick(random, [
      'best_out',
      'worst_out',
      'draw_out',
      'double',
    ] as const),
    shortage: pick(random, ['fill_worst', 'fill_best', 'leave_short'] as const),
    random,
  });
  const captainPotIndex = built.captainPotIndex ?? 0;
  const captainIds = built.pots[captainPotIndex] ?? [];
  // The engine expects the captains' pot first, as every layout builds it.
  assert.equal(captainPotIndex, 0);
  const budget = between(random, 10, 200);
  const config: MarketConfig = {
    ...DEFAULT_MARKET_CONFIG,
    mode: random() < 0.2 ? 'draft' : 'auction',
    draftOrder: pick(random, ['linear', 'snake'] as const),
    bidding: pick(random, ['open', 'sealed'] as const),
    sealedPrice: pick(random, ['own', 'second_plus_one'] as const),
    reveal: pick(random, ['all', 'winner', 'end'] as const),
    lotOrder: pick(random, ['random', 'nomination'] as const),
    turnOrder: pick(random, ['draw', 'ranking', 'inverse_ranking'] as const),
    budget,
    compensationPerPlace: random() < 0.5 ? 0 : between(random, 1, 10),
    minBids: built.pots.map(() =>
      random() < 0.3 ? 0 : between(random, 1, Math.max(1, budget / 4)),
    ),
    reserve: pick(random, ['none', 'one', 'minimum'] as const),
    lotTimeMs: between(random, 5, 60) * 1000,
    countdownMs: between(random, 3, 20) * 1000,
    timeBankMs: random() < 0.5 ? 0 : between(random, 5, 60) * 1000,
  };
  const habits: Record<string, Habit> = Object.fromEntries(
    captainIds.map((id) => [
      id,
      pick(random, ['eager', 'stingy', 'passive', 'random'] as const),
    ]),
  );
  return {
    seed,
    pots: built.pots,
    quotas: built.groups.map((group) => group.quota),
    captainIds,
    teamSize,
    ranking: order,
    config,
    habits,
  };
};

const quotaMax = (quota: GroupQuota, teamSize: number) =>
  quota === 'one' || quota === 'at_most_one'
    ? 1
    : quota === 'one_or_two'
      ? 2
      : teamSize;

/** The rules that hold after every event, whatever happened before. */
const checkInvariants = (
  scenario: Scenario,
  state: MarketState,
  start: Record<string, number>,
) => {
  const where = `seed ${scenario.seed}`;
  const captains = new Set(scenario.captainIds);
  const seen = new Set<string>();
  for (const captainId of scenario.captainIds) {
    const roster = state.rosters[captainId] ?? [];
    assert.ok(
      roster.length <= scenario.teamSize - 1,
      `${where}: ${captainId} has ${roster.length} players`,
    );
    for (const playerId of roster) {
      assert.ok(!captains.has(playerId), `${where}: captain ${playerId} sold`);
      assert.ok(!seen.has(playerId), `${where}: ${playerId} on two teams`);
      seen.add(playerId);
    }
    scenario.pots.forEach((pot, index) => {
      if (index === 0) return;
      const inGroup = roster.filter((id) => pot.includes(id)).length;
      const max = quotaMax(scenario.quotas[index] ?? 'one', scenario.teamSize);
      assert.ok(
        inGroup <= max,
        `${where}: ${captainId} took ${inGroup} of group ${index}`,
      );
    });
    const spent = state.sales
      .filter((sale) => sale.captainId === captainId)
      .reduce((sum, sale) => sum + sale.amount, 0);
    const budget = state.budgets[captainId] ?? 0;
    assert.ok(budget >= 0, `${where}: ${captainId} owes ${-budget}`);
    assert.equal(
      budget,
      (start[captainId] ?? 0) - spent,
      `${where}: ${captainId}'s money doesn't add up`,
    );
  }
  for (const sale of state.sales) {
    assert.ok(sale.amount >= 0, `${where}: negative price`);
    if (sale.kind === 'pick') assert.equal(sale.amount, 0);
    if (sale.kind === 'sold') {
      const own = sale.bids.find((bid) => bid.captainId === sale.captainId);
      assert.ok(own, `${where}: ${sale.playerId} sold without a bid`);
      assert.ok(
        sale.amount <= own.amount,
        `${where}: ${sale.playerId} cost ${sale.amount}, bid ${own.amount}`,
      );
    }
  }
  if (state.lot && state.config.bidding === 'sealed') {
    const shown = publicMarket(state).lot?.bids ?? [];
    assert.ok(
      shown.every((bid) => bid.amount === -1),
      `${where}: a sealed bid shows while the lot is open`,
    );
  }
};

/** At the end every team has what its quotas promise, as far as possible. */
const checkClosed = (scenario: Scenario, state: MarketState) => {
  const where = `seed ${scenario.seed}`;
  const assigned = new Set(Object.values(state.rosters).flat());
  const players = scenario.pots.slice(1).flat();
  const seats = scenario.captainIds.length * (scenario.teamSize - 1);
  assert.equal(
    assigned.size,
    Math.min(players.length, seats),
    `${where}: ${players.length - assigned.size} players left unsold`,
  );
  scenario.pots.forEach((pot, index) => {
    if (index === 0 || scenario.quotas[index] !== 'one') return;
    if (pot.length < scenario.captainIds.length) return;
    for (const captainId of scenario.captainIds) {
      const roster = state.rosters[captainId] ?? [];
      assert.equal(
        roster.filter((id) => pot.includes(id)).length,
        1,
        `${where}: ${captainId} has no player of group ${index}`,
      );
    }
  });
};

const bidFor = (
  habit: Habit,
  floor: number,
  max: number,
  random: () => number,
) => {
  if (max < floor) return 0;
  if (habit === 'passive') return 0;
  if (habit === 'stingy') return random() < 0.5 ? 0 : floor;
  if (habit === 'eager') return between(random, Math.max(floor, 1), max);
  return random() < 0.3 ? 0 : between(random, Math.max(floor, 1), max);
};

const play = (scenario: Scenario) => {
  const random = rng(scenario.seed * 7919);
  const log: MarketEvent[] = [];
  let clock = 1_000_000;
  const append = (drafts: MarketEventDraft[]) => {
    for (const draft of drafts) {
      log.push({
        seq: log.length + 1,
        type: draft.type,
        payload: draft.payload ?? {},
        at: draft.at ?? clock,
        undoneBySeq: null,
      });
    }
  };
  const start = startingBudgets(
    scenario.captainIds,
    scenario.ranking,
    scenario.config,
  );
  append(
    startMarketEvents({
      pots: scenario.pots,
      groups: scenario.quotas.map((quota, index) => ({
        kind: index === 0 ? 'captains' : 'ranking',
        quota,
      })),
      captainIds: scenario.captainIds,
      captainPotIndex: 0,
      teamSize: scenario.teamSize,
      ranking: scenario.ranking,
      config: scenario.config,
      now: clock,
      random,
    }),
  );
  const run = (label: string, result: MarketCommandResult) => {
    if ('error' in result) {
      assert.fail(`seed ${scenario.seed}: ${label} refused: ${result.error}`);
    }
    append(result.events);
  };

  for (let step = 0; step < 5_000; step += 1) {
    const state = foldMarket(log);
    checkInvariants(scenario, state, start);
    if (state.phase === 'closed') {
      checkClosed(scenario, state);
      return log;
    }
    // Now and then the organiser pauses, or retimes the lots.
    if (state.phase !== 'paused' && random() < 0.03) {
      run('pause', pauseMarket(state, clock));
      continue;
    }
    if (state.phase === 'paused') {
      clock += between(random, 1, 120) * 1000;
      run('resume', resumeMarket(state, log, clock));
      continue;
    }
    if (random() < 0.01) {
      run(
        'retime',
        changeMarketConfig(
          {
            lotTimeMs: between(random, 5, 60) * 1000,
            countdownMs: between(random, 3, 20) * 1000,
          },
          clock,
        ),
      );
      continue;
    }
    clock += between(random, 0, 3) * 1000;
    if (state.phase === 'idle') {
      run('next', marketNext(state, clock, random));
      continue;
    }
    const group = state.walk[state.walkCursor] ?? 0;
    if (state.phase === 'nominating') {
      const captainId = state.nominatorId ?? '';
      const player = pick(random, unsoldIn(state, group));
      if (state.config.mode === 'draft') {
        run('pick', draftPick(state, captainId, player, clock));
      } else {
        const floor = floorFor(state, captainId, group);
        const max = maxBidFor(state, captainId);
        run(
          'nominate',
          nominate(
            state,
            captainId,
            player,
            between(random, floor, max),
            clock,
          ),
        );
      }
      continue;
    }
    const lot = state.lot;
    assert.ok(lot, `seed ${scenario.seed}: lot phase without a lot`);
    if (state.config.bidding === 'sealed') {
      const waiting = eligibleFor(state, lot.groupIndex).filter(
        (id) => !lot.bids.some((bid) => bid.captainId === id),
      );
      const captainId = waiting.length > 0 ? pick(random, waiting) : null;
      const habit = captainId ? scenario.habits[captainId] : 'passive';
      const expired = clock > (state.deadlineAt ?? clock);
      // Passive captains let the clock (and their bank) run out.
      if (!captainId || expired || (habit === 'passive' && random() < 0.7)) {
        clock = Math.max(clock, (state.deadlineAt ?? clock) + 1);
        append(settleMarket(state, clock, random));
        continue;
      }
      // Some bids land in the bank time, after the lot's own time.
      const late =
        state.config.timeBankMs > 0 && random() < 0.2
          ? lot.deadlineAt + between(random, 0, state.config.timeBankMs)
          : clock;
      const at = Math.min(late, state.deadlineAt ?? late);
      clock = Math.max(clock, at);
      const floor = Math.max(1, floorFor(state, captainId, lot.groupIndex));
      const max = maxBidFor(state, captainId);
      let amount = bidFor(habit ?? 'random', floor, max, random);
      if (captainId === lot.nominatorId && amount < floor) amount = floor;
      if (amount > max) amount = 0;
      run('sealed bid', marketBid(state, captainId, amount, clock, random));
      continue;
    }
    // Open: someone may raise, otherwise the countdown ends the lot.
    const high = lot.bids[lot.bids.length - 1];
    const raisers = eligibleFor(state, lot.groupIndex).filter((id) => {
      if (high?.captainId === id) return false;
      const floor = high
        ? high.amount + 1
        : Math.max(1, floorFor(state, id, lot.groupIndex));
      return floor <= maxBidFor(state, id) && scenario.habits[id] !== 'passive';
    });
    if (raisers.length > 0 && random() < 0.6) {
      const captainId = pick(random, raisers);
      const floor = high
        ? high.amount + 1
        : Math.max(1, floorFor(state, captainId, lot.groupIndex));
      const step = pick(random, [0, 0, 4, 9]);
      const amount = Math.min(maxBidFor(state, captainId), floor + step);
      run('open bid', marketBid(state, captainId, amount, clock, random));
      continue;
    }
    clock = Math.max(clock, (state.deadlineAt ?? clock) + 1);
    append(settleMarket(state, clock, random));
  }
  assert.fail(`seed ${scenario.seed}: the room never closed`);
};

const seeds =
  ONLY_SEED !== null
    ? [ONLY_SEED]
    : Array.from({ length: RUNS }, (_, i) => i + 1);

describe('market simulation', () => {
  it(`keeps every rule in ${seeds.length} random rooms`, () => {
    const modes = new Set<string>();
    for (const seed of seeds) {
      const scenario = buildScenario(seed);
      play(scenario);
      const { config } = scenario;
      modes.add(
        config.mode === 'draft'
          ? `draft/${config.draftOrder}`
          : `${config.bidding}/${config.lotOrder}`,
      );
    }
    // The seeds must reach every kind of room, or the run proves little.
    if (ONLY_SEED === null) assert.equal(modes.size, 6, [...modes].join(' '));
  });
});
