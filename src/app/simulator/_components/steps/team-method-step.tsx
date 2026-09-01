'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import type { TeamFormationMethod } from '@/lib/simulator/types';

const METHODS: {
  value: TeamFormationMethod;
  title: string;
  description: string;
}[] = [
  {
    value: 'random',
    title: 'Aleatorio total',
    description:
      'Se elige el número de equipos y se reparte a todos sin ningún criterio.',
  },
  {
    value: 'pots-random',
    title: 'Bombos + aleatorio',
    description:
      'Se generan bombos por ranking y se reparte al azar dentro de cada uno.',
  },
  {
    value: 'pots-draft',
    title: 'Bombos + draft',
    description:
      'Capitanes eligen jugador a jugador, en serpiente o en orden lineal.',
  },
  {
    value: 'pots-auction',
    title: 'Bombos + subasta',
    description: 'Capitanes pujan en vivo por cada jugador, bombo a bombo.',
  },
];

const TeamMethodStep = () => {
  const { state, dispatch } = useSimulator();

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Formación de equipos
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {METHODS.map((method) => (
          <button
            className={`flex flex-col gap-1.5 rounded-xl p-4 text-left ring-1 transition-colors ${
              state.teamFormationMethod === method.value
                ? 'bg-(--panel-2) ring-(--gold)'
                : 'bg-(--panel-2)/60 ring-(--hair) hover:bg-(--panel-2)'
            }`}
            key={method.value}
            onClick={() =>
              dispatch({ type: 'SET_TEAM_METHOD', method: method.value })
            }
            type="button"
          >
            <span className="font-bold text-sm">{method.title}</span>
            <span className="text-(--faded) text-xs leading-relaxed">
              {method.description}
            </span>
          </button>
        ))}
      </div>

      <WizardNav nextDisabled={!state.teamFormationMethod} />
    </section>
  );
};

export { TeamMethodStep };
