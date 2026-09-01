import { TeamNames } from '@/app/design/_components/contest';
import { MATCH_DETAIL, TEAMS_BY_ID } from '@/app/design/fixtures';
import {
  Meeple,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { type GameView, MatchPanel } from '@/components/tournament/match-games';
import type { FactionId } from '@/lib/tournament/factions';

/**
 * Drill-down of one partido: its partidas, one per row, rendered by the
 * shared MatchGames component (each player with the Age of the Ring faction
 * they fielded; the laurel crowns the winning side).
 */

const MatchDetail = () => {
  const teamA = TEAMS_BY_ID[MATCH_DETAIL.teamAId];
  const teamB = TEAMS_BY_ID[MATCH_DETAIL.teamBId];
  const games: GameView[] = MATCH_DETAIL.partidas.map((partida) => ({
    sideA: (teamA?.players ?? []).map((name, index) => ({
      name,
      faction: (partida.factionsA[index] ?? 'gondor') as FactionId,
    })),
    sideB: (teamB?.players ?? []).map((name, index) => ({
      name,
      faction: (partida.factionsB[index] ?? 'gondor') as FactionId,
    })),
    winner: partida.winner,
  }));
  return (
    <Section id="match">
      <SectionHeader
        eyebrowText="La Contienda · Al detalle"
        lead="Dentro de cada cruce, sus partidas: cada jugador con la facción de Age of the Ring que llevó, y quién se llevó cada una. Sin marcadores — el laurel señala al vencedor."
        title="El Partido"
      />
      <MatchPanel
        games={games}
        header={
          <div className="flex flex-wrap items-center justify-between gap-4">
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
        }
      />
    </Section>
  );
};

export { MatchDetail };
