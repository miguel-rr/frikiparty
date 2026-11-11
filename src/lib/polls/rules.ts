/**
 * Poll rules shared by the server and the cards: results open once half
 * of the eligible players plus one have voted, and only to whoever has
 * voted — or to everyone once the poll has closed with that quorum.
 */

const quorumFor = (eligible: number) => Math.floor(eligible / 2) + 1;

type ResultsAccess = {
  closed: boolean;
  votes: number;
  quorum: number;
  hasVoted: boolean;
};

const resultsVisible = ({ closed, votes, quorum, hasVoted }: ResultsAccess) =>
  votes >= quorum && (closed || hasVoted);

type PollPhase = 'waiting' | 'open' | 'closed';

type PhaseInput = {
  votingOpen: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  now: number;
};

/**
 * Where a poll stands: closed once its closing time has passed, open when
 * opened by hand or its opening time has come, otherwise still waiting.
 */
const pollPhase = ({
  votingOpen,
  opensAt,
  closesAt,
  now,
}: PhaseInput): PollPhase => {
  if (closesAt && closesAt.getTime() <= now) return 'closed';
  if (votingOpen || (opensAt && opensAt.getTime() <= now)) return 'open';
  return 'waiting';
};

export { type PollPhase, pollPhase, quorumFor, resultsVisible };
