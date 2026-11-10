import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { breakTie, findCutTies, resolveCutTies } from './pot-tiebreak';

const names: Record<string, string> = {
  a: 'Zeta',
  b: 'Alfa',
  c: 'Beta',
  d: 'Gamma',
  e: 'Delta',
  f: 'Épsilon',
};

describe('findCutTies', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('ignores ties inside one pot', () => {
    assert.deepEqual(findCutTies(order, [['a', 'b']], 3), []);
  });

  it('reports the seats each pot gets', () => {
    assert.deepEqual(findCutTies(order, [['b', 'c', 'd', 'e']], 3), [
      { players: ['b', 'c', 'd', 'e'], pots: [0, 1], seats: [2, 2] },
    ]);
  });
});

describe('breakTie', () => {
  const context = {
    names,
    latestRingYear: { b: 2022, c: 2025, d: 2025, e: null },
    random: () => 0,
  };

  it('alphabetical sorts by name', () => {
    assert.deepEqual(breakTie(['a', 'b', 'c'], 'alphabetical', context), {
      ordered: ['b', 'c', 'a'],
      drawn: false,
    });
  });

  it('latest_ring puts the newest ring first and draws equal years', () => {
    const { ordered, drawn } = breakTie(
      ['b', 'c', 'd', 'e'],
      'latest_ring',
      context,
    );
    assert.equal(drawn, true);
    assert.deepEqual(new Set(ordered.slice(0, 2)), new Set(['c', 'd']));
    assert.deepEqual(ordered.slice(2), ['b', 'e']);
  });

  it('latest_ring needs no draw when the years differ', () => {
    const { drawn } = breakTie(['b', 'c', 'e'], 'latest_ring', context);
    assert.equal(drawn, false);
  });
});

describe('resolveCutTies', () => {
  it('only reorders the runs that a cut goes through', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    const result = resolveCutTies(
      order,
      [
        ['a', 'b'],
        ['c', 'd'],
      ],
      3,
      'alphabetical',
      { names, latestRingYear: {} },
    );
    // "a"/"b" share pot 1: untouched. "c"/"d" straddle the cut: by name.
    assert.deepEqual(result.order, ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.equal(result.resolutions.length, 1);
    assert.deepEqual(result.resolutions[0]?.ordered, ['c', 'd']);
  });

  it('keeps every player exactly once', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    const result = resolveCutTies(order, [['b', 'c', 'd', 'e']], 3, 'draw', {
      names,
      latestRingYear: {},
    });
    assert.deepEqual([...result.order].sort(), [...order].sort());
    assert.equal(result.order[0], 'a');
    assert.equal(result.order[5], 'f');
  });
});
