/**
 * Live-module vocabulary shared by the schema, the server and the client
 * (kept free of Drizzle imports so client bundles can use it).
 */

type TournamentKind = 'team' | 'individual';

/** Ordered: the live flow only ever moves forward through these. */
const TOURNAMENT_STAGES = [
  'setup',
  'voting',
  'ranking_review',
  'pots_review',
  'formation',
  'teams_ready',
  'phase_setup',
  'in_progress',
  'completed',
] as const;

type TournamentStage = (typeof TOURNAMENT_STAGES)[number];

type RankingSource = 'historical' | 'vote' | 'combined';

type FormationMethod = 'random' | 'pots_random' | 'draft' | 'auction';

export {
  type FormationMethod,
  type RankingSource,
  TOURNAMENT_STAGES,
  type TournamentKind,
  type TournamentStage,
};
