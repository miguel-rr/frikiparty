'use client';

import { NoticeBoard } from '@/app/_components/notice-board';
import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { PlayerChip } from '@/components/tournament/player-chip';

const ChampionStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const champion = state.teams?.find((team) => team.id === state.champion);

  return (
    <div className="flex flex-col gap-6">
      <NoticeBoard title="TENEMOS CAMPEÓN">
        <div className="board flex flex-col items-center gap-4 rounded-b-[5px] px-6 py-10 sm:px-11">
          {champion ? (
            <>
              <p className="font-bold font-display text-3xl text-[#f4e6c6] uppercase tracking-tight">
                {champion.name}
              </p>
              <ul className="flex flex-wrap justify-center gap-1.5">
                {champion.playerIds.map((playerId) => (
                  <li key={playerId}>
                    <PlayerChip name={getPlayerName(playerId)} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[#f4e6c6]/90 text-sm">
              Sin campeón determinado.
            </p>
          )}
        </div>
      </NoticeBoard>

      <button
        className="self-start rounded-full bg-panel-2 px-5 py-2.5 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
        onClick={() => dispatch({ type: 'RESET' })}
        type="button"
      >
        Volver a empezar
      </button>
    </div>
  );
};

export { ChampionStep };
