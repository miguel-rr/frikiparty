'use client';

import { NoticeBoard } from '@/app/_components/notice-board';
import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { PlayerChip } from '@/components/tournament/player-chip';

const METHOD_LABELS: Record<string, string> = {
  random: 'Aleatorio total',
  'pots-random': 'Bombos + aleatorio',
  'pots-draft': 'Bombos + draft',
  'pots-auction': 'Bombos + subasta',
};

const SummaryStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const teams = state.teams ?? [];
  const methodLabel = state.teamFormationMethod
    ? (METHOD_LABELS[state.teamFormationMethod] ?? state.teamFormationMethod)
    : '';

  return (
    <div className="flex flex-col gap-6">
      <NoticeBoard title="EQUIPOS LISTOS">
        <div className="board flex flex-col gap-4 rounded-b-[5px] px-6 py-8 sm:px-11 sm:py-10">
          <p className="text-[#f4e6c6]/90 text-sm">
            Método: <span className="font-bold">{methodLabel}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((team) => (
              <div
                className="flex flex-col gap-2 rounded-lg bg-[rgba(0,0,0,0.25)] p-3"
                key={team.id}
              >
                <p className="font-bold text-[#f4e6c6] text-sm">{team.name}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {team.playerIds.map((playerId) => (
                    <li key={playerId}>
                      <PlayerChip name={getPlayerName(playerId)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </NoticeBoard>

      <div className="flex flex-wrap gap-3">
        {state.phases && state.phases.length > 0 ? (
          <button
            className="rounded-full bg-amber px-5 py-2.5 font-extrabold text-ground text-sm transition-opacity hover:opacity-90"
            onClick={() => {
              dispatch({ type: 'START_TOURNAMENT' });
              dispatch({ type: 'ADVANCE' });
            }}
            type="button"
          >
            Empezar torneo →
          </button>
        ) : (
          <p className="text-muted text-xs">
            La simulación de fases suizo todavía no está disponible.
          </p>
        )}
        <button
          className="rounded-full bg-panel-2 px-5 py-2.5 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
          onClick={() => dispatch({ type: 'RESET' })}
          type="button"
        >
          Volver a empezar
        </button>
      </div>
    </div>
  );
};

export { SummaryStep };
