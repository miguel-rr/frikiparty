import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPotGroups,
  dealRandomByGroups,
  needsQuotaFormation,
  type PotLayoutOptions,
  type RingCount,
} from './pot-groups';

// 12 players, 3 teams of 4. p1 best … p12 worst.
const order = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
const ringless = new Set(['p2', 'p7', 'p9', 'p11', 'p12']);
const rings: Record<string, RingCount> = Object.fromEntries(
  order.map((id) => [
    id,
    {
      rings: ringless.has(id) ? 0 : 1,
      individualRings: id === 'p2' ? 1 : 0,
    },
  ]),
);
const base = { order, teamCount: 3, teamSize: 4, rings, random: () => 0 };
const options = (patch: Partial<PotLayoutOptions>): PotLayoutOptions => ({
  layout: 'criterion_ranking',
  criterion: 'no_team_ring',
  surplus: 'best_out',
  shortage: 'fill_worst',
  ...patch,
});

describe('buildPotGroups', () => {
  it('keeps the classic chunks', () => {
    const built = buildPotGroups({
      ...base,
      ...options({ layout: 'ranking' }),
    });
    assert.deepEqual(built.pots[0], ['p1', 'p2', 'p3']);
    assert.equal(built.pots.length, 4);
    assert.equal(built.captainPotIndex, null);
  });

  it('moves the best ranked surplus out of the rule pot', () => {
    const built = buildPotGroups({ ...base, ...options({}) });
    assert.deepEqual(built.movedOut, ['p2', 'p7']);
    assert.deepEqual(built.pots[0], ['p1', 'p2', 'p3']);
    assert.deepEqual(built.pots.at(-1), ['p9', 'p11', 'p12']);
    assert.equal(built.groups.at(-1)?.kind, 'criterion');
  });

  it('moves the worst ranked surplus out', () => {
    const built = buildPotGroups({
      ...base,
      ...options({ surplus: 'worst_out' }),
    });
    assert.deepEqual(built.movedOut, ['p11', 'p12']);
    assert.deepEqual(built.pots.at(-1), ['p2', 'p7', 'p9']);
  });

  it('keeps the surplus as a pot of one or two', () => {
    const built = buildPotGroups({
      ...base,
      ...options({ surplus: 'double' }),
    });
    assert.deepEqual(built.pots.at(-1), ['p2', 'p7', 'p9', 'p11', 'p12']);
    assert.equal(built.groups.at(-1)?.quota, 'one_or_two');
    assert.ok(needsQuotaFormation(built.groups));
  });

  it('fills a short rule pot with the lowest ranked', () => {
    const built = buildPotGroups({
      ...base,
      ...options({ criterion: 'no_ring', layout: 'criterion_market' }),
    });
    // No ring at all: p7, p9, p11, p12 (p2 has an individual one) → surplus.
    assert.equal(built.pots.at(-2)?.length, 3);
    const short = buildPotGroups({
      ...base,
      rings: {
        ...rings,
        p7: { rings: 1, individualRings: 0 },
        p9: { rings: 1, individualRings: 0 },
        p11: { rings: 1, individualRings: 0 },
      },
      ...options({ criterion: 'no_ring' }),
    });
    assert.deepEqual(short.filledIn, ['p10', 'p11']);
    assert.deepEqual(short.pots.at(-1), ['p10', 'p11', 'p12']);
  });

  it('leaves a short rule pot short', () => {
    const built = buildPotGroups({
      ...base,
      rings: {
        ...rings,
        p7: { rings: 1, individualRings: 0 },
        p9: { rings: 1, individualRings: 0 },
        p11: { rings: 1, individualRings: 0 },
      },
      ...options({ criterion: 'no_ring', shortage: 'leave_short' }),
    });
    assert.deepEqual(built.pots.at(-1), ['p12']);
    assert.equal(built.groups.at(-1)?.quota, 'at_most_one');
  });

  it('puts everyone else in the market', () => {
    const built = buildPotGroups({ ...base, ...options({ layout: 'market' }) });
    assert.deepEqual(built.pots[0], ['p1', 'p2', 'p3']);
    assert.equal(built.pots[1]?.length, 9);
    assert.deepEqual(
      built.groups.map((g) => g.kind),
      ['captains', 'market'],
    );
  });
});

describe('dealRandomByGroups', () => {
  const sizes = (rosters: Record<string, string[]>) =>
    Object.values(rosters).map((r) => r.length);

  it('fills every team to the same size', () => {
    for (const layout of [
      'criterion_ranking',
      'criterion_market',
      'market',
    ] as const) {
      for (const surplus of ['best_out', 'double'] as const) {
        const built = buildPotGroups({
          ...base,
          ...options({ layout, surplus }),
          random: Math.random,
        });
        const rosters = dealRandomByGroups({
          pots: built.pots,
          groups: built.groups,
          captainPotIndex: 0,
          teamKeys: built.pots[0] ?? [],
          teamSize: 4,
        });
        assert.deepEqual(sizes(rosters), [3, 3, 3], `${layout}/${surplus}`);
        const ruleIndex = built.groups.findIndex((g) => g.kind === 'criterion');
        if (ruleIndex >= 0) {
          const rule = new Set(built.pots[ruleIndex]);
          for (const roster of Object.values(rosters)) {
            const count = roster.filter((id) => rule.has(id)).length;
            assert.ok(count >= 1 && count <= 2, `${layout}/${surplus}`);
          }
        }
      }
    }
  });
});
