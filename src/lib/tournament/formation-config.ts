import { z } from 'zod';

import type { PotGroup } from '@/lib/tournament/pot-groups';

/**
 * Every formation option that isn't one of the tournament's original
 * columns, kept as one JSON value so new options don't need migrations.
 * Unknown or missing keys fall back to the defaults, which reproduce what
 * the app did before the option existed.
 */
const VOTE_COUNTS = ['borda', 'median', 'duels'] as const;
const POT_TIEBREAKS = ['alphabetical', 'latest_ring', 'draw'] as const;
const POT_LAYOUTS = [
  'ranking',
  'criterion_ranking',
  'criterion_market',
  'market',
] as const;
const POT_CRITERIA = ['no_team_ring', 'no_ring'] as const;
const CRITERION_SURPLUSES = [
  'best_out',
  'worst_out',
  'draw_out',
  'double',
] as const;
const CRITERION_SHORTAGES = ['fill_worst', 'fill_best', 'leave_short'] as const;
const CAPTAIN_SOURCES = ['pot', 'volunteers', 'criterion'] as const;
const VOLUNTEER_WINDOWS = ['before_ranking', 'after_ranking'] as const;
const VOLUNTEER_SURPLUSES = ['ranking', 'draw'] as const;

/** The options as an admin sets them: strict, every key optional. */
const formationConfigPatchSchema = z
  .object({
    /** How the ballots are counted (vote and combined sources). */
    voteCount: z.enum(VOTE_COUNTS),
    /** Ballots farther than this (0–100) from the others are dropped; null = keep all. */
    voteOutlierThreshold: z.number().min(0).max(100).nullable(),
    /** How a tie that a pot cut runs through is broken. */
    potTiebreak: z.enum(POT_TIEBREAKS),
    /** How the pots are made: ranking chunks, a rule's pot, a free market. */
    potLayout: z.enum(POT_LAYOUTS),
    /** The rule for the rule's pot. */
    potCriterion: z.enum(POT_CRITERIA),
    /** More players meet the rule than there are teams. */
    criterionSurplus: z.enum(CRITERION_SURPLUSES),
    /** Fewer players meet the rule than there are teams. */
    criterionShortage: z.enum(CRITERION_SHORTAGES),
    /** Who the captains are: a pot, volunteers, or the rule's pot. */
    captainSource: z.enum(CAPTAIN_SOURCES),
    /** Volunteers sign up while the vote runs, or once the ranking is out. */
    volunteerWindow: z.enum(VOLUNTEER_WINDOWS),
    /** Too many volunteers: the best ranked go through, or a draw. */
    volunteerSurplus: z.enum(VOLUNTEER_SURPLUSES),
  })
  .partial();

/** The options as stored: anything unreadable falls back to its default. */
const formationConfigSchema = z.object({
  voteCount: z.enum(VOTE_COUNTS).catch('borda'),
  voteOutlierThreshold: z.number().min(0).max(100).nullable().catch(null),
  potTiebreak: z.enum(POT_TIEBREAKS).catch('alphabetical'),
  potLayout: z.enum(POT_LAYOUTS).catch('ranking'),
  potCriterion: z.enum(POT_CRITERIA).catch('no_team_ring'),
  criterionSurplus: z.enum(CRITERION_SURPLUSES).catch('best_out'),
  criterionShortage: z.enum(CRITERION_SHORTAGES).catch('fill_worst'),
  captainSource: z.enum(CAPTAIN_SOURCES).catch('pot'),
  volunteerWindow: z.enum(VOLUNTEER_WINDOWS).catch('before_ranking'),
  volunteerSurplus: z.enum(VOLUNTEER_SURPLUSES).catch('ranking'),
  /** Who said "I want to be captain"; written by the players themselves. */
  captainVolunteers: z.array(z.string()).catch([]),
});

type FormationConfig = z.infer<typeof formationConfigSchema>;
type FormationConfigPatch = z.infer<typeof formationConfigPatchSchema>;

const DEFAULT_FORMATION_CONFIG: FormationConfig = {
  voteCount: 'borda',
  voteOutlierThreshold: null,
  potTiebreak: 'alphabetical',
  potLayout: 'ranking',
  potCriterion: 'no_team_ring',
  criterionSurplus: 'best_out',
  criterionShortage: 'fill_worst',
  captainSource: 'pot',
  volunteerWindow: 'before_ranking',
  volunteerSurplus: 'ranking',
  captainVolunteers: [],
};

const parseFormationConfig = (value: unknown): FormationConfig => {
  const parsed = formationConfigSchema.partial().safeParse(value ?? {});
  const given = parsed.success ? parsed.data : {};
  return {
    ...DEFAULT_FORMATION_CONFIG,
    ...Object.fromEntries(
      Object.entries(given).filter(([, entry]) => entry !== undefined),
    ),
  };
};

/**
 * What the ranking step leaves behind besides the order itself: who is
 * tied, and how the vote was counted. Shown in the review and the reveal.
 */
type RankingMeta = {
  tieGroups: string[][];
  /** Score each player was ranked by, when it came from a count. */
  scores?: Record<string, number>;
  ballotsUsed?: number;
  ballotsDiscarded?: number;
  /** Ties at pot cuts and how they were broken (set when pots are dealt). */
  cutTies?: {
    players: string[];
    pots: number[];
    seats: number[];
    method: FormationConfig['potTiebreak'];
    ordered: string[];
    drawn: boolean;
  }[];
  /** What kind of group each pot is and its quota (set when pots are dealt). */
  groups?: PotGroup[];
  /** Volunteers' outcome: left out by surplus, or drafted to fill. */
  captainPick?: { leftOut: string[]; drafted: string[]; drawn: boolean };
  /**
   * The ranking is confirmed and public, and the pots wait for the
   * volunteers' window to close.
   */
  awaitingVolunteers?: boolean;
  /** The rule's pot: who left it (surplus) or was added (shortage). */
  criterionMoves?: { movedOut: string[]; filledIn: string[]; drawn: boolean };
};

/**
 * Whether players can sign up as captain now: before the ranking (while
 * the vote and its review run) or after it (once it's public and before
 * the pots are dealt), as configured.
 */
const volunteerWindowOpen = (
  stage: string,
  config: FormationConfig,
  meta: RankingMeta | null | undefined,
) => {
  if (config.captainSource !== 'volunteers') return false;
  if (config.volunteerWindow === 'before_ranking') {
    return stage === 'voting' || stage === 'ranking_review';
  }
  return stage === 'pots_review' && meta?.awaitingVolunteers === true;
};

export {
  CAPTAIN_SOURCES,
  CRITERION_SHORTAGES,
  CRITERION_SURPLUSES,
  DEFAULT_FORMATION_CONFIG,
  type FormationConfig,
  type FormationConfigPatch,
  formationConfigPatchSchema,
  formationConfigSchema,
  POT_CRITERIA,
  POT_LAYOUTS,
  POT_TIEBREAKS,
  parseFormationConfig,
  type RankingMeta,
  VOLUNTEER_SURPLUSES,
  VOLUNTEER_WINDOWS,
  VOTE_COUNTS,
  volunteerWindowOpen,
};
