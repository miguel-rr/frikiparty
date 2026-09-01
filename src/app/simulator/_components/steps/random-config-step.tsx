'use client';

import { useEffect } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { StepperInput } from '@/app/simulator/_components/ui/stepper-input';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const RandomConfigStep = () => {
  const { state, dispatch } = useSimulator();
  const maxTeams = Math.max(2, Math.floor(state.participantIds.length / 2));

  useEffect(() => {
    if (state.teamCount) return;
    dispatch({ type: 'SET_TEAM_COUNT', teamCount: Math.min(4, maxTeams) });
  }, [state.teamCount, dispatch, maxTeams]);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Aleatorio total
      </h2>
      <p className="text-(--faded) text-sm">
        {state.participantIds.length} jugadores se repartirán al azar entre los
        equipos.
      </p>
      <StepperInput
        label="Número de equipos"
        max={maxTeams}
        min={2}
        onChange={(teamCount) =>
          dispatch({ type: 'SET_TEAM_COUNT', teamCount })
        }
        value={state.teamCount ?? Math.min(4, maxTeams)}
      />
      <WizardNav nextDisabled={!state.teamCount} nextLabel="Formar equipos" />
    </section>
  );
};

export { RandomConfigStep };
