/**
 * The faction draw for a game (live plan §6.7–§6.8), pure and replayable.
 *
 * Each team draws as many factions as it has players, never repeating one
 * within the draw. With `poolMode = 'depleting'` a team's pool starts with
 * every faction and each draw consumes what it took; when fewer remain
 * than the team needs, the remainder is taken, the pool refills with
 * everything but that remainder, and the rest of the draw comes from the
 * fresh pool — so every faction is played once per cycle before any repeats.
 * The pool is never stored: it is derived from the team's draw history.
 *
 * With `allowRepeatAcrossTeams = false` the team with fewer factions left
 * draws first and the other excludes what the first took; if the exclusion
 * leaves too few, it is relaxed only for what is missing (`relaxed`).
 */

type PoolMode = 'fresh' | 'depleting';

/** Fisher–Yates with an injectable source, so draws can be replayed. */
const shuffle = <T>(items: T[], rng: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

type DrawRules = {
  poolMode: PoolMode;
  allowRepeatAcrossTeams: boolean;
};

type TeamDrawInput = {
  teamId: string;
  /** Factions this draw hands out: one per player. */
  size: number;
  /** Every earlier draw of this team in the pool's scope, oldest first. */
  history: string[][];
};

type DrawResult = {
  factionIds: string[];
  /** The exclusion between teams could not be fully honoured. */
  relaxed: boolean;
};

/** What a team can still draw from, after replaying its history with the refill rule. */
const remainingPool = (all: string[], history: string[][]): string[] => {
  let pool = [...all];
  for (const draw of history) {
    if (draw.length === 0) continue;
    if (pool.length >= draw.length) {
      pool = pool.filter((id) => !draw.includes(id));
      continue;
    }
    // Refill happened mid-draw: the leftovers went first, then the rest
    // came from a fresh pool without those leftovers.
    const leftovers = pool;
    const fresh = all.filter((id) => !leftovers.includes(id));
    pool = fresh.filter((id) => !draw.includes(id));
  }
  return pool;
};

/** Games a team can play before its pool cycles (factions ÷ players). */
const drawsPerCycle = (factionCount: number, teamSize: number) =>
  teamSize <= 0 ? 0 : Math.floor(factionCount / teamSize);

/**
 * Draws `size` factions for one team from its pool, refilling as §6.8
 * says. `exclude` are the other team's factions this draw should avoid;
 * they are dropped one by one only if nothing else is left.
 */
const drawForTeam = (
  all: string[],
  team: TeamDrawInput,
  rules: DrawRules,
  exclude: string[],
  rng: () => number,
): DrawResult => {
  if (team.size <= 0) return { factionIds: [], relaxed: false };
  const base =
    rules.poolMode === 'depleting'
      ? remainingPool(all, team.history)
      : [...all];
  const picks: string[] = [];
  let relaxed = false;
  const take = (from: string[], count: number) => {
    const allowed = from.filter(
      (id) => !picks.includes(id) && !exclude.includes(id),
    );
    let chosen = shuffle(allowed, rng).slice(0, count);
    if (chosen.length < count) {
      // Not enough outside the exclusion: relax it for what is missing.
      const fallback = shuffle(
        from.filter((id) => !picks.includes(id) && !chosen.includes(id)),
        rng,
      ).slice(0, count - chosen.length);
      if (fallback.length > 0) relaxed = true;
      chosen = [...chosen, ...fallback];
    }
    picks.push(...chosen);
    return chosen.length;
  };
  if (rules.poolMode !== 'depleting' || base.length >= team.size) {
    take(base, team.size);
    return { factionIds: picks, relaxed };
  }
  // Fewer left than needed: the leftovers, then a refilled pool.
  const leftovers = base;
  const tookLeft = take(leftovers, leftovers.length);
  const fresh = all.filter((id) => !leftovers.includes(id));
  take(fresh, team.size - tookLeft);
  return { factionIds: picks, relaxed };
};

/** Both teams' draws for one game. */
const drawFactions = (
  all: string[],
  a: TeamDrawInput,
  b: TeamDrawInput,
  rules: DrawRules,
  rng: () => number = Math.random,
): { a: DrawResult; b: DrawResult; order: [string, string] } => {
  if (all.length === 0)
    return {
      a: { factionIds: [], relaxed: false },
      b: { factionIds: [], relaxed: false },
      order: [a.teamId, b.teamId],
    };
  if (rules.allowRepeatAcrossTeams) {
    return {
      a: drawForTeam(all, a, rules, [], rng),
      b: drawForTeam(all, b, rules, [], rng),
      order: [a.teamId, b.teamId],
    };
  }
  // The team with fewer factions left draws first (§6.8).
  const leftA =
    rules.poolMode === 'depleting'
      ? remainingPool(all, a.history).length
      : all.length;
  const leftB =
    rules.poolMode === 'depleting'
      ? remainingPool(all, b.history).length
      : all.length;
  const [first, second] = leftB < leftA ? [b, a] : [a, b];
  const firstDraw = drawForTeam(all, first, rules, [], rng);
  const secondDraw = drawForTeam(all, second, rules, firstDraw.factionIds, rng);
  return first.teamId === a.teamId
    ? { a: firstDraw, b: secondDraw, order: [a.teamId, b.teamId] }
    : { a: secondDraw, b: firstDraw, order: [b.teamId, a.teamId] };
};

export {
  type DrawResult,
  type DrawRules,
  drawFactions,
  drawsPerCycle,
  type PoolMode,
  remainingPool,
  type TeamDrawInput,
};
