import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCaptainOrder,
  buildDraftOrder,
  getAvailablePotIndices,
  resolveNextTurn,
} from './draft';
import { assignRandomWithinPots, generatePots } from './pots';

const ranking = ['c1', 'c2', 'c3', 'a', 'b', 'c', 'x', 'y'];
const captains = ['c2', 'c3', 'c1'];

describe('generatePots', () => {
  it('chunks the ranking, the last pot short when it does not divide', () => {
    const { pots, teamCount } = generatePots(ranking, 3);
    assert.equal(teamCount, 3);
    assert.deepEqual(pots, [
      ['c1', 'c2', 'c3'],
      ['a', 'b', 'c'],
      ['x', 'y'],
    ]);
  });
});

describe('assignRandomWithinPots', () => {
  it('gives every team one of each pot while the pot lasts', () => {
    const { pots, teamCount } = generatePots(ranking, 3);
    const teams = assignRandomWithinPots(pots, teamCount);
    const sizes = teams.map((team) => team.playerIds.length).sort();
    assert.deepEqual(sizes, [2, 3, 3]);
    for (const team of teams) {
      for (const pot of pots) {
        assert.ok(team.playerIds.filter((id) => pot.includes(id)).length <= 1);
      }
    }
  });
});

describe('buildCaptainOrder', () => {
  it('orders by ranking, or the other way round', () => {
    assert.deepEqual(buildCaptainOrder(captains, ranking, 'ranking'), [
      'c1',
      'c2',
      'c3',
    ]);
    assert.deepEqual(buildCaptainOrder(captains, ranking, 'inverse-ranking'), [
      'c3',
      'c2',
      'c1',
    ]);
  });

  it('a random order is still every captain once', () => {
    const order = buildCaptainOrder(captains, ranking, 'fixed-random');
    assert.deepEqual([...order].sort(), ['c1', 'c2', 'c3']);
  });
});

describe('buildDraftOrder', () => {
  const base = ['c3', 'c2', 'c1'];

  it('snake reverses every other round', () => {
    assert.deepEqual(buildDraftOrder(captains, base, 3, 'ranking', 'snake'), [
      'c3',
      'c2',
      'c1',
      'c1',
      'c2',
      'c3',
      'c3',
      'c2',
      'c1',
    ]);
  });

  it('linear repeats the same order', () => {
    assert.deepEqual(buildDraftOrder(captains, base, 2, 'ranking', 'linear'), [
      'c3',
      'c2',
      'c1',
      'c3',
      'c2',
      'c1',
    ]);
  });

  it('full random draws a new order every round', () => {
    const queue = buildDraftOrder(captains, base, 4, 'full-random', 'snake');
    assert.equal(queue.length, 12);
    for (let round = 0; round < 4; round++) {
      const slice = queue.slice(round * 3, round * 3 + 3);
      assert.deepEqual([...slice].sort(), ['c1', 'c2', 'c3']);
    }
  });
});

describe('turns', () => {
  const pots = [
    ['c1', 'c2', 'c3'],
    ['a', 'b', 'c'],
    ['x', 'y'],
  ];
  const turnQueue = ['c1', 'c2', 'c3', 'c3', 'c2', 'c1', 'c1', 'c2', 'c3'];

  it('a captain picks any pot they have nothing from', () => {
    const draft = {
      method: 'snake' as const,
      turnQueue,
      picks: [{ captainId: 'c1', potIndex: 2, playerId: 'x' }],
    };
    assert.deepEqual(getAvailablePotIndices(pots, draft, 'c1'), [1]);
    assert.deepEqual(getAvailablePotIndices(pots, draft, 'c2'), [1, 2]);
  });

  it('skips a captain left with nothing by the short pot', () => {
    const draft = {
      method: 'snake' as const,
      turnQueue,
      picks: [
        { captainId: 'c1', potIndex: 1, playerId: 'a' },
        { captainId: 'c2', potIndex: 2, playerId: 'x' },
        { captainId: 'c3', potIndex: 2, playerId: 'y' },
        { captainId: 'c3', potIndex: 1, playerId: 'b' },
        { captainId: 'c2', potIndex: 1, playerId: 'c' },
      ],
    };
    // c1's turn, but the short pot is gone: nobody is left to pick.
    assert.equal(resolveNextTurn(draft, pots), undefined);
  });
});
