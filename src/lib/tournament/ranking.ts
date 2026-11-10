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

/** Each id's 0-based index, tied runs sharing the mean of their places. */
const averagePositions = (
  order: string[],
  tieGroups: string[][] = [],
): Map<string, number> => {
  const positions = toPositionMap(order);
  for (const group of tieGroups) {
    const indices = group.map((id) => positions.get(id) ?? 0);
    const mean = indices.reduce((sum, i) => sum + i, 0) / indices.length;
    for (const id of group) positions.set(id, mean);
  }
  return positions;
};

/**
 * Display places ("1224" style): tied runs share the place of their first
 * member. 1-based.
 */
const sharedPlaces = (
  order: string[],
  tieGroups: string[][] = [],
): Map<string, number> => {
  const places = new Map(order.map((id, index) => [id, index + 1]));
  for (const group of tieGroups) {
    const first = Math.min(...group.map((id) => places.get(id) ?? 0));
    for (const id of group) places.set(id, first);
  }
  return places;
};

/** Runs of players level on rings and individual rings, in order. */
const historicalTieGroups = (
  order: string[],
  counts: Map<string, RingCounts>,
): string[][] => {
  const groups: string[][] = [];
  let run: string[] = [];
  const same = (a: string, b: string) => {
    const x = counts.get(a);
    const y = counts.get(b);
    return (
      x !== undefined &&
      y !== undefined &&
      x.rings === y.rings &&
      x.individualRings === y.individualRings
    );
  };
  for (const id of order) {
    const last = run[run.length - 1];
    if (last !== undefined && same(last, id)) {
      run.push(id);
    } else {
      if (run.length > 1) groups.push(run);
      run = [id];
    }
  }
  if (run.length > 1) groups.push(run);
  return groups;
};

/**
 * `combineRankings` with ties: tied players count with the mean of their
 * places on both sides, and players whose blended score comes out equal
 * are reported as tied.
 */
const combineRankingsWithTies = (
  historical: { order: string[]; tieGroups: string[][] },
  voting: { order: string[]; tieGroups: string[][] },
  historicalWeightPercent: number,
): {
  order: string[];
  tieGroups: string[][];
  scores: Record<string, number>;
} => {
  const historicalPos = averagePositions(
    historical.order,
    historical.tieGroups,
  );
  const votingPos = averagePositions(voting.order, voting.tieGroups);
  const weight = Math.min(100, Math.max(0, historicalWeightPercent)) / 100;
  const scores: Record<string, number> = {};
  for (const id of historical.order) {
    // Rounded so float noise doesn't split a genuine tie.
    scores[id] =
      Math.round(
        (weight * (historicalPos.get(id) ?? 0) +
          (1 - weight) * (votingPos.get(id) ?? 0)) *
          1000,
      ) / 1000;
  }
  const order = [...historical.order].sort(
    (a, b) => (scores[a] ?? 0) - (scores[b] ?? 0),
  );
  const tieGroups: string[][] = [];
  let run: string[] = [];
  for (const id of order) {
    const last = run[run.length - 1];
    if (last !== undefined && scores[last] === scores[id]) {
      run.push(id);
    } else {
      if (run.length > 1) tieGroups.push(run);
      run = [id];
    }
  }
  if (run.length > 1) tieGroups.push(run);
  return { order, tieGroups, scores };
};

/**
 * Keeps the tied runs that are still contiguous in `order` (a hand edit
 * may have split some): the admin has ordered the rest by hand.
 */
const keepContiguousTies = (order: string[], tieGroups: string[][]) => {
  const position = new Map(order.map((id, index) => [id, index]));
  return tieGroups.filter((group) => {
    const indices = group
      .map((id) => position.get(id))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b);
    if (indices.length !== group.length || indices.length < 2) return false;
    return indices.every(
      (value, i) => i === 0 || value === (indices[i - 1] ?? 0) + 1,
    );
  });
};

export {
  averagePositions,
  combineBallotsToRanking,
  combineRankings,
  combineRankingsWithTies,
  competitionPositions,
  historicalTieGroups,
  keepContiguousTies,
  outranks,
  type RankedPlayer,
  sharedPlaces,
  shuffle,
  simulateVoting,
  sortByHistoricalRanking,
};
