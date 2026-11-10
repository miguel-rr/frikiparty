import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_FORMATION_CONFIG,
  parseFormationConfig,
} from './formation-config';

describe('parseFormationConfig', () => {
  it('defaults everything for a missing value', () => {
    assert.deepEqual(parseFormationConfig(null), DEFAULT_FORMATION_CONFIG);
  });

  it('keeps known values and repairs bad ones', () => {
    assert.deepEqual(
      parseFormationConfig({ voteCount: 'duels', potTiebreak: 'nope' }),
      { ...DEFAULT_FORMATION_CONFIG, voteCount: 'duels' },
    );
  });
});
