import { Meeple, panel, RingGlyph, tag } from '@/components/theme/primitives';

/**
 * Knockout board: one column per round, the champions column last. Teams
 * have no names (see .claude/core-logic.md), so each side is its players
 * plus its board-game token color. A match with no partida record shows a
 * dash instead of a score and still marks its winner — historical editions
 * often remember who went through but not by how much.
 */

/** `color` overrides the palette when the caller already has one per team. */
type BracketTeam = { id: string; players: (string | null)[]; color?: string };

type BracketMatch = {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  scoreA: number | null;
  scoreB: number | null;
};

type BracketRound = { matches: BracketMatch[] };

/** Meeple colors, assigned by the order the teams come in. */
const TEAM_COLORS = [
  '#d9b34a',
  '#7fb08d',
  '#9a7fc0',
  '#c65a4a',
  '#5a8fc0',
  '#c9825a',
  '#8db0c0',
  '#b07f9a',
];

/** Rounds are named from the end: the last one is always the final. */
const ROUND_LABELS = [
  'Final',
  'Semifinales',
  'Cuartos de final',
  'Octavos de final',
];

const roundLabel = (roundsFromEnd: number) =>
  ROUND_LABELS[roundsFromEnd] ?? `Ronda ${roundsFromEnd + 1}`;

const teamPlayers = (team: BracketTeam | undefined) =>
  (team?.players ?? []).map((name) => name ?? 'Desconocido').join(' · ');

const TeamSide = ({
  color,
  team,
  score,
  winner,
}: {
  color: string;
  team: BracketTeam | undefined;
  score: number | null;
  winner: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
      winner
        ? 'bg-linear-to-r from-(--gold)/12 to-transparent font-extrabold text-(--gold-hi)'
        : 'text-(--faded)'
    }`}
  >
    <span className="flex items-center gap-2.5 text-sm">
      <Meeple color={color} />
      <span>{team ? teamPlayers(team) : 'Por determinar'}</span>
    </span>
    <span className="font-bold font-mono">{score ?? '–'}</span>
  </div>
);

const BracketBoard = ({
  footer,
  rounds,
  showChampions = true,
  teams,
  title,
  tagText,
}: {
  footer?: string;
  rounds: BracketRound[];
  /** Off when a champions banner already crowns the page (redundant). */
  showChampions?: boolean;
  teams: BracketTeam[];
  title?: string;
  tagText?: string;
}) => {
  const colorById = new Map(
    teams.map((team, index) => [
      team.id,
      team.color ?? (TEAM_COLORS[index % TEAM_COLORS.length] as string),
    ]),
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const lastRound = rounds.at(-1);
  const championId = lastRound?.matches[0]?.winnerTeamId ?? null;
  const champions = championId ? teamById.get(championId) : undefined;

  return (
    <div className={`${panel} flex flex-col`}>
      {title || tagText ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair) border-b px-5 py-4">
          {title ? (
            <h3 className="d-display font-bold text-lg uppercase">{title}</h3>
          ) : null}
          {tagText ? <span className={tag}>{tagText}</span> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto p-5">
        <div className="grid min-w-160 auto-cols-fr grid-flow-col items-center gap-5">
          {rounds.map((round, index) => (
            <div
              className="flex flex-col gap-4"
              key={roundLabel(rounds.length - 1 - index)}
            >
              <span className="text-center font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                {roundLabel(rounds.length - 1 - index)}
              </span>
              {round.matches.map((match) => (
                <div
                  className="divide-y divide-(--hair) overflow-hidden rounded-lg border border-(--hair) bg-(--night-2)"
                  key={match.id}
                >
                  <TeamSide
                    color={colorById.get(match.teamAId ?? '') ?? '#8b969e'}
                    score={match.scoreA}
                    team={teamById.get(match.teamAId ?? '')}
                    winner={
                      match.winnerTeamId !== null &&
                      match.winnerTeamId === match.teamAId
                    }
                  />
                  <TeamSide
                    color={colorById.get(match.teamBId ?? '') ?? '#8b969e'}
                    score={match.scoreB}
                    team={teamById.get(match.teamBId ?? '')}
                    winner={
                      match.winnerTeamId !== null &&
                      match.winnerTeamId === match.teamBId
                    }
                  />
                </div>
              ))}
            </div>
          ))}
          {showChampions && champions ? (
            <div className="flex flex-col items-center gap-3">
              <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                Campeones
              </span>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-(--hair-gold) bg-linear-to-b from-(--gold)/13 to-transparent px-5 py-4 text-center">
                <Meeple
                  color={colorById.get(champions.id) ?? '#8b969e'}
                  size={26}
                />
                <span className="d-display d-gold-text font-black text-base uppercase leading-snug">
                  {teamPlayers(champions)}
                </span>
                <RingGlyph size={16} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {footer ? (
        <p className="border-(--hair) border-t px-5 py-3.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {footer}
        </p>
      ) : null}
    </div>
  );
};

export { BracketBoard, type BracketMatch, type BracketRound, type BracketTeam };
