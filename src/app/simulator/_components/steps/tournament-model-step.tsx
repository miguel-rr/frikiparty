'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const TournamentModelStep = () => {
  const { state, dispatch } = useSimulator();

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Modelo de competición
      </h2>
      <p className="text-(--faded) text-sm">
        Clásico son fases (grupos y/o eliminatorias). Suizo elimina por número
        de derrotas y empareja ronda a ronda.
      </p>
      <SegmentedControl
        onChange={(model) => dispatch({ type: 'SET_MODEL', model })}
        options={[
          { value: 'classic', label: 'Clásico' },
          { value: 'swiss', label: 'Suizo' },
        ]}
        value={state.model}
      />
      <WizardNav nextDisabled={!state.model} />
    </section>
  );
};

export { TournamentModelStep };
