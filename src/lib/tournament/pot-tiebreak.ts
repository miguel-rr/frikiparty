import { shuffle } from '@/lib/tournament/ranking';

/**
 * How a tie that straddles a pot boundary is broken. Ties wholly inside
 * one pot don't matter for the pots and are left alone.
 * - `alphabetical`: by name (what the app always did).
 * - `latest_ring`: the most recent team ring goes higher; whatever stays
 *   level after that is drawn.
 * - `draw`: a live draw among the tied players.
 */
type PotTiebreak = 'alphabetical' | 'latest_ring' | 'draw';

/** A tie that a pot cut runs through. */
type CutTie = {
  players: string[];
  /** Pots (0-based) the tied run spreads over, top first. */
  pots: number[];
  /** How many of the run fall in each of those pots, same order. */
  seats: number[];
};

type TieResolution = CutTie & {
  method: PotTiebreak;
  /** The run as the tie-break left it, best first. */
  ordered: string[];
  /** Whether chance decided any part of it. */
  drawn: boolean;
};

type TiebreakContext = {
  names: Record<string, string>;
  /** Year of each player's latest team ring; null without one. */
  latestRingYear: Record<string, number | null>;
  random?: () => number;
};

/** The tied runs that a cut every `potSize` places goes through. */
const findCutTies = (
  order: string[],
  tieGroups: string[][],
  potSize: number,
): CutTie[] => {
  const position = new Map(order.map((id, i) => [id, i]));
  const ties: CutTie[] = [];
  for (const group of tieGroups) {
    const indices = group
      .map((id) => position.get(id))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b);
    const first = indices[0];
    const last = indices[indices.length - 1];
    if (first === undefined || last === undefined || potSize <= 0) continue;
    const firstPot = Math.floor(first / potSize);
    const lastPot = Math.floor(last / potSize);
    if (firstPot === lastPot) continue;
    const pots: number[] = [];
    const seats: number[] = [];
    for (let pot = firstPot; pot <= lastPot; pot++) {
      pots.push(pot);
      seats.push(indices.filter((i) => Math.floor(i / potSize) === pot).length);
    }
    ties.push({
      players: indices.map((i) => order[i] as string),
      pots,
      seats,
    });
  }
  return ties;
};

const shuffled = (ids: string[], random?: () => number) => {
  if (!random) return shuffle(ids);
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
  }
  return copy;
};

/** Orders one tied run with the chosen method. */
const breakTie = (
  players: string[],
  method: PotTiebreak,
  context: TiebreakContext,
): { ordered: string[]; drawn: boolean } => {
  if (method === 'alphabetical') {
    return {
      ordered: [...players].sort((a, b) =>
        (context.names[a] ?? '').localeCompare(context.names[b] ?? '', 'es'),
      ),
      drawn: false,
    };
  }
  if (method === 'draw') {
    return { ordered: shuffled(players, context.random), drawn: true };
  }
  // Latest ring first; equal years (or none) are drawn among themselves.
  const year = (id: string) => context.latestRingYear[id] ?? 0;
  const years = [...new Set(players.map(year))].sort((a, b) => b - a);
  let drawn = false;
  const ordered = years.flatMap((y) => {
    const level = players.filter((id) => year(id) === y);
    if (level.length < 2) return level;
    drawn = true;
    return shuffled(level, context.random);
  });
  return { ordered, drawn };
};

/**
 * Breaks every tie a pot cut goes through and returns the new order plus
 * what was decided, for the event log and the reveal.
 */
const resolveCutTies = (
  order: string[],
  tieGroups: string[][],
  potSize: number,
  method: PotTiebreak,
  context: TiebreakContext,
): { order: string[]; resolutions: TieResolution[] } => {
  const next = [...order];
  const resolutions: TieResolution[] = [];
  for (const tie of findCutTies(order, tieGroups, potSize)) {
    const { ordered, drawn } = breakTie(tie.players, method, context);
    const start = next.indexOf(tie.players[0] as string);
    next.splice(start, ordered.length, ...ordered);
    resolutions.push({ ...tie, method, ordered, drawn });
  }
  return { order: next, resolutions };
};

export {
  breakTie,
  type CutTie,
  findCutTies,
  type PotTiebreak,
  resolveCutTies,
  type TiebreakContext,
  type TieResolution,
};
