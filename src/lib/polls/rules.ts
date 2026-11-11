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

export { quorumFor, resultsVisible };
