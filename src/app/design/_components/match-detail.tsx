import { TeamNames } from '@/app/design/_components/contest';
import { FACTIONS, type FactionId } from '@/app/design/_components/factions';
import { RANK_MOTIFS } from '@/app/design/_components/honor-podium';
import {
  Meeple,
  panel,
  Section,
  SectionHeader,
  tag,
} from '@/app/design/_components/shared';
import { MATCH_DETAIL, TEAMS_BY_ID } from '@/app/design/fixtures';

/**
 * Drill-down of one partido: its partidas, one per row. Each side shows the
 * team's players and the Age of the Ring faction they fielded. A partida has
 * no score (always 1-0), so victory speaks visually: the winning side burns
 * gold with a laurel; the losing side dims out.
 */

const FactionEmblem = ({ id, size = 44 }: { id: FactionId; size?: number }) => (
  <svg
    aria-hidden="true"
    className="flex-none"
    height={size}
    viewBox="0 0 512 512"
    width={size}
  >
    <path d={FACTIONS[id].emblem} fill="url(#dsn-blazon-emblem)" />
  </svg>
);

/** Victory laurels (the podium's laurel motif, struck in gold). */
const VictoryLaurel = ({ mirrored }: { mirrored: boolean }) => (
  <svg
    aria-hidden="true"
    className={`absolute -top-2.5 size-7 drop-shadow-[0_0_8px_rgba(201,165,87,0.6)] ${
      mirrored ? '-left-2.5' : '-right-2.5'
    }`}
    viewBox="0 0 512 512"
  >
    <title>Vencedor de la partida</title>
    <path d={RANK_MOTIFS.bronze} fill="url(#dsn-blazon-rim)" />
  </svg>
);

/**
 * One team's side of a partida: every player with the faction THEY fielded
 * (factions belong to players, not teams — see .claude/core-logic.md).
 */
const FactionSide = ({
  factions,
  mirrored = false,
  players,
  winner,
}: {
  factions: readonly string[];
  mirrored?: boolean;
  players: string[];
  winner: boolean;
}) => (
  <div
    className={`relative rounded-lg border p-4 ${
      winner
        ? `border-(--gold) shadow-[0_0_16px_rgba(201,165,87,0.14)] ${
            mirrored
              ? 'bg-linear-to-l from-[#c9a55724] to-transparent'
              : 'bg-linear-to-r from-[#c9a55724] to-transparent'
          }`
        : 'border-(--hair) bg-(--night-2) opacity-55 saturate-50'
    }`}
  >
    {winner ? <VictoryLaurel mirrored={mirrored} /> : null}
    <ul className="flex flex-col gap-2">
      {players.map((player, index) => {
        const factionId = (factions[index] ?? 'gondor') as FactionId;
        return (
          <li
            className={`flex items-center justify-between gap-3 ${
              mirrored ? 'sm:flex-row-reverse' : ''
            }`}
            key={player}
          >
            <span className="font-bold text-sm">{player}</span>
            <span
              className={`flex items-center gap-1.5 ${
                mirrored ? 'sm:flex-row-reverse' : ''
              }`}
            >
              <span className="font-bold font-mono text-(--gold) text-[0.58rem] uppercase tracking-[0.15em]">
                {FACTIONS[factionId].name}
              </span>
              <FactionEmblem id={factionId} size={20} />
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

const MatchDetail = () => {
  const teamA = TEAMS_BY_ID[MATCH_DETAIL.teamAId];
  const teamB = TEAMS_BY_ID[MATCH_DETAIL.teamBId];
  return (
    <Section id="match">
      <SectionHeader
        eyebrowText="La Contienda · Al detalle"
        lead="Dentro de cada cruce, sus partidas: cada jugador con la facción de Age of the Ring que llevó, y quién se llevó cada una. Sin marcadores — el laurel señala al vencedor."
        title="El Partido"
      />
      <div className={`${panel} flex flex-col`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-(--hair) border-b px-5 py-4">
          <div className="flex flex-col gap-2 font-bold text-sm">
            <TeamNames teamId={MATCH_DETAIL.teamAId} />
            <TeamNames teamId={MATCH_DETAIL.teamBId} />
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <span className={tag}>
              {MATCH_DETAIL.stage} · {MATCH_DETAIL.bestOfLabel}
            </span>
            <span
              aria-label="Vencedores de cada partida"
              className="flex items-center gap-1.5"
              role="img"
            >
              {MATCH_DETAIL.partidas.map((partida, index) => (
                <Meeple
                  color={
                    (partida.winner === 'A' ? teamA?.color : teamB?.color) ??
                    '#8b969e'
                  }
                  key={`pip-${String(index)}`}
                  size={14}
                />
              ))}
            </span>
          </div>
        </div>
        <ol className="flex flex-col gap-8 p-5 sm:gap-4">
          {MATCH_DETAIL.partidas.map((partida, index) => (
            <li
              className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
              key={`partida-${String(index)}`}
            >
              <FactionSide
                factions={partida.factionsA}
                players={teamA?.players ?? []}
                winner={partida.winner === 'A'}
              />
              {/* Mobile: header of the pair (rules either side); sm+: center column */}
              <div className="order-first flex items-center justify-center gap-3 font-bold font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.2em] sm:order-none sm:w-16 sm:flex-col sm:gap-1">
                <span
                  aria-hidden
                  className="h-px flex-1 bg-(--hair) sm:hidden"
                />
                <span>Partida</span>
                <span className="text-(--gold) text-sm">{index + 1}</span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-(--hair) sm:hidden"
                />
              </div>
              <FactionSide
                factions={partida.factionsB}
                mirrored
                players={teamB?.players ?? []}
                winner={partida.winner === 'B'}
              />
            </li>
          ))}
        </ol>
        <p className="border-(--hair) border-t px-5 py-3.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
          Cada partida se juega a una: el laurel corona al bando vencedor
        </p>
      </div>
    </Section>
  );
};

export { MatchDetail };
