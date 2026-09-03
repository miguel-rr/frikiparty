'use client';

import { useEffect } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { StepperInput } from '@/app/simulator/_components/ui/stepper-input';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const TournamentSwissStep = () => {
  const { state, dispatch } = useSimulator();

  useEffect(() => {
    if (state.swiss) return;
    dispatch({
      type: 'SET_SWISS_CONFIG',
      swiss: { lossesToEliminate: 2, pairingCriterion: 'random' },
    });
  }, [state.swiss, dispatch]);

  if (!state.swiss) return null;
  const swiss = state.swiss;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Suizo
      </h2>

      <StepperInput
        label="Derrotas para quedar eliminado"
        max={10}
        min={1}
        onChange={(lossesToEliminate) =>
          dispatch({
            type: 'SET_SWISS_CONFIG',
            swiss: { ...swiss, lossesToEliminate },
          })
        }
        value={swiss.lossesToEliminate}
      />

      <div className="flex flex-col gap-2">
        <p className="font-mono text-(--faded) text-2xs uppercase tracking-widest">
          Criterio de emparejamiento
        </p>
        <SegmentedControl
          onChange={(pairingCriterion) =>
            dispatch({
              type: 'SET_SWISS_CONFIG',
              swiss: { ...swiss, pairingCriterion },
            })
          }
          options={[
            { value: 'random', label: 'Totalmente aleatorio' },
            { value: 'balanced', label: 'Ranking por paridad' },
            { value: 'seeded', label: 'Cabezas de serie' },
          ]}
          value={swiss.pairingCriterion}
        />
      </div>

      <WizardNav />
    </section>
  );
};

export { TournamentSwissStep };
