import { BRACKET, STANDINGS, TEAMS_BY_ID } from '@/app/design/fixtures';
import {
  Meeple,
  panel,
  Section,
  SectionHeader,
  tag,
  td,
  th,
} from '@/components/theme/primitives';
import { BracketBoard } from '@/components/tournament/bracket-board';

/**
 * Teams have no names: a team IS its players (see .claude/core-logic.md).
 * Everywhere a team appears it is rendered as its member list plus its
 * board-game token color.
 */
const TeamNames = ({
  className = '',
  teamId,
}: {
  className?: string;
  teamId: string;
}) => {
  const team = TEAMS_BY_ID[teamId];
  if (!team) {
    return null;
  }
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Meeple color={team.color} />
      <span>{team.players.join(' · ')}</span>
    </span>
  );
};

const Standings = () => (
  <div className={`${panel} flex flex-col`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair) border-b px-5 py-4">
      <h3 className="d-display font-bold text-lg uppercase">Fase de grupos</h3>
      <span className={tag}>Jornada 4 de 4</span>
    </div>
    {/* Mobile: plain rows with the record inline — nothing hides offscreen */}
    <ul className="sm:hidden">
      {STANDINGS.map((row, index) => {
        const team = TEAMS_BY_ID[row.teamId];
        return (
          <li
            className={`flex items-center gap-2.5 border-(--hair) border-b px-4 py-3 ${
              index < 4 ? 'bg-linear-to-r from-(--gold)/5 to-transparent' : ''
            }`}
            key={row.teamId}
          >
            <span className="w-4 font-bold font-mono text-(--faded) text-sm">
              {index + 1}
            </span>
            <Meeple color={team?.color ?? '#8b969e'} />
            <span className="flex-1 font-bold text-sm leading-snug">
              {team?.players.join(' · ')}
            </span>
            <span className="font-bold font-mono text-sm">
              <span className="text-(--moss)">{row.wins}</span>
              <span className="text-(--faded)">–</span>
              <span className="text-(--ember)">{row.losses}</span>
            </span>
          </li>
        );
      })}
    </ul>
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-115 border-collapse">
        <thead>
          <tr>
            <th className={th}>Equipo</th>
            <th className={`${th} text-center`}>PJ</th>
            <th className={`${th} text-center`}>V</th>
            <th className={`${th} text-center`}>D</th>
          </tr>
        </thead>
        <tbody>
          {STANDINGS.map((row, index) => (
            <tr
              className={
                index < 4
                  ? 'bg-linear-to-r from-(--gold)/5 to-transparent'
                  : undefined
              }
              key={row.teamId}
            >
              <td className={td}>
                <span className="flex items-center gap-2.5 font-bold text-sm">
                  <span className="w-4 font-mono text-(--faded)">
                    {index + 1}
                  </span>
                  <TeamNames teamId={row.teamId} />
                </span>
              </td>
              <td
                className={`${td} text-center font-bold font-mono text-(--faded) text-sm`}
              >
                {row.played}
              </td>
              <td
                className={`${td} text-center font-bold font-mono text-(--moss) text-sm`}
              >
                {row.wins}
              </td>
              <td
                className={`${td} text-center font-bold font-mono text-(--ember) text-sm`}
              >
                {row.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="px-5 py-3.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl">
      Los cuatro primeros cruzan a semifinales
    </p>
  </div>
);

/** Colors follow the order teams enter the bracket, seeds first. */
const BRACKET_TEAM_IDS: string[] = [
  ...new Set(
    BRACKET.flatMap((round) =>
      round.matches.flatMap((match) => [match.teamAId, match.teamBId]),
    ),
  ),
];

/** The proposal's bracket is the shared board fed with the fixture data. */
const Bracket = () => (
  <BracketBoard
    rounds={BRACKET.map((round) => ({
      matches: round.matches.map((match) => ({
        id: `${match.teamAId}-${match.teamBId}`,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        winnerTeamId:
          (match.scoreA ?? 0) > (match.scoreB ?? 0)
            ? match.teamAId
            : match.teamBId,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
      })),
    }))}
    tagText="Al mejor de 3"
    teams={BRACKET_TEAM_IDS.map((teamId) => ({
      id: teamId,
      players: TEAMS_BY_ID[teamId]?.players ?? [],
      color: TEAMS_BY_ID[teamId]?.color,
    }))}
    title="Eliminatorias"
  />
);

const Contest = () => (
  <Section id="contest">
    <SectionHeader
      eyebrowText="Edición 2026 · En juego"
      lead="Liguilla y eliminatorias en directo: cualquiera puede seguir la contienda desde el móvil. Los equipos no llevan nombre — son sus jugadores."
      title="La Contienda"
    />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Standings />
      <Bracket />
    </div>
  </Section>
);

export { Contest, TeamNames };
