import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  type AuctionEvent,
  type AuctionLiveState,
  type CommandResult,
  changeConfig,
  confirmNext,
  confirmSkip,
  DEFAULT_AUCTION_CONFIG,
  type EventDraft,
  eligibleBidders,
  foldAuction,
  minNextBid,
  pause,
  placeBid,
  resume,
  runRaffle,
  settle,
  startAuctionEvents,
  undoLot,
} from './auction-live';
import {
  closeDraft,
  type DraftEvent,
  foldDraft,
  isDraftComplete,
  optionsFor,
  pauseDraft,
  pickPlayer,
  resumeDraft,
  startDraftEvents,
  undoPick,
} from './draft-live';
import { generatePots } from './pots';

/**
 * Seeded simulations of the pot auction and the classic draft (the
 * formations from September): random rooms played to the end, checking
 * after every event the rules that must always hold. Both engines draw
 * with Math.random, so the run swaps in a seeded one. A failure prints its
 * seed; `SIM_SEED=<seed>` replays it and `SIM_RUNS=<n>` runs more.
 */

const RUNS = Number(process.env.SIM_RUNS ?? 300);
const ONLY_SEED = process.env.SIM_SEED ? Number(process.env.SIM_SEED) : null;
const seeds =
  ONLY_SEED !== null
    ? [ONLY_SEED]
    : Array.from({ length: RUNS }, (_, i) => i + 1);

const rng = (seed: number) => {
  // Spread small seeds, or their first draws all come out near 0.
  let x = (Math.imul(seed, 2654435761) >>> 0) % 2147483646 || 1;
  for (let i = 0; i < 10; i += 1) x = (x * 16807) % 2147483647;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
};

const realRandom = Math.random;
let random = rng(1);
before(() => {
  Math.random = () => random();
});
after(() => {
  Math.random = realRandom;
});

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(random() * items.length)] as T;
const between = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

/** Captains and the pots under them, the classic way: chunks of the ranking. */
const layout = (seed: number) => {
  random = rng(seed);
  const teamSize = between(2, 5);
  const teamCount = between(2, 6);
  // Sometimes a player or two short, so the last pot is short.
  const playerCount = teamSize * teamCount - between(0, teamCount - 1);
  const ranking = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const { pots } = generatePots(ranking, teamSize);
  return { pots, captainIds: pots[0] ?? [], ranking };
};

/** Each captain takes at most one per pot, and nobody is on two teams. */
const checkRosters = (
  where: string,
  pots: string[][],
  rosters: Record<string, string[]>,
) => {
  const seen = new Set<string>();
  for (const [captainId, roster] of Object.entries(rosters)) {
    for (const playerId of roster) {
      assert.ok(!seen.has(playerId), `${where}: ${playerId} on two teams`);
      seen.add(playerId);
    }
    pots.forEach((pot, index) => {
      if (index === 0) return;
      const count = roster.filter((id) => pot.includes(id)).length;
      assert.ok(
        count <= 1,
        `${where}: ${captainId} has ${count} of pot ${index}`,
      );
    });
  }
  return seen;
};

/** At the end, every pot is fully dealt, one per captain as far as it goes. */
const checkComplete = (
  where: string,
  pots: string[][],
  rosters: Record<string, string[]>,
) => {
  const assigned = checkRosters(where, pots, rosters);
  for (const playerId of pots.slice(1).flat()) {
    assert.ok(assigned.has(playerId), `${where}: ${playerId} left out`);
  }
};

describe('pot auction simulation', () => {
  const play = (seed: number) => {
    const where = `seed ${seed}`;
    const { pots, captainIds } = layout(seed);
    const log: AuctionEvent[] = [];
    let clock = 1_000_000;
    const append = (drafts: EventDraft[]) => {
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
    const run = (label: string, result: CommandResult) => {
      if ('error' in result) assert.fail(`${where}: ${label}: ${result.error}`);
      append(result.events);
    };
    append(
      startAuctionEvents({
        pots,
        captainIds,
        captainPotIndex: 0,
        config: DEFAULT_AUCTION_CONFIG,
        now: clock,
      }),
    );
    const start = foldAuction(log).budget;
    // Money and rosters as they were when the current lot opened.
    let atOpening: Pick<AuctionLiveState, 'budgets' | 'rosters'> | null = null;
    let undos = 0;

    for (let step = 0; step < 5_000; step += 1) {
      const state = foldAuction(log);
      checkRosters(where, pots, state.rosters);
      for (const captainId of captainIds) {
        const spent = state.sales
          .filter((sale) => sale.captainId === captainId)
          .reduce((sum, sale) => sum + sale.amount, 0);
        const left = state.budgets[captainId] ?? 0;
        assert.ok(left >= 0, `${where}: ${captainId} owes ${-left}`);
        assert.equal(left, start - spent, `${where}: money doesn't add up`);
      }
      if (state.phase === 'closed') {
        checkComplete(where, pots, state.rosters);
        return undos;
      }
      if (state.phase === 'paused') {
        clock += between(1, 60) * 1000;
        run('resume', resume(state, clock));
        continue;
      }
      if (random() < 0.02) {
        run('pause', pause(state, clock));
        continue;
      }
      if (random() < 0.01) {
        run(
          'retime',
          changeConfig({ countdownMs: between(5, 20) * 1000 }, clock),
        );
        continue;
      }
      // The organiser undoes a lot now and then: everything since it
      // opened is forgotten.
      if (atOpening && random() < 0.05) {
        const undo = undoLot(log, state, clock);
        if (!('error' in undo)) {
          for (const entry of log) {
            if (undo.undoneSeqs.includes(entry.seq)) entry.undoneBySeq = -1;
          }
          append([undo.event]);
          const undone = foldAuction(log);
          assert.deepEqual(undone.budgets, atOpening.budgets, where);
          assert.deepEqual(undone.rosters, atOpening.rosters, where);
          assert.equal(undone.phase, 'lot_open', where);
          undos += 1;
          continue;
        }
      }
      if (state.phase === 'idle') {
        run('next', confirmNext(state, clock));
        const opened = foldAuction(log);
        atOpening =
          opened.phase === 'lot_open'
            ? {
                budgets: structuredClone(opened.budgets),
                rosters: structuredClone(opened.rosters),
              }
            : null;
        continue;
      }
      if (state.phase === 'unsold_wait') {
        run('skip', confirmSkip(state, clock));
        continue;
      }
      if (state.phase === 'raffle_wait') {
        run('raffle', runRaffle(state, clock));
        continue;
      }
      if (state.phase === 'lot_open' || state.phase === 'countdown') {
        const bidders = eligibleBidders(state).filter(
          (id) => id !== state.currentLot?.highBid?.captainId,
        );
        if (bidders.length > 0 && random() < 0.55) {
          const captainId = pick(bidders);
          const floor = minNextBid(state);
          const purse = state.budgets[captainId] ?? 0;
          if (floor <= purse) {
            const amount = Math.min(purse, floor + pick([0, 0, 4, 9]));
            run('bid', placeBid(state, captainId, amount, clock));
            continue;
          }
        }
      }
      clock = Math.max(clock, state.deadlineAt ?? clock);
      const due = settle(state, clock);
      assert.ok(due.length > 0, `${where}: stuck in ${state.phase}`);
      append(due);
    }
    assert.fail(`${where}: the auction never closed`);
  };

  it(`deals every pot in ${seeds.length} random auctions`, () => {
    let undos = 0;
    for (const seed of seeds) undos += play(seed);
    if (ONLY_SEED === null) assert.ok(undos > 0, 'no undo was exercised');
  });
});

describe('classic draft simulation', () => {
  const play = (seed: number) => {
    const where = `seed ${seed}`;
    const { pots, captainIds, ranking } = layout(seed);
    const log: DraftEvent[] = [];
    let clock = 1_000_000;
    const append = (drafts: EventDraft[]) => {
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
    const run = (label: string, result: CommandResult) => {
      if ('error' in result) assert.fail(`${where}: ${label}: ${result.error}`);
      append(result.events);
    };
    const method = pick(['snake', 'linear'] as const);
    append(
      startDraftEvents({
        pots,
        captainIds,
        captainPotIndex: 0,
        ranking,
        captainOrderMethod: pick([
          'ranking',
          'inverse-ranking',
          'fixed-random',
          'full-random',
        ] as const),
        method,
        now: clock,
      }),
    );

    for (let step = 0; step < 2_000; step += 1) {
      clock += 1000;
      const state = foldDraft(log);
      const rosters = Object.fromEntries(
        captainIds.map((id) => [
          id,
          state.picks.filter((p) => p.captainId === id).map((p) => p.playerId),
        ]),
      );
      checkRosters(where, pots, rosters);
      if (state.phase === 'closed') {
        checkComplete(where, pots, rosters);
        // With full pots nobody is ever skipped: picks follow the queue.
        const full = pots.every((pot) => pot.length === captainIds.length);
        if (full) {
          assert.deepEqual(
            state.picks.map((p) => p.captainId),
            state.turnQueue.slice(0, state.picks.length),
            `${where}: picks out of turn`,
          );
        }
        return;
      }
      if (state.phase === 'paused') {
        run('resume', resumeDraft(state, clock));
        continue;
      }
      if (random() < 0.03) {
        run('pause', pauseDraft(state, clock));
        continue;
      }
      if (state.picks.length > 0 && random() < 0.05) {
        const undo = undoPick(log, state, clock);
        if ('error' in undo) assert.fail(`${where}: undo: ${undo.error}`);
        for (const entry of log) {
          if (undo.undoneSeqs.includes(entry.seq)) entry.undoneBySeq = -1;
        }
        append([undo.event]);
        assert.equal(
          foldDraft(log).picks.length,
          state.picks.length - 1,
          `${where}: undo should forget one pick`,
        );
        continue;
      }
      if (isDraftComplete(state)) {
        run('close', closeDraft(state, clock));
        continue;
      }
      const captainId = state.currentCaptainId;
      assert.ok(captainId, `${where}: nobody's turn in an open draft`);
      // Someone else trying to pick out of turn is refused.
      const other = captainIds.find((id) => id !== captainId);
      if (other) {
        const option = optionsFor(state, other)[0];
        if (option?.players[0]) {
          const refused = pickPlayer(
            state,
            other,
            option.potIndex,
            option.players[0],
            clock,
          );
          assert.ok('error' in refused, `${where}: picked out of turn`);
        }
      }
      const option = pick(optionsFor(state, captainId));
      run(
        'pick',
        pickPlayer(
          state,
          captainId,
          option.potIndex,
          pick(option.players),
          clock,
        ),
      );
    }
    assert.fail(`${where}: the draft never closed`);
  };

  it(`fills every team in ${seeds.length} random drafts`, () => {
    for (const seed of seeds) play(seed);
  });
});
