import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { quorumFor, resultsVisible } from '@/lib/polls/rules';

describe('poll rules', () => {
  it('needs half plus one', () => {
    assert.equal(quorumFor(20), 11);
    assert.equal(quorumFor(19), 10);
    assert.equal(quorumFor(0), 1);
  });

  it('opens results only to voters until it closes', () => {
    const base = { closed: false, votes: 11, quorum: 11 };
    assert.equal(resultsVisible({ ...base, hasVoted: true }), true);
    assert.equal(resultsVisible({ ...base, hasVoted: false }), false);
    assert.equal(
      resultsVisible({ ...base, closed: true, hasVoted: false }),
      true,
    );
  });

  it('never opens results without quorum, not even closed', () => {
    assert.equal(
      resultsVisible({ closed: true, votes: 8, quorum: 11, hasVoted: true }),
      false,
    );
  });
});
