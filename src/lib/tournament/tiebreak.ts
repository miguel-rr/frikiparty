/**
 * Group tie-break criteria (live plan §6.4), free of Drizzle imports so
 * the client can use them. The organiser orders the active ones per phase;
 * the automatic three resolve on their own, the last two need a hand.
 */
const GROUP_TIEBREAK_CRITERIA = [
  'head_to_head',
  'ranking_inverse',
  'rings_inverse',
  'draw',
  'tiebreak_match',
] as const;

type GroupTiebreakCriterion = (typeof GROUP_TIEBREAK_CRITERIA)[number];

const DEFAULT_TIEBREAK_CHAIN: GroupTiebreakCriterion[] = [
  'head_to_head',
  'ranking_inverse',
  'draw',
];

const TIEBREAK_LABELS: Record<GroupTiebreakCriterion, string> = {
  head_to_head: 'Enfrentamientos directos',
  ranking_inverse: 'Ranking inverso (el peor ranking, arriba)',
  rings_inverse: 'Anillos inversos (menos anillos, arriba)',
  draw: 'A suertes',
  tiebreak_match: 'Partido de desempate',
};

const MANUAL_CRITERIA: GroupTiebreakCriterion[] = ['draw', 'tiebreak_match'];

export {
  DEFAULT_TIEBREAK_CHAIN,
  GROUP_TIEBREAK_CRITERIA,
  type GroupTiebreakCriterion,
  MANUAL_CRITERIA,
  TIEBREAK_LABELS,
};
