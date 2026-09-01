'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { EditableRankedList } from '@/app/simulator/_components/ui/editable-ranked-list';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const RankingReviewStep = () => {
  const { state, dispatch } = useSimulator();
  const ranking = state.finalRanking ?? [];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Revisar ranking
      </h2>
      <p className="text-(--faded) text-sm">
        Este orden se usará para generar los bombos. Puedes ajustarlo a mano
        antes de darlo por definitivo.
      </p>

      <EditableRankedList
        onChange={(next) =>
          dispatch({ type: 'SET_FINAL_RANKING', ranking: next })
        }
        playerIds={ranking}
        players={state.players}
      />

      <WizardNav
        nextDisabled={ranking.length === 0}
        nextLabel="Dar por definitivo"
      />
    </section>
  );
};

export { RankingReviewStep };
