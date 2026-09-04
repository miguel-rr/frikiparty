import { shuffle } from '@/lib/tournament/ranking';
import type { GroupTiebreakCriterion } from '@/lib/tournament/tiebreak';

/**
 * Pure scheduling for the live module (plan §6.4–§6.6): round-robin
 * jornadas, group distribution, bracket trees with play-in (never byes),
 * swiss pairings and group standings with the ordered tie-break chain.
 * Nothing here touches the database; ids are whatever the caller passes.
 */

type Pairing = { teamAId: string; teamBId: string; leg: number };

type Jornada = {
  /** 1-based. */
  roundIndex: number;
  pairings: Pairing[];
  /** The team sitting this jornada out (odd counts). */
  restingTeamId: string | null;
};

/**
 * Circle method: every team meets every other once per leg; with an odd
 * count a phantom seat makes someone rest each jornada. The second leg
 * repeats the first with sides swapped.
 */
const roundRobinSchedule = (
  teamIds: string[],
  rounds: 'single' | 'double',
): Jornada[] => {
  const seats: (string | null)[] = [...teamIds];
  if (seats.length % 2 === 1) seats.push(null);
  const n = seats.length;
  const jornadas: Jornada[] = [];
  const rotating = seats.slice(1);
  for (let round = 0; round < n - 1; round += 1) {
    const order = [seats[0], ...rotating];
    const pairings: Pairing[] = [];
    let resting: string | null = null;
    for (let i = 0; i < n / 2; i += 1) {
      const a = order[i] ?? null;
      const b = order[n - 1 - i] ?? null;
      if (a === null || b === null) {
        resting = a ?? b;
        continue;
      }
      // Alternate who is listed first so nobody is always "home".
      pairings.push(
        round % 2 === 0
          ? { teamAId: a, teamBId: b, leg: 1 }
          : { teamAId: b, teamBId: a, leg: 1 },
      );
    }
    jornadas.push({ roundIndex: round + 1, pairings, restingTeamId: resting });
    rotating.unshift(rotating.pop() ?? null);
  }
  if (rounds === 'double') {
    const firstLeg = [...jornadas];
    for (const jornada of firstLeg) {
      jornadas.push({
        roundIndex: jornada.roundIndex + firstLeg.length,
        pairings: jornada.pairings.map((p) => ({
          teamAId: p.teamBId,
          teamBId: p.teamAId,
          leg: 2,
        })),
        restingTeamId: jornada.restingTeamId,
      });
    }
  }
  return jornadas;
};

/**
 * Teams ordered best first for seeding: by their captain's place in the
 * tournament ranking (the captains are the cabezas de serie), then by the
 * average place of the whole roster.
 */
const teamRankOrder = (
  teams: { id: string; members: { playerId: string; isCaptain: boolean }[] }[],
  ranking: string[],
): string[] => {
  const place = (playerId: string) => {
    const index = ranking.indexOf(playerId);
    return index === -1 ? ranking.length : index;
  };
  const key = (team: (typeof teams)[number]) => {
    const captain = team.members.find((m) => m.isCaptain);
    const average =
      team.members.reduce((sum, m) => sum + place(m.playerId), 0) /
      (team.members.length || 1);
    return {
      captain: captain ? place(captain.playerId) : ranking.length,
      average,
    };
  };
  return [...teams]
    .sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka.captain - kb.captain || ka.average - kb.average;
    })
    .map((team) => team.id);
};

/** Groups by pure draw, or serpentine by seed so each group is balanced. */
const distributeGroups = (
  seededTeamIds: string[],
  groupCount: number,
  method: 'random' | 'snake',
): string[][] => {
  const groups: string[][] = Array.from(
    { length: Math.max(1, groupCount) },
    () => [],
  );
  const order = method === 'random' ? shuffle(seededTeamIds) : seededTeamIds;
  order.forEach((teamId, index) => {
    const cycle = Math.floor(index / groups.length);
    const position = index % groups.length;
    const groupIndex =
      method === 'snake' && cycle % 2 === 1
        ? groups.length - 1 - position
        : position;
    groups[groupIndex]?.push(teamId);
  });
  return groups;
};

type PlannedMatch = {
  /** Local id, replaced by the database's on insert. */
  key: string;
  roundIndex: number;
  order: number;
  teamAId: string | null;
  teamBId: string | null;
  feederAKey: string | null;
  feederBKey: string | null;
  isThirdPlace: boolean;
};

/**
 * Bracket from seeds (best first): 1 vs last within the largest power of
 * two, and when the count isn't one, the bottom `2 × excess` seeds open with
 * a play-in round (round 0) whose winners take the lowest lines. Never
 * byes. Optional third-place match fed by the semifinals' losers.
 */
const buildBracketPlan = (
  seededTeamIds: string[],
  options: { thirdPlace: boolean },
): PlannedMatch[] => {
  const n = seededTeamIds.length;
  const target = n <= 1 ? 1 : 2 ** Math.floor(Math.log2(n));
  const excess = n - target;
  const matches: PlannedMatch[] = [];
  const slotTeam: (string | null)[] = new Array(target + 1).fill(null);
  const slotFeeder: (string | null)[] = new Array(target + 1).fill(null);
  let counter = 0;
  const nextKey = () => {
    counter += 1;
    return `m${counter}`;
  };

  if (excess > 0) {
    const playIn = seededTeamIds.slice(target - excess);
    for (let i = 0; i < excess; i += 1) {
      const key = nextKey();
      matches.push({
        key,
        roundIndex: 0,
        order: i + 1,
        teamAId: playIn[2 * i] ?? null,
        teamBId: playIn[2 * i + 1] ?? null,
        feederAKey: null,
        feederBKey: null,
        isThirdPlace: false,
      });
      slotFeeder[target - excess + 1 + i] = key;
    }
    for (let seed = 1; seed <= target - excess; seed += 1) {
      slotTeam[seed] = seededTeamIds[seed - 1] ?? null;
    }
  } else {
    for (let seed = 1; seed <= target; seed += 1) {
      slotTeam[seed] = seededTeamIds[seed - 1] ?? null;
    }
  }

  let roundKeys: string[] = [];
  for (let seed = 1; seed <= target / 2; seed += 1) {
    const other = target + 1 - seed;
    const key = nextKey();
    matches.push({
      key,
      roundIndex: 1,
      order: seed,
      teamAId: slotTeam[seed] ?? null,
      teamBId: slotTeam[other] ?? null,
      feederAKey: slotTeam[seed] ? null : (slotFeeder[seed] ?? null),
      feederBKey: slotTeam[other] ? null : (slotFeeder[other] ?? null),
      isThirdPlace: false,
    });
    roundKeys.push(key);
  }
  let round = 2;
  while (roundKeys.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < roundKeys.length; i += 2) {
      const key = nextKey();
      matches.push({
        key,
        roundIndex: round,
        order: i / 2 + 1,
        teamAId: null,
        teamBId: null,
        feederAKey: roundKeys[i] ?? null,
        feederBKey: roundKeys[i + 1] ?? null,
        isThirdPlace: false,
      });
      next.push(key);
    }
    roundKeys = next;
    round += 1;
  }
  const finalRound = round - 1;
  const semis = matches.filter(
    (m) => m.roundIndex === finalRound - 1 && !m.isThirdPlace,
  );
  if (options.thirdPlace && semis.length === 2) {
    matches.push({
      key: nextKey(),
      roundIndex: finalRound,
      order: 2,
      teamAId: null,
      teamBId: null,
      feederAKey: semis[0]?.key ?? null,
      feederBKey: semis[1]?.key ?? null,
      isThirdPlace: true,
    });
  }
  return matches;
};

/** Total rounds a bracket of `n` teams needs, play-in excluded. */
const bracketRounds = (n: number) => (n <= 1 ? 0 : Math.floor(Math.log2(n)));

type SwissTeam = {
  id: string;
  wins: number;
  losses: number;
  opponents: string[];
};

/**
 * One swiss round: teams grouped by record, paired within the group by
 * the tournament's criterion (random / parity / seeded), avoiding
 * rematches where possible; an odd count draws who rests. Eliminated
 * teams (losses ≥ limit) don't play.
 */
const pairSwissRound = (
  teams: SwissTeam[],
  method: 'random' | 'ranking_parity' | 'ranking_seed',
  seedOrder: string[],
  eliminationLosses: number,
): {
  pairings: { teamAId: string; teamBId: string }[];
  byeTeamId: string | null;
} => {
  const alive = teams.filter((t) => t.losses < eliminationLosses);
  const seed = (id: string) => {
    const index = seedOrder.indexOf(id);
    return index === -1 ? seedOrder.length : index;
  };
  // Best record first, then by seed inside the record.
  const ordered = [...alive].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || seed(a.id) - seed(b.id),
  );
  let byeTeamId: string | null = null;
  let pool = ordered;
  if (pool.length % 2 === 1) {
    const candidates = shuffle(pool);
    const bye = candidates[0];
    byeTeamId = bye?.id ?? null;
    pool = pool.filter((t) => t.id !== byeTeamId);
  }
  const pairings: { teamAId: string; teamBId: string }[] = [];
  const remaining = [...pool];
  while (remaining.length >= 2) {
    const first = remaining.shift();
    if (!first) break;
    const sameRecord = remaining.filter(
      (t) => t.wins === first.wins && t.losses === first.losses,
    );
    const bucket = sameRecord.length > 0 ? sameRecord : remaining;
    const fresh = bucket.filter((t) => !first.opponents.includes(t.id));
    const choices = fresh.length > 0 ? fresh : bucket;
    let partner: SwissTeam | undefined;
    if (method === 'random') partner = shuffle(choices)[0];
    else if (method === 'ranking_seed') partner = choices.at(-1);
    else partner = choices[0];
    if (!partner) break;
    remaining.splice(remaining.indexOf(partner), 1);
    pairings.push({ teamAId: first.id, teamBId: partner.id });
  }
  return { pairings, byeTeamId };
};

type StandingInput = {
  teamIds: string[];
  matches: {
    teamAId: string | null;
    teamBId: string | null;
    winnerTeamId: string | null;
    gamesA: number;
    gamesB: number;
  }[];
  chain: GroupTiebreakCriterion[];
  /** Team's ranking key: lower = better ranked (for `ranking_inverse`). */
  teamRankKey: (teamId: string) => number;
  teamRings: (teamId: string) => number;
  /** Manual resolutions already recorded (draw / tiebreak match), best first. */
  manual?: string[][];
};

type StandingRow = {
  teamId: string;
  position: number;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  /** The criterion that separated this row from the one above, if any. */
  separatedBy: GroupTiebreakCriterion | 'wins' | null;
  /** Still tied with these teams after the automatic criteria. */
  tiedWith: string[];
};

/**
 * Group standings: wins first, then the configured chain in order.
 * `head_to_head` compares the tied teams' mutual results, `ranking_inverse`
 * puts the worse-ranked roster above, `rings_inverse` the fewer rings.
 * `draw` and `tiebreak_match` are the organiser's: rows still tied after
 * the automatic criteria report `tiedWith` so the UI can ask.
 */
const computeStandings = (input: StandingInput): StandingRow[] => {
  const rows = new Map<string, StandingRow>(
    input.teamIds.map((teamId) => [
      teamId,
      {
        teamId,
        position: 0,
        played: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        separatedBy: null,
        tiedWith: [],
      },
    ]),
  );
  for (const match of input.matches) {
    if (!match.teamAId || !match.teamBId) continue;
    const a = rows.get(match.teamAId);
    const b = rows.get(match.teamBId);
    if (!a || !b) continue;
    a.gamesFor += match.gamesA;
    a.gamesAgainst += match.gamesB;
    b.gamesFor += match.gamesB;
    b.gamesAgainst += match.gamesA;
    if (!match.winnerTeamId) continue;
    a.played += 1;
    b.played += 1;
    if (match.winnerTeamId === match.teamAId) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }

  const headToHead = (ids: string[]) => {
    const wins = new Map(ids.map((id) => [id, 0]));
    for (const match of input.matches) {
      if (
        match.winnerTeamId &&
        match.teamAId &&
        match.teamBId &&
        ids.includes(match.teamAId) &&
        ids.includes(match.teamBId)
      ) {
        wins.set(match.winnerTeamId, (wins.get(match.winnerTeamId) ?? 0) + 1);
      }
    }
    return (id: string) => -(wins.get(id) ?? 0);
  };

  const manualKey = (id: string) => {
    for (const group of input.manual ?? []) {
      const index = group.indexOf(id);
      if (index !== -1) return index;
    }
    return Number.MAX_SAFE_INTEGER;
  };

  // Sort by wins, then resolve each tied cluster with the chain.
  const byWins = [...rows.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses,
  );
  const result: StandingRow[] = [];
  let index = 0;
  while (index < byWins.length) {
    const cluster = [byWins[index] as StandingRow];
    while (
      index + cluster.length < byWins.length &&
      (byWins[index + cluster.length] as StandingRow).wins ===
        cluster[0]?.wins &&
      (byWins[index + cluster.length] as StandingRow).losses ===
        cluster[0]?.losses
    ) {
      cluster.push(byWins[index + cluster.length] as StandingRow);
    }
    result.push(
      ...resolveCluster(
        cluster,
        input.chain,
        headToHead,
        input.teamRankKey,
        input.teamRings,
        manualKey,
      ),
    );
    index += cluster.length;
  }
  result.forEach((row, position) => {
    row.position = position + 1;
  });
  return result;
};

const resolveCluster = (
  cluster: StandingRow[],
  chain: GroupTiebreakCriterion[],
  headToHead: (ids: string[]) => (id: string) => number,
  rankKey: (id: string) => number,
  rings: (id: string) => number,
  manualKey: (id: string) => number,
): StandingRow[] => {
  if (cluster.length === 1) return cluster;
  const ids = cluster.map((row) => row.teamId);
  const keyFor = (
    criterion: GroupTiebreakCriterion,
  ): ((id: string) => number) | null => {
    switch (criterion) {
      case 'head_to_head':
        return headToHead(ids);
      case 'ranking_inverse':
        return (id) => -rankKey(id);
      case 'rings_inverse':
        return (id) => rings(id);
      case 'draw':
      case 'tiebreak_match':
        return manualKey;
      default:
        return null;
    }
  };
  for (const criterion of chain) {
    const key = keyFor(criterion);
    if (!key) continue;
    const sorted = [...cluster].sort((a, b) => key(a.teamId) - key(b.teamId));
    const distinct = new Set(sorted.map((row) => key(row.teamId))).size;
    if (distinct === 1) continue;
    // Split into sub-clusters by this key and recurse on each.
    const out: StandingRow[] = [];
    let i = 0;
    while (i < sorted.length) {
      const sub = [sorted[i] as StandingRow];
      while (
        i + sub.length < sorted.length &&
        key((sorted[i + sub.length] as StandingRow).teamId) ===
          key(sub[0]?.teamId ?? '')
      ) {
        sub.push(sorted[i + sub.length] as StandingRow);
      }
      const resolved = resolveCluster(
        sub,
        chain,
        headToHead,
        rankKey,
        rings,
        manualKey,
      );
      if (out.length > 0 && resolved[0]) resolved[0].separatedBy = criterion;
      out.push(...resolved);
      i += sub.length;
    }
    return out;
  }
  for (const row of cluster)
    row.tiedWith = ids.filter((id) => id !== row.teamId);
  return cluster;
};

export {
  bracketRounds,
  buildBracketPlan,
  computeStandings,
  distributeGroups,
  type Jornada,
  type Pairing,
  type PlannedMatch,
  pairSwissRound,
  roundRobinSchedule,
  type StandingRow,
  type SwissTeam,
  teamRankOrder,
};
