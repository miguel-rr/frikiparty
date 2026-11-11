import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_MARKET_CONFIG,
  draftPick,
  eligibleFor,
  foldMarket,
  type MarketConfig,
  type MarketEvent,
  type MarketEventDraft,
  type MarketState,
  marketBid,
  marketNext,
  maxBidFor,
  nominate,
  publicMarket,
  settleMarket,
  startMarketEvents,
  unsoldIn,
} from './market-auction';
import type { PotGroup } from './pot-groups';

const captains = ['c1', 'c2', 'c3'];
const rule = ['r1', 'r2', 'r3'];
const market = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const pots = [captains, rule, market];
const groups: PotGroup[] = [
  { kind: 'captains', quota: 'one' },
  { kind: 'criterion', quota: 'one' },
  { kind: 'market', quota: 'fill' },
];

/** A tiny event store around the engine. */
const room = (config: Partial<MarketConfig>, seed = 1) => {
  let x = seed;
  const random = () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
  const log: MarketEvent[] = [];
  let clock = 1_000;
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
  append(
    startMarketEvents({
      pots,
      groups,
      captainIds: captains,
      captainPotIndex: 0,
      teamSize: 4,
      ranking: [...captains, ...rule, ...market],
      config: { ...DEFAULT_MARKET_CONFIG, ...config },
      now: clock,
      random,
    }),
  );
  const state = () => foldMarket(log);
  const run = (result: { events: MarketEventDraft[] } | { error: string }) => {
    if ('error' in result) throw new Error(result.error);
    append(result.events);
    return state();
  };
  return {
    state,
    random,
    run,
    tick: (ms: number) => {
      clock += ms;
      append(settleMarket(state(), clock, random));
      return state();
    },
    now: () => clock,
  };
};

const finish = (r: ReturnType<typeof room>) => {
  for (let guard = 0; guard < 200; guard += 1) {
    const s = r.state();
    if (s.phase === 'closed') return s;
    if (s.phase === 'idle') {
      r.run(marketNext(s, r.now(), r.random));
    } else if (s.phase === 'nominating') {
      const group = s.walk[s.walkCursor] ?? 0;
      const player = unsoldIn(s, group)[0] ?? '';
      r.run(nominate(s, s.nominatorId ?? '', player, 1, r.now()));
    } else if (s.phase === 'lot') {
      const lot = s.lot;
      if (!lot) throw new Error('no lot');
      const bidders = eligibleFor(s, lot.groupIndex).filter(
        (id) => !lot.bids.some((b) => b.captainId === id),
      );
      if (s.config.bidding === 'sealed' && bidders.length > 0) {
        const id = bidders[0] ?? '';
        r.run(
          marketBid(s, id, Math.min(maxBidFor(s, id), 3), r.now(), r.random),
        );
      } else {
        r.tick(60_000);
      }
    }
  }
  throw new Error('did not finish');
};

const checkTeams = (s: MarketState) => {
  for (const id of captains) {
    const roster = s.rosters[id] ?? [];
    assert.equal(roster.length, 3, `${id} has ${roster.length}`);
    assert.equal(roster.filter((p) => rule.includes(p)).length, 1);
    assert.ok((s.budgets[id] ?? 0) >= 0);
  }
};

describe('market auction', () => {
  it('runs a sealed nomination auction to full teams', () => {
    checkTeams(finish(room({ bidding: 'sealed', lotOrder: 'nomination' })));
  });

  it('runs a sealed auction with random lots', () => {
    checkTeams(finish(room({ bidding: 'sealed', lotOrder: 'random' })));
  });

  it('runs an open auction', () => {
    checkTeams(finish(room({ bidding: 'open', lotOrder: 'nomination' })));
    checkTeams(finish(room({ bidding: 'open', lotOrder: 'random' })));
  });

  it('charges the second bid plus one', () => {
    const r = room({ bidding: 'sealed', lotOrder: 'random', reserve: 'none' });
    r.run(marketNext(r.state(), r.now(), r.random)); // group_started
    let s = r.run(marketNext(r.state(), r.now(), r.random)); // lot
    assert.equal(s.phase, 'lot');
    s = r.run(marketBid(s, 'c1', 30, r.now()));
    s = r.run(marketBid(s, 'c2', 12, r.now()));
    s = r.run(marketBid(s, 'c3', 0, r.now()));
    assert.equal(s.lastSale?.captainId, 'c1');
    assert.equal(s.lastSale?.amount, 13);
    assert.equal(s.budgets.c1, 87);
  });

  it('breaks a tie by money left, then a draw', () => {
    const r = room({
      bidding: 'sealed',
      lotOrder: 'random',
      reserve: 'none',
      compensationPerPlace: 10,
    });
    r.run(marketNext(r.state(), r.now(), r.random));
    let s = r.run(marketNext(r.state(), r.now(), r.random));
    s = r.run(marketBid(s, 'c1', 20, r.now()));
    s = r.run(marketBid(s, 'c2', 20, r.now()));
    s = r.run(marketBid(s, 'c3', 0, r.now()));
    // c2 started with 110, c1 with 100.
    assert.equal(s.lastSale?.captainId, 'c2');
    assert.equal(s.lastSale?.tieBreak, 'money');
  });

  it('keeps the reserve for later seats', () => {
    const s = room({ reserve: 'one' }).state();
    // 100 minus 1 for each of the two seats after this one.
    assert.equal(maxBidFor(s, 'c1'), 98);
  });

  it('waits for the time bank of whoever has not bid', () => {
    const r = room({
      bidding: 'sealed',
      lotOrder: 'random',
      lotTimeMs: 10_000,
      timeBankMs: 20_000,
    });
    r.run(marketNext(r.state(), r.now(), r.random));
    let s = r.run(marketNext(r.state(), r.now(), r.random));
    s = r.run(marketBid(s, 'c1', 5, r.now()));
    s = r.tick(15_000);
    assert.equal(s.phase, 'lot', 'banks still running');
    s = r.tick(20_000);
    assert.equal(s.phase, 'idle');
    assert.equal(s.banks.c2, 0);
    assert.equal(s.banks.c1, 20_000);
  });

  it('keeps sealed bids secret until the lot ends', () => {
    const r = room({ bidding: 'sealed', lotOrder: 'random' });
    r.run(marketNext(r.state(), r.now(), r.random));
    let s = r.run(marketNext(r.state(), r.now(), r.random));
    s = r.run(marketBid(s, 'c1', 9, r.now()));
    assert.equal(publicMarket(s).lot?.bids[0]?.amount, -1);
  });
});

describe('market draft', () => {
  it('drafts in a snake to full teams', () => {
    const r = room({
      mode: 'draft',
      draftOrder: 'snake',
      turnOrder: 'ranking',
    });
    const turns: string[] = [];
    for (let guard = 0; guard < 100; guard += 1) {
      const s = r.state();
      if (s.phase === 'closed') break;
      if (s.phase === 'idle') {
        r.run(marketNext(s, r.now(), r.random));
        continue;
      }
      const group = s.walk[s.walkCursor] ?? 0;
      turns.push(s.nominatorId ?? '');
      r.run(
        draftPick(s, s.nominatorId ?? '', unsoldIn(s, group)[0] ?? '', r.now()),
      );
    }
    const s = r.state();
    assert.equal(s.phase, 'closed');
    checkTeams(s);
    // Rule pot: c1 c2 c3, then the market starts the reversed round.
    assert.deepEqual(turns.slice(0, 6), ['c1', 'c2', 'c3', 'c3', 'c2', 'c1']);
  });
});

describe('market turn order', () => {
  const orders = (turnOrder: MarketConfig['turnOrder'], seed: number) => {
    const r = room({ lotOrder: 'nomination', turnOrder }, seed);
    const seen: string[] = [];
    for (let guard = 0; guard < 300; guard += 1) {
      const s = r.state();
      if (s.phase === 'closed') break;
      if (s.phase === 'idle') {
        r.run(marketNext(s, r.now(), r.random));
      } else if (s.phase === 'nominating') {
        seen.push(s.turnOrder.join(','));
        const group = s.walk[s.walkCursor] ?? 0;
        r.run(
          nominate(
            s,
            s.nominatorId ?? '',
            unsoldIn(s, group)[0] ?? '',
            1,
            r.now(),
          ),
        );
      } else {
        r.tick(60_000);
      }
    }
    assert.equal(r.state().phase, 'closed');
    return new Set(seen);
  };

  it('keeps one drawn order, or draws again each round', () => {
    for (let seed = 1; seed <= 5; seed += 1) {
      assert.equal(orders('draw', seed).size, 1);
    }
    const redraws = [1, 2, 3, 4, 5].map((seed) =>
      orders('draw_each_round', seed),
    );
    assert.ok(redraws.some((set) => set.size > 1));
  });
});
