import type { Ballot } from '@/lib/tournament/types';

/**
 * How the ballots become a ranking:
 * - `borda`: points by position, summed (the original count).
 * - `median`: each player's median position across ballots; two or three
 *   extreme ballots can't move it.
 * - `duels`: every pair is decided by the majority of the OTHER voters
 *   (neither of the two players' own ballot counts), and players rank by
 *   duels won. A ballot can never push its own voter down.
 */
type VoteCountMethod = 'borda' | 'median' | 'duels';

type VoteCount = {
  method: VoteCountMethod;
  /** Best first. Ties keep the participants' order (historical). */
  order: string[];
  /**
   * The figure each player was ranked by: Borda points, median position
   * (lower is better) or duels won.
   */
  scores: Record<string, number>;
  /** Runs of tied players, contiguous in `order`, two or more each. */
  tieGroups: string[][];
  ballotsUsed: number;
  ballotsDiscarded: number;
  /**
   * Every ballot's distance to the consensus of the others (0 = identical,
   * 100 = reversed, about 50 = random), ascending. Anonymous on purpose.
   */
  distances: number[];
};

type VoteCountOptions = {
  method: VoteCountMethod;
  /** Ballots farther than this from the others' consensus are dropped. */
  outlierThreshold?: number | null;
};

/** Ids that rank alike, in order, as contiguous runs of two or more. */
const groupTies = (
  order: string[],
  same: (a: string, b: string) => boolean,
) => {
  const groups: string[][] = [];
  let run: string[] = [];
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

const bordaScores = (ballots: Ballot[], participantIds: string[]) => {
  const scores: Record<string, number> = Object.fromEntries(
    participantIds.map((id) => [id, 0]),
  );
  for (const ballot of ballots) {
    const n = ballot.order.length;
    ballot.order.forEach((id, index) => {
      if (scores[id] === undefined) return;
      scores[id] += n - index;
    });
  }
  return scores;
};

/** Borda order over the given ballots; ties keep `participantIds` order. */
const bordaOrder = (ballots: Ballot[], participantIds: string[]) => {
  const scores = bordaScores(ballots, participantIds);
  return [...participantIds].sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0),
  );
};

const median = (values: number[]) => {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

const countBorda = (ballots: Ballot[], participantIds: string[]) => {
  const scores = bordaScores(ballots, participantIds);
  const order = [...participantIds].sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0),
  );
  return {
    order,
    scores,
    tieGroups: groupTies(order, (a, b) => scores[a] === scores[b]),
  };
};

const countMedian = (ballots: Ballot[], participantIds: string[]) => {
  const positions = new Map<string, number[]>(
    participantIds.map((id) => [id, []]),
  );
  for (const ballot of ballots) {
    ballot.order.forEach((id, index) => {
      positions.get(id)?.push(index + 1);
    });
  }
  const medians: Record<string, number> = {};
  const means: Record<string, number> = {};
  for (const [id, list] of positions) {
    medians[id] = median(list);
    means[id] =
      list.length === 0
        ? Number.POSITIVE_INFINITY
        : list.reduce((sum, value) => sum + value, 0) / list.length;
  }
  // Median first; the mean only splits equal medians.
  const order = [...participantIds].sort(
    (a, b) =>
      (medians[a] ?? 0) - (medians[b] ?? 0) ||
      (means[a] ?? 0) - (means[b] ?? 0),
  );
  return {
    order,
    scores: medians,
    tieGroups: groupTies(
      order,
      (a, b) => medians[a] === medians[b] && means[a] === means[b],
    ),
  };
};

/**
 * Pairwise margins: how many ballots put `a` above `b`, counting only
 * ballots whose voter is neither of the two and that rank both.
 */
const duelMargins = (ballots: Ballot[], participantIds: string[]) => {
  const index = new Map(participantIds.map((id, i) => [id, i]));
  const n = participantIds.length;
  const above = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const ballot of ballots) {
    const voter = index.get(ballot.voterId);
    const ranked = ballot.order
      .map((id) => index.get(id))
      .filter((i): i is number => i !== undefined);
    for (let x = 0; x < ranked.length; x++) {
      for (let y = x + 1; y < ranked.length; y++) {
        const a = ranked[x] as number;
        const b = ranked[y] as number;
        if (a === voter || b === voter) continue;
        (above[a] as number[])[b] = ((above[a] as number[])[b] ?? 0) + 1;
      }
    }
  }
  return { index, above };
};

const countDuels = (ballots: Ballot[], participantIds: string[]) => {
  const { index, above } = duelMargins(ballots, participantIds);
  /** 1 for a won duel, ½ for a drawn one, 0 for a lost one. */
  const duel = (a: string, b: string) => {
    const i = index.get(a) ?? 0;
    const j = index.get(b) ?? 0;
    const forA = above[i]?.[j] ?? 0;
    const forB = above[j]?.[i] ?? 0;
    return forA > forB ? 1 : forA === forB ? 0.5 : 0;
  };
  const scores: Record<string, number> = {};
  for (const a of participantIds) {
    scores[a] = participantIds
      .filter((b) => b !== a)
      .reduce((sum, b) => sum + duel(a, b), 0);
  }
  // Equal duel counts: the duels among the tied players decide (for two,
  // their head-to-head).
  const byScore = new Map<number, string[]>();
  for (const id of participantIds) {
    const key = scores[id] ?? 0;
    byScore.set(key, [...(byScore.get(key) ?? []), id]);
  }
  const inner: Record<string, number> = {};
  for (const group of byScore.values()) {
    for (const a of group) {
      inner[a] = group
        .filter((b) => b !== a)
        .reduce((sum, b) => sum + duel(a, b), 0);
    }
  }
  const order = [...participantIds].sort(
    (a, b) =>
      (scores[b] ?? 0) - (scores[a] ?? 0) || (inner[b] ?? 0) - (inner[a] ?? 0),
  );
  return {
    order,
    scores,
    tieGroups: groupTies(
      order,
      (a, b) => scores[a] === scores[b] && inner[a] === inner[b],
    ),
  };
};

/**
 * Normalised Kendall distance between two orders over the ids they share:
 * the share of pairs they disagree on, 0–100.
 */
const orderDistance = (order: string[], reference: string[]) => {
  const position = new Map(reference.map((id, i) => [id, i]));
  const shared = order.filter((id) => position.has(id));
  let pairs = 0;
  let discordant = 0;
  for (let x = 0; x < shared.length; x++) {
    for (let y = x + 1; y < shared.length; y++) {
      pairs += 1;
      const a = position.get(shared[x] as string) ?? 0;
      const b = position.get(shared[y] as string) ?? 0;
      if (a > b) discordant += 1;
    }
  }
  return pairs === 0 ? 0 : Math.round((discordant / pairs) * 1000) / 10;
};

/** Each ballot against the Borda consensus of all the other ballots. */
const ballotDistances = (ballots: Ballot[], participantIds: string[]) =>
  ballots.map((ballot) => {
    const others = ballots.filter((other) => other !== ballot);
    const consensus = bordaOrder(
      others,
      participantIds.filter((id) => id !== ballot.voterId),
    );
    return orderDistance(ballot.order, consensus);
  });

/** Counts the ballots with the chosen method, dropping outliers first. */
const countVotes = (
  ballots: Ballot[],
  participantIds: string[],
  options: VoteCountOptions,
): VoteCount => {
  const distances = ballotDistances(ballots, participantIds);
  const threshold = options.outlierThreshold;
  const kept =
    threshold === null || threshold === undefined
      ? ballots
      : ballots.filter((_, i) => (distances[i] ?? 0) <= threshold);
  const counted =
    options.method === 'median'
      ? countMedian(kept, participantIds)
      : options.method === 'duels'
        ? countDuels(kept, participantIds)
        : countBorda(kept, participantIds);
  return {
    method: options.method,
    ...counted,
    ballotsUsed: kept.length,
    ballotsDiscarded: ballots.length - kept.length,
    distances: [...distances].sort((a, b) => a - b),
  };
};

export {
  countVotes,
  groupTies,
  orderDistance,
  type VoteCount,
  type VoteCountMethod,
  type VoteCountOptions,
};
