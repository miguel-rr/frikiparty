import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_MARKET_CONFIG,
  eligibleFor,
  foldMarket,
  type MarketCommandResult,
  type MarketConfig,
  type MarketEvent,
  type MarketEventDraft,
  marketBid,
  marketNext,
  maxBidFor,
  nominate,
  pauseMarket,
  publicMarket,
  resumeMarket,
  settleMarket,
  startMarketEvents,
} from './market-auction';
import type { PotGroup } from './pot-groups';

// Three captains (c1 best ranked … c3) and one pot of three, one each.
const captains = ['c1', 'c2', 'c3'];
const pot = ['a', 'b', 'c'];

/**
 * A room with a hand-driven clock. `random` returns a fixed value so a
 * draw is predictable; budgets differ only through compensation.
 */
const room = (
  config: Partial<MarketConfig>,
  options: { pots?: string[][]; groups?: PotGroup[]; teamSize?: number } = {},
) => {
  const random = () => 0.5;
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
  const pots = options.pots ?? [captains, pot];
  append(
    startMarketEvents({
      pots,
      groups: options.groups ?? [
        { kind: 'captains', quota: 'one' },
        { kind: 'ranking', quota: 'one' },
      ],
      captainIds: captains,
      captainPotIndex: 0,
      teamSize: options.teamSize ?? pots.length,
      ranking: [...captains, ...pots.slice(1).flat()],
      config: {
        ...DEFAULT_MARKET_CONFIG,
        lotOrder: 'random',
        minBids: [0, 5],
        ...config,
      },
      now: clock,
      random,
    }),
  );
  const state = () => foldMarket(log);
  const run = (result: MarketCommandResult) => {
    if ('error' in result) throw new Error(result.error);
    append(result.events);
    return state();
  };
  return {
    log,
    state,
    run,
    at: (ms: number) => {
      clock = ms;
    },
    now: () => clock,
    next: () => run(marketNext(state(), clock, random)),
    bid: (captainId: string, amount: number) =>
      marketBid(state(), captainId, amount, clock, random),
    settle: () => {
      const events = settleMarket(state(), clock, random);
      append(events);
      return events;
    },
  };
};

/** Opens the first lot: the group, then its first player. */
const openLot = (r: ReturnType<typeof room>) => {
  r.next();
  return r.next();
};

const errorOf = (result: MarketCommandResult) =>
  'error' in result ? result.error : null;

describe('sealed bids: who wins and what they pay', () => {
  const sealedLot = (
    bids: [string, number][],
    config: Partial<MarketConfig> = {},
  ) => {
    const r = room({ bidding: 'sealed', ...config });
    openLot(r);
    for (const [captainId, amount] of bids) r.run(r.bid(captainId, amount));
    const sale = r.state().lastSale;
    assert.ok(sale, 'the lot should be sold once everyone has bid');
    return sale;
  };

  it('a lone bidder pays the minimum', () => {
    const sale = sealedLot([
      ['c1', 30],
      ['c2', 0],
      ['c3', 0],
    ]);
    assert.equal(sale.captainId, 'c1');
    assert.equal(sale.amount, 5);
  });

  it('the winner pays the second bid plus one', () => {
    const sale = sealedLot([
      ['c1', 30],
      ['c2', 12],
      ['c3', 0],
    ]);
    assert.equal(sale.captainId, 'c1');
    assert.equal(sale.amount, 13);
  });

  it('"own price" charges the winning bid', () => {
    const sale = sealedLot(
      [
        ['c1', 30],
        ['c2', 12],
        ['c3', 0],
      ],
      { sealedPrice: 'own' },
    );
    assert.equal(sale.amount, 30);
  });

  it('a tie goes to the captain with more money, at the tied bid', () => {
    // Compensation 10: c1 100, c2 110, c3 120.
    const sale = sealedLot(
      [
        ['c1', 20],
        ['c2', 20],
        ['c3', 0],
      ],
      { compensationPerPlace: 10 },
    );
    assert.equal(sale.captainId, 'c2');
    assert.equal(sale.amount, 20);
    assert.equal(sale.tieBreak, 'money');
  });

  it('a tie with equal money is drawn', () => {
    const sale = sealedLot([
      ['c1', 20],
      ['c2', 20],
      ['c3', 0],
    ]);
    assert.ok(['c1', 'c2'].includes(sale.captainId));
    assert.equal(sale.amount, 20);
    assert.equal(sale.tieBreak, 'draw');
  });

  it('every bid of the lot is kept, best first', () => {
    const sale = sealedLot([
      ['c3', 7],
      ['c1', 30],
      ['c2', 12],
    ]);
    assert.deepEqual(
      sale.bids.map((bid) => bid.captainId),
      ['c1', 'c2', 'c3'],
    );
  });

  it('refuses a bid under the minimum unless it is 0 (no bid)', () => {
    const r = room({ bidding: 'sealed' });
    openLot(r);
    assert.match(errorOf(r.bid('c1', 3)) ?? '', /mínima es 5/);
    assert.equal(errorOf(r.bid('c1', 0)), null);
  });

  it('refuses a bid above what the captain can spend', () => {
    const r = room({ bidding: 'sealed', budget: 40 });
    openLot(r);
    assert.match(errorOf(r.bid('c1', 41)) ?? '', /Como mucho/);
  });

  it('the nominator must open with at least the minimum', () => {
    const r = room({ bidding: 'sealed', lotOrder: 'nomination' });
    r.next();
    const s = r.next();
    assert.equal(s.phase, 'nominating');
    const nominator = s.nominatorId ?? '';
    assert.match(
      errorOf(nominate(s, nominator, 'a', 0, r.now())) ?? '',
      /al menos/,
    );
    r.run(nominate(s, nominator, 'a', 5, r.now()));
    // Their opening bid stands: they can't take it back with a 0.
    assert.match(errorOf(r.bid(nominator, 0)) ?? '', /has nominado/);
  });

  it('a lot nobody bids on goes unsold', () => {
    const r = room({ bidding: 'sealed' });
    openLot(r);
    r.run(r.bid('c1', 0));
    r.run(r.bid('c2', 0));
    const s = r.run(r.bid('c3', 0));
    assert.equal(s.lastUnsold, 'a');
    assert.equal(s.sales.length, 0);
  });
});

describe('what viewers see', () => {
  it('sealed amounts stay hidden while the lot is open', () => {
    const r = room({ bidding: 'sealed' });
    openLot(r);
    r.run(r.bid('c1', 37));
    r.run(r.bid('c2', 23));
    const shown = publicMarket(r.state());
    // Who has bid may show; how much may not, anywhere in the state.
    assert.deepEqual(
      shown.lot?.bids.map((bid) => bid.amount),
      [-1, -1],
    );
    const text = JSON.stringify(shown.lot);
    assert.ok(!text.includes('37') && !text.includes('23'), text);
  });

  it('"winner only" shows the price but not the other bids', () => {
    const r = room({ bidding: 'sealed', reveal: 'winner' });
    openLot(r);
    r.run(r.bid('c1', 30));
    r.run(r.bid('c2', 12));
    r.run(r.bid('c3', 0));
    const sale = publicMarket(r.state()).lastSale;
    assert.equal(sale?.amount, 13);
    assert.deepEqual(sale?.bids, []);
  });

  it('"at the end" hides prices and money until the auction closes', () => {
    const r = room({ bidding: 'sealed', reveal: 'end' });
    openLot(r);
    r.run(r.bid('c1', 30));
    r.run(r.bid('c2', 12));
    r.run(r.bid('c3', 0));
    const during = publicMarket(r.state());
    assert.equal(during.lastSale?.amount, -1);
    assert.deepEqual(Object.values(during.budgets), [-1, -1, -1]);
    for (let guard = 0; guard < 30 && r.state().phase !== 'closed'; guard++) {
      const s = r.state();
      if (s.phase === 'idle') {
        r.next();
        continue;
      }
      // Whoever is still in for this lot: the first bids 5, the rest pass.
      const waiting = eligibleFor(s, s.lot?.groupIndex ?? 1).filter(
        (id) => !s.lot?.bids.some((bid) => bid.captainId === id),
      );
      waiting.forEach((id, index) => {
        r.run(r.bid(id, index === 0 ? 5 : 0));
      });
    }
    const after = publicMarket(r.state());
    assert.equal(after.phase, 'closed');
    assert.equal(after.sales[0]?.amount, 13);
    assert.equal(after.budgets.c1, 87);
  });
});

describe('the clock', () => {
  const banked = () =>
    room({ bidding: 'sealed', lotTimeMs: 10_000, timeBankMs: 30_000 });

  it('waits for the bank of whoever has not bid yet', () => {
    const r = banked();
    const s = openLot(r);
    assert.equal(s.lot?.deadlineAt, 11_000);
    // Nobody has bid: the lot lasts its time plus the banks.
    assert.equal(s.deadlineAt, 41_000);
    r.at(11_500);
    assert.deepEqual(r.settle(), []);
  });

  it('charges bank time only to the late captain', () => {
    const r = banked();
    openLot(r);
    r.at(5_000);
    r.run(r.bid('c1', 10));
    r.run(r.bid('c3', 0));
    r.at(31_000); // 20 s past the lot's own time
    const s = r.run(r.bid('c2', 8));
    assert.equal(s.banks.c2, 10_000);
    assert.equal(s.banks.c1, 30_000);
    assert.equal(s.lastSale?.captainId, 'c1');
  });

  it('a pause neither ends the lot nor spends the bank', () => {
    const r = banked();
    openLot(r);
    r.at(5_000);
    r.run(r.bid('c1', 10));
    r.run(r.bid('c3', 0));
    r.at(8_000);
    r.run(pauseMarket(r.state(), r.now()));
    r.at(68_000); // a minute paused
    assert.deepEqual(r.settle(), []);
    const resumed = r.run(resumeMarket(r.state(), r.log, r.now()));
    assert.equal(resumed.lot?.deadlineAt, 71_000);
    r.at(70_000); // still inside the lot's own time after the shift
    const s = r.run(r.bid('c2', 8));
    assert.equal(s.banks.c2, 30_000);
  });

  it('refuses a bid once the lot and the banks are over', () => {
    const r = banked();
    openLot(r);
    r.at(41_001);
    assert.match(errorOf(r.bid('c1', 10)) ?? '', /Se acabó/);
  });

  it('a timer resolves once, however often it is checked', () => {
    const r = room({ bidding: 'sealed', lotTimeMs: 10_000 });
    openLot(r);
    r.run(r.bid('c1', 10));
    r.at(20_000);
    assert.equal(r.settle().length, 1);
    assert.deepEqual(r.settle(), []);
    assert.equal(r.state().lastSale?.captainId, 'c1');
  });
});

describe('open bidding', () => {
  const open = () =>
    room({ bidding: 'open', lotTimeMs: 30_000, countdownMs: 15_000 });

  it('the first bid starts at the minimum, then one more than the top', () => {
    const r = open();
    openLot(r);
    assert.match(errorOf(r.bid('c1', 4)) ?? '', /mínima ahora es 5/);
    r.run(r.bid('c1', 5));
    assert.match(errorOf(r.bid('c2', 5)) ?? '', /mínima ahora es 6/);
    r.run(r.bid('c2', 6));
  });

  it('nobody raises their own top bid', () => {
    const r = open();
    openLot(r);
    r.run(r.bid('c1', 5));
    assert.match(errorOf(r.bid('c1', 9)) ?? '', /Ya vas ganando/);
  });

  it('each bid leaves at least the countdown to answer', () => {
    const r = open();
    const s = openLot(r);
    assert.equal(s.deadlineAt, 31_000);
    r.at(5_000);
    assert.equal(r.run(r.bid('c1', 5)).deadlineAt, 31_000);
    r.at(25_000);
    assert.equal(r.run(r.bid('c2', 6)).deadlineAt, 40_000);
    r.at(40_001);
    r.settle();
    const sale = r.state().lastSale;
    assert.equal(sale?.captainId, 'c2');
    assert.equal(sale?.amount, 6);
  });

  it('a captain who cannot afford the next bid is refused', () => {
    const r = room({ bidding: 'open', budget: 8 });
    openLot(r);
    r.run(r.bid('c1', 8));
    assert.match(errorOf(r.bid('c2', 9)) ?? '', /Como mucho/);
  });

  it('a pass with no sale ends in a raffle at the minimum', () => {
    const r = open();
    openLot(r);
    for (let lot = 0; lot < 3; lot++) {
      if (lot > 0) r.next();
      r.at(r.now() + 31_000);
      r.settle();
    }
    const s = r.next();
    assert.equal(s.sales.length, 3);
    assert.ok(s.sales.every((sale) => sale.kind === 'raffle'));
    assert.ok(s.sales.every((sale) => sale.amount === 5));
    assert.deepEqual(
      captains.map((id) => s.rosters[id]?.length),
      [1, 1, 1],
    );
  });
});

describe('the reserve', () => {
  // Two pots to buy from, minimum 10 each: whoever buys in the first must
  // keep money for the second.
  const reserved = (reserve: MarketConfig['reserve']) => {
    const r = room(
      { reserve, budget: 25, minBids: [0, 10, 10] },
      {
        pots: [captains, pot, ['x', 'y', 'z']],
        groups: [
          { kind: 'captains', quota: 'one' },
          { kind: 'ranking', quota: 'one' },
          { kind: 'ranking', quota: 'one' },
        ],
      },
    );
    return maxBidFor(openLot(r), 'c1');
  };

  it('"minimum" keeps the smallest minimum for each seat left', () => {
    assert.equal(reserved('minimum'), 15);
  });

  it('"one" keeps one coin per seat left', () => {
    assert.equal(reserved('one'), 24);
  });

  it('"none" lets a captain spend it all', () => {
    assert.equal(reserved('none'), 25);
  });
});
