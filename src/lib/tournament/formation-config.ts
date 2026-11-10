import { z } from 'zod';

/**
 * Every formation option that isn't one of the tournament's original
 * columns, kept as one JSON value so new options don't need migrations.
 * Unknown or missing keys fall back to the defaults, which reproduce what
 * the app did before the option existed.
 */
const VOTE_COUNTS = ['borda', 'median', 'duels'] as const;
const POT_TIEBREAKS = ['alphabetical', 'latest_ring', 'draw'] as const;

/** The options as an admin sets them: strict, every key optional. */
const formationConfigPatchSchema = z
  .object({
    /** How the ballots are counted (vote and combined sources). */
    voteCount: z.enum(VOTE_COUNTS),
    /** Ballots farther than this (0–100) from the others are dropped; null = keep all. */
    voteOutlierThreshold: z.number().min(0).max(100).nullable(),
    /** How a tie that a pot cut runs through is broken. */
    potTiebreak: z.enum(POT_TIEBREAKS),
  })
  .partial();

/** The options as stored: anything unreadable falls back to its default. */
const formationConfigSchema = z.object({
  voteCount: z.enum(VOTE_COUNTS).catch('borda'),
  voteOutlierThreshold: z.number().min(0).max(100).nullable().catch(null),
  potTiebreak: z.enum(POT_TIEBREAKS).catch('alphabetical'),
});

type FormationConfig = z.infer<typeof formationConfigSchema>;
type FormationConfigPatch = z.infer<typeof formationConfigPatchSchema>;

const DEFAULT_FORMATION_CONFIG: FormationConfig = {
  voteCount: 'borda',
  voteOutlierThreshold: null,
  potTiebreak: 'alphabetical',
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
};

export {
  DEFAULT_FORMATION_CONFIG,
  type FormationConfig,
  type FormationConfigPatch,
  formationConfigPatchSchema,
  formationConfigSchema,
  POT_TIEBREAKS,
  parseFormationConfig,
  type RankingMeta,
  VOTE_COUNTS,
};
