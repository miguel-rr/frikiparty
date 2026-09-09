import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { diffWords } from './diff';

describe('diffWords', () => {
  it('marks the words that change and joins back to both texts', () => {
    const before = 'Targeted enemy hero loses -25% armour for 30 seconds';
    const after = 'Targeted enemy hero loses -30% armour for 20 seconds';
    const parts = diffWords(before, after);
    assert.equal(
      parts
        .filter((p) => p.type !== 'add')
        .map((p) => p.text)
        .join(''),
      before,
    );
    assert.equal(
      parts
        .filter((p) => p.type !== 'del')
        .map((p) => p.text)
        .join(''),
      after,
    );
    assert.deepEqual(
      parts.filter((p) => p.type === 'del').map((p) => p.text),
      ['-25%', '30'],
    );
    assert.deepEqual(
      parts.filter((p) => p.type === 'add').map((p) => p.text),
      ['-30%', '20'],
    );
  });

  it('handles empty and identical texts', () => {
    assert.deepEqual(diffWords('', 'Nuevo'), [{ type: 'add', text: 'Nuevo' }]);
    assert.deepEqual(diffWords('Igual', 'Igual'), [
      { type: 'same', text: 'Igual' },
    ]);
  });
});
