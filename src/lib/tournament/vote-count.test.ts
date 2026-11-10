import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ballot } from './types';
import { countVotes, groupTies, orderDistance } from './vote-count';

const players = ['a', 'b', 'c', 'd', 'e'];

/** Every voter ranks the others in the alphabetical order. */
const honest = (voterId: string): Ballot => ({
  voterId,
  order: players.filter((id) => id !== voterId),
});

describe('orderDistance', () => {
  it('is 0 for the same order and 100 for the reverse', () => {
    assert.equal(orderDistance(['a', 'b', 'c'], ['a', 'b', 'c']), 0);
    assert.equal(orderDistance(['c', 'b', 'a'], ['a', 'b', 'c']), 100);
  });

  it('only looks at shared ids', () => {
    assert.equal(orderDistance(['a', 'x', 'b'], ['a', 'b']), 0);
  });
});

describe('groupTies', () => {
  it('returns runs of two or more', () => {
    const score: Record<string, number> = { a: 3, b: 2, c: 2, d: 1 };
    assert.deepEqual(
      groupTies(['a', 'b', 'c', 'd'], (x, y) => score[x] === score[y]),
      [['b', 'c']],
    );
  });
});

describe('countVotes', () => {
  const ballots = players.map(honest);

  for (const method of ['borda', 'median', 'duels'] as const) {
    it(`${method}: unanimous ballots give the unanimous order`, () => {
      const result = countVotes(ballots, players, { method });
      assert.deepEqual(result.order, players);
      assert.equal(result.ballotsUsed, 5);
      assert.equal(result.ballotsDiscarded, 0);
    });
  }

  it('duels: your own ballot never counts in your duels', () => {
    // "e" ranks every rival above them in reverse, trying to sink "a" and
    // lift "d" over themselves; the others agree on a > b > c > d > e.
    const rigged: Ballot[] = [
      ...players.slice(0, 4).map(honest),
      { voterId: 'e', order: ['d', 'c', 'b', 'a'] },
    ];
    const result = countVotes(rigged, players, { method: 'duels' });
    assert.deepEqual(result.order, players);
    // "e" loses all four duels whatever they voted.
    assert.equal(result.scores.e, 0);
  });

  it('duels: the head-to-head splits two players level on duels', () => {
    // A cycle a > b > c > a among three voters is broken by nothing, so
    // they stay tied.
    const cycle: Ballot[] = [
      { voterId: 'x', order: ['a', 'b', 'c'] },
      { voterId: 'y', order: ['b', 'c', 'a'] },
      { voterId: 'z', order: ['c', 'a', 'b'] },
    ];
    const result = countVotes(cycle, ['a', 'b', 'c'], { method: 'duels' });
    assert.deepEqual(result.tieGroups, [['a', 'b', 'c']]);
  });

  it('borda: equal points are reported as a tie', () => {
    const split: Ballot[] = [
      { voterId: 'x', order: ['a', 'b'] },
      { voterId: 'y', order: ['b', 'a'] },
    ];
    const result = countVotes(split, ['a', 'b'], { method: 'borda' });
    assert.deepEqual(result.tieGroups, [['a', 'b']]);
  });

  it('median: one extreme ballot does not move a player', () => {
    const many: Ballot[] = [
      ...['v1', 'v2', 'v3', 'v4'].map((voterId) => ({
        voterId,
        order: ['a', 'b', 'c'],
      })),
      { voterId: 'v5', order: ['c', 'b', 'a'] },
    ];
    const result = countVotes(many, ['a', 'b', 'c'], { method: 'median' });
    assert.deepEqual(result.order, ['a', 'b', 'c']);
    assert.equal(result.scores.a, 1);
  });

  it('drops ballots farther than the threshold from the rest', () => {
    const withOutlier: Ballot[] = [
      ...players.slice(0, 4).map(honest),
      { voterId: 'e', order: ['d', 'c', 'b', 'a'] },
    ];
    const result = countVotes(withOutlier, players, {
      method: 'borda',
      outlierThreshold: 50,
    });
    assert.equal(result.ballotsDiscarded, 1);
    assert.equal(result.ballotsUsed, 4);
    assert.equal(result.distances.length, 5);
    assert.equal(result.distances[4], 100);
  });
});
