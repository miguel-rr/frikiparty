import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  combineRankingsWithTies,
  historicalTieGroups,
  keepContiguousTies,
  sharedPlaces,
} from './ranking';

describe('historicalTieGroups', () => {
  it('groups players level on rings and individual rings', () => {
    const counts = new Map([
      ['a', { rings: 3, individualRings: 0 }],
      ['b', { rings: 1, individualRings: 0 }],
      ['c', { rings: 1, individualRings: 0 }],
      ['d', { rings: 1, individualRings: 1 }],
    ]);
    assert.deepEqual(historicalTieGroups(['a', 'd', 'b', 'c'], counts), [
      ['b', 'c'],
    ]);
  });
});

describe('sharedPlaces', () => {
  it('gives tied players the place of the first of them', () => {
    const places = sharedPlaces(['a', 'b', 'c', 'd'], [['b', 'c']]);
    assert.deepEqual([...places.values()], [1, 2, 2, 4]);
  });
});

describe('combineRankingsWithTies', () => {
  it('lets the vote order players tied in the history', () => {
    const result = combineRankingsWithTies(
      { order: ['a', 'b', 'c'], tieGroups: [['b', 'c']] },
      { order: ['a', 'c', 'b'], tieGroups: [] },
      50,
    );
    assert.deepEqual(result.order, ['a', 'c', 'b']);
    assert.deepEqual(result.tieGroups, []);
  });

  it('reports equal blended scores as ties', () => {
    const result = combineRankingsWithTies(
      { order: ['a', 'b'], tieGroups: [] },
      { order: ['b', 'a'], tieGroups: [] },
      50,
    );
    assert.deepEqual(result.tieGroups, [['a', 'b']]);
  });
});

describe('keepContiguousTies', () => {
  it('drops ties a hand edit has split', () => {
    assert.deepEqual(
      keepContiguousTies(
        ['a', 'b', 'c'],
        [
          ['a', 'c'],
          ['b', 'c'],
        ],
      ),
      [['b', 'c']],
    );
  });
});
