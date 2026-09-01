'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const RankingSourceStep = () => {
  const { state, dispatch } = useSimulator();

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Origen del ranking
      </h2>
      <p className="text-(--faded) text-sm">
        Este ranking decide el orden con el que se generan los bombos.
      </p>

      <SegmentedControl
        onChange={(source) => dispatch({ type: 'SET_RANKING_SOURCE', source })}
        options={[
          { value: 'historical', label: 'Ranking histórico' },
          { value: 'voting', label: 'Votación' },
          { value: 'combined', label: 'Combinado' },
        ]}
        value={state.rankingSource}
      />

      {state.rankingSource === 'combined' ? (
        <label className="flex flex-col gap-2">
          <span className="font-mono text-(--faded) text-[0.65rem] uppercase tracking-widest">
            Peso del ranking histórico: {state.historicalWeight ?? 50}%
          </span>
          <input
            className="accent-amber"
            max={100}
            min={0}
            onChange={(event) =>
              dispatch({
                type: 'SET_HISTORICAL_WEIGHT',
                weight: Number(event.target.value),
              })
            }
            type="range"
            value={state.historicalWeight ?? 50}
          />
        </label>
      ) : null}

      <WizardNav nextDisabled={!state.rankingSource} />
    </section>
  );
};

export { RankingSourceStep };
