import type { Ballot, Player } from '@/lib/tournament/types';

/** Minimal shape needed to rank and display a player historically. */
type RankedPlayer = { name: string; rings: number; individualRings: number };

type RingCounts = Pick<RankedPlayer, 'rings' | 'individualRings'>;

/** Core-logic tie-break: individual rings decide equal ring counts. */
const outranks = (a: RingCounts, b: RingCounts) =>
  a.rings > b.rings ||
  (a.rings === b.rings && a.individualRings > b.individualRings);

/**
 * Standard "1224" competition positions: full ties share a number, the next
 * distinct value skips ahead. Order-independent (counts outranking players),
 * so sorted and unsorted inputs give the same result.
 */
const competitionPositions = <T extends RingCounts>(players: T[]): number[] =>
  players.map(
    (player) => players.filter((other) => outranks(other, player)).length + 1,
  );

/** rings -> individualRings -> alphabetical fallback (stable display order). */
const sortByHistoricalRanking = <T extends RankedPlayer & { id: string }>(
  players: T[],
): string[] =>
  [...players]
    .sort((a, b) => {
      if (b.rings !== a.rings) return b.rings - a.rings;
      if (b.individualRings !== a.individualRings) {
        return b.individualRings - a.individualRings;
      }
      return a.name.localeCompare(b.name, 'es');
    })
    .map((player) => player.id);

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

/**
 * Perturbs a base order with random swaps, so a synthesized ballot looks
 * like a subjective opinion rather than a verbatim copy of the historical
 * ranking.
 */
const perturbOrder = (order: string[], intensity = 0.35): string[] => {
  const copy = [...order];
  const swaps = Math.max(1, Math.round(copy.length * intensity));
  for (let i = 0; i < swaps; i++) {
    const a = Math.floor(Math.random() * copy.length);
    const b = Math.floor(Math.random() * copy.length);
    [copy[a], copy[b]] = [copy[b] as string, copy[a] as string];
  }
  return copy;
};

/**
 * Synthesizes one ballot per participant, since a single-user simulator has
 * no real multi-voter input. Each voter's ballot starts from the historical
 * order (excluding themselves) and gets randomly perturbed.
 */
const simulateVoting = (players: Player[]): Ballot[] => {
  const historicalOrder = sortByHistoricalRanking(players);
  return players.map((voter) => {
    const others = historicalOrder.filter((id) => id !== voter.id);
    return { voterId: voter.id, order: perturbOrder(others) };
  });
};

/** Borda count over every ballot, restricted to the given participants. */
const combineBallotsToRanking = (
  ballots: Ballot[],
  participantIds: string[],
): string[] => {
  const scores = new Map<string, number>(participantIds.map((id) => [id, 0]));
  for (const ballot of ballots) {
    const n = ballot.order.length;
    ballot.order.forEach((id, index) => {
      if (!scores.has(id)) return;
      scores.set(id, (scores.get(id) ?? 0) + (n - index));
    });
  }
  return [...participantIds].sort(
    (a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0),
  );
};

const toPositionMap = (order: string[]): Map<string, number> =>
  new Map(order.map((id, index) => [id, index]));

/**
 * Blends a historical order and a voting-derived order by weighted average
 * of rank position (lower = better). `historicalWeightPercent` in [0, 100].
 */
const combineRankings = (
  historical: string[],
  voting: string[],
  historicalWeightPercent: number,
): string[] => {
  const historicalPos = toPositionMap(historical);
  const votingPos = toPositionMap(voting);
  const weight = Math.min(100, Math.max(0, historicalWeightPercent)) / 100;

  const score = (id: string) =>
    weight * (historicalPos.get(id) ?? 0) +
    (1 - weight) * (votingPos.get(id) ?? 0);

  return [...historical].sort((a, b) => score(a) - score(b));
};

export {
  combineBallotsToRanking,
  combineRankings,
  competitionPositions,
  outranks,
  type RankedPlayer,
  shuffle,
  simulateVoting,
  sortByHistoricalRanking,
};
