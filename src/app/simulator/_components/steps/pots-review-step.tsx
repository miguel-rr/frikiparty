'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { StepperInput } from '@/app/simulator/_components/ui/stepper-input';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { btn } from '@/components/theme/primitives';
import { PotBoard } from '@/components/tournament/pot-board';

const PotsReviewStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const maxPlayersPerTeam = state.maxPlayersPerTeam ?? 4;
  const nextLabel =
    state.teamFormationMethod === 'pots-random'
      ? 'Formar equipos'
      : 'Continuar';

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Bombos
      </h2>
      <p className="text-(--faded) text-sm">
        El número de bombos es el número máximo de jugadores por equipo. Si el
        total no es divisible, el último bombo queda más corto.
      </p>

      <StepperInput
        label="Jugadores por equipo (máx.)"
        max={8}
        min={2}
        onChange={(value) =>
          dispatch({
            type: 'SET_MAX_PLAYERS_PER_TEAM',
            maxPlayersPerTeam: value,
          })
        }
        value={maxPlayersPerTeam}
      />

      <button
        className={`${btn.secondary} self-start px-5 py-2 text-sm`}
        onClick={() => dispatch({ type: 'GENERATE_POTS' })}
        type="button"
      >
        Generar bombos
      </button>

      {state.pots ? (
        <PotBoard
          getPlayerName={getPlayerName}
          onMove={(playerId, fromPotIndex, toPotIndex) =>
            dispatch({
              type: 'MOVE_PLAYER_BETWEEN_POTS',
              playerId,
              fromPotIndex,
              toPotIndex,
            })
          }
          pots={state.pots}
        />
      ) : null}

      <WizardNav nextDisabled={!state.pots} nextLabel={nextLabel} />
    </section>
  );
};

export { PotsReviewStep };
