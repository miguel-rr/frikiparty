import {
  Meeple,
  panel,
  RingGlyph,
  Section,
  SectionHeader,
  tag,
  td,
  th,
} from '@/app/design/_components/shared';
import { BRACKET, STANDINGS, TEAMS_BY_ID } from '@/app/design/fixtures';

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

const MatchRow = ({
  score,
  teamId,
  winner,
}: {
  score: number | null;
  teamId: string;
  winner: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
      winner
        ? 'bg-linear-to-r from-[#c9a5571f] to-transparent font-extrabold text-(--gold-hi)'
        : 'text-(--faded)'
    }`}
  >
    <TeamNames className="text-sm" teamId={teamId} />
    <span className="font-bold font-mono">{score ?? '–'}</span>
  </div>
);

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
              index < 4 ? 'bg-linear-to-r from-[#c9a5570d] to-transparent' : ''
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
      <table className="w-full min-w-[460px] border-collapse">
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
                  ? 'bg-linear-to-r from-[#c9a5570d] to-transparent'
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
    <p className="px-5 py-3.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
      Los cuatro primeros cruzan a semifinales
    </p>
  </div>
);

const CHAMPION_TEAM_ID = 'team-richar';

const Bracket = () => {
  const champions = TEAMS_BY_ID[CHAMPION_TEAM_ID];
  return (
    <div className={`${panel} flex flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair) border-b px-5 py-4">
        <h3 className="d-display font-bold text-lg uppercase">Eliminatorias</h3>
        <span className={tag}>Al mejor de 3</span>
      </div>
      <div className="overflow-x-auto p-5">
        <div className="grid min-w-[640px] auto-cols-fr grid-flow-col items-center gap-5">
          {BRACKET.map((round) => (
            <div className="flex flex-col gap-4" key={round.round}>
              <span className="text-center font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
                {round.round}
              </span>
              {round.matches.map((match) => {
                const decided = match.scoreA !== null && match.scoreB !== null;
                const aWins =
                  decided && (match.scoreA ?? 0) > (match.scoreB ?? 0);
                return (
                  <div
                    className="divide-y divide-(--hair) overflow-hidden rounded-lg border border-(--hair) bg-(--night-2)"
                    key={`${match.teamAId}-${match.teamBId}`}
                  >
                    <MatchRow
                      score={match.scoreA}
                      teamId={match.teamAId}
                      winner={decided && aWins}
                    />
                    <MatchRow
                      score={match.scoreB}
                      teamId={match.teamBId}
                      winner={decided && !aWins}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex flex-col items-center gap-3">
            <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
              Campeones
            </span>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-(--hair-gold) bg-linear-to-b from-[#c9a55721] to-transparent px-5 py-4 text-center">
              <Meeple color={champions?.color ?? '#8b969e'} size={26} />
              <span className="d-display d-gold-text font-black text-base uppercase leading-snug">
                {champions?.players.join(' · ')}
              </span>
              <RingGlyph size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
