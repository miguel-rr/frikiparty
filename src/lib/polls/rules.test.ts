import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pollPhase, quorumFor, resultsVisible } from '@/lib/polls/rules';

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

  it('opens by hand or at its opening time, and closes at its closing time', () => {
    const now = Date.parse('2026-11-12T20:00:00Z');
    const before = new Date(now - 60_000);
    const after = new Date(now + 60_000);
    const base = { votingOpen: false, opensAt: null, closesAt: null, now };
    assert.equal(pollPhase(base), 'waiting');
    assert.equal(pollPhase({ ...base, votingOpen: true }), 'open');
    assert.equal(pollPhase({ ...base, opensAt: after }), 'waiting');
    assert.equal(pollPhase({ ...base, opensAt: before }), 'open');
    assert.equal(
      pollPhase({ ...base, votingOpen: true, closesAt: after }),
      'open',
    );
    assert.equal(
      pollPhase({ ...base, votingOpen: true, closesAt: before }),
      'closed',
    );
    assert.equal(pollPhase({ ...base, closesAt: before }), 'closed');
  });
});
