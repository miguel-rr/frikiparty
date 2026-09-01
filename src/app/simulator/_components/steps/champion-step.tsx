'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { StepPanel } from '@/app/simulator/_components/ui/step-panel';
import { btn, RingGlyph } from '@/components/theme/primitives';
import { PlayerChip } from '@/components/tournament/player-chip';

const ChampionStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const champion = state.teams?.find((team) => team.id === state.champion);

  return (
    <div className="flex flex-col gap-6">
      <StepPanel gold title="Tenemos campeón">
        <div className="flex flex-col items-center gap-4 py-4">
          {champion ? (
            <>
              <RingGlyph size={34} />
              <p className="d-display d-gold-text font-black text-3xl uppercase tracking-wide">
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
            <p className="text-(--faded) text-sm">Sin campeón determinado.</p>
          )}
        </div>
      </StepPanel>

      <button
        className={`${btn.secondary} self-start px-5 py-2 text-sm`}
        onClick={() => dispatch({ type: 'RESET' })}
        type="button"
      >
        Volver a empezar
      </button>
    </div>
  );
};

export { ChampionStep };
