import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type AuctionEvent,
  type CommandResult,
  confirmNext,
  DEFAULT_AUCTION_CONFIG,
  type EventDraft,
  eligibleBidders,
  foldAuction,
  minNextBid,
  placeBid,
  settle,
  startAuctionEvents,
} from './auction-live';

// Two captains, two pots to buy from: a/b (minimum 100) and x/y (50).
const pots = [
  ['c1', 'c2'],
  ['a', 'b'],
  ['x', 'y'],
];

const room = (roomPots = pots) => {
  const log: AuctionEvent[] = [];
  let clock = 1_000;
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
  append(
    startAuctionEvents({
      pots: roomPots,
      captainIds: roomPots[0] ?? [],
      captainPotIndex: 0,
      config: DEFAULT_AUCTION_CONFIG,
      now: clock,
    }),
  );
  const state = () => foldAuction(log);
  const run = (result: CommandResult) => {
    if ('error' in result) throw new Error(result.error);
    append(result.events);
    return state();
  };
  /** Lets the next timer run out (the lockout after a bid, say). */
  const tick = () => {
    const s = state();
    clock = s.deadlineAt ?? clock;
    append(settle(s, clock));
    return state();
  };
  /** Lets every timer run out until the lot is settled. */
  const runOut = () => {
    for (let guard = 0; guard < 5; guard++) {
      const s = state();
      if (s.deadlineAt === null) return s;
      clock = s.deadlineAt;
      append(settle(s, clock));
    }
    return state();
  };
  return {
    state,
    run,
    tick,
    runOut,
    next: () => run(confirmNext(state(), clock)),
    bid: (captainId: string, amount: number) =>
      run(placeBid(state(), captainId, amount, clock)),
  };
};

describe('pot auction', () => {
  it('prices the pots 100 and 50 and gives each captain twice their sum', () => {
    const s = room().state();
    assert.deepEqual(s.minBidByPot, [0, 100, 50]);
    assert.equal(s.budget, 300);
    assert.deepEqual(s.potWalk, [1, 2]);
  });

  it('sells to the top bid when the countdown ends', () => {
    const r = room();
    r.next();
    r.bid('c1', 100);
    // Controls stay off for the lockout after each bid.
    assert.throws(() => r.bid('c2', 120), /no está abierta/);
    r.tick();
    r.bid('c2', 120);
    const s = r.runOut();
    assert.equal(s.lastSale?.captainId, 'c2');
    assert.equal(s.lastSale?.amount, 120);
    assert.equal(s.budgets.c2, 180);
  });

  it('the last player of a pot goes to the last captain at the minimum', () => {
    const r = room();
    r.next();
    r.bid('c1', 100);
    r.runOut();
    const s = r.next();
    assert.equal(s.lastSale?.kind, 'auto');
    assert.equal(s.lastSale?.captainId, 'c2');
    assert.equal(s.lastSale?.amount, 100);
  });

  it('a captain without the minimum sits out, then pays what is left', () => {
    const r = room();
    r.next();
    r.bid('c1', 260); // 40 left: not enough for the 50 pot
    r.runOut();
    r.next(); // b goes to c2 at 100
    r.next(); // pot x/y starts
    let s = r.next();
    assert.equal(s.phase, 'lot_open');
    assert.deepEqual(eligibleBidders(s), ['c2']);
    r.bid('c2', 50);
    r.runOut();
    s = r.next();
    // The leftover is c1's: the minimum is 50, c1 pays its last 40.
    assert.equal(s.lastSale?.captainId, 'c1');
    assert.equal(s.lastSale?.amount, 40);
    assert.equal(s.budgets.c1, 0);
  });

  it('when only broke captains still need a player, they bid freely', () => {
    const r = room([
      ['c1', 'c2', 'c3'],
      ['a', 'b', 'c'],
      ['x', 'y', 'z'],
    ]);
    r.next();
    r.bid('c1', 260); // 40 left
    r.runOut();
    r.next();
    r.bid('c2', 260); // 40 left
    r.runOut();
    r.next(); // the last of the pot goes to c3 at 100
    r.next(); // the 50 pot starts
    r.next();
    r.bid('c3', 50);
    r.runOut();
    // Only c1 and c2 still need one, and neither has 50.
    const s = r.next();
    assert.equal(minNextBid(s), 0);
    assert.deepEqual(eligibleBidders(s).sort(), ['c1', 'c2']);
    r.bid('c1', 10);
    const sold = r.runOut();
    assert.equal(sold.lastSale?.captainId, 'c1');
    assert.equal(sold.lastSale?.amount, 10);
  });
});
