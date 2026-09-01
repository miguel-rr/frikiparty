'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { buildCaptainOrder } from '@/lib/tournament/draft';

const DraftOrderStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const captainIds = state.captainIds ?? [];
  const ranking = state.finalRanking ?? state.participantIds;
  const preview = state.captainOrderMethod
    ? buildCaptainOrder(captainIds, ranking, state.captainOrderMethod)
    : [];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Orden de elección
      </h2>

      <SegmentedControl
        onChange={(method) =>
          dispatch({ type: 'SET_CAPTAIN_ORDER_METHOD', method })
        }
        options={[
          { value: 'inverse-ranking', label: 'Ranking inverso' },
          { value: 'ranking', label: 'Ranking' },
          { value: 'fixed-random', label: 'Aleatorio fijo' },
          { value: 'full-random', label: 'Aleatorio total' },
        ]}
        value={state.captainOrderMethod}
      />

      {preview.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {preview.map((captainId, index) => (
            <li
              className="flex items-center gap-3 rounded-lg bg-(--panel-2) px-3 py-2 text-sm ring-(--hair) ring-1"
              key={captainId}
            >
              <span className="w-6 font-mono text-(--faded) text-xs">
                {index + 1}
              </span>
              <span className="font-semibold">{getPlayerName(captainId)}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {state.captainOrderMethod === 'full-random' ? (
        <p className="text-(--faded) text-xs">
          Con aleatorio total el orden se vuelve a sortear en cada ronda, así
          que este es solo un ejemplo.
        </p>
      ) : null}

      <WizardNav nextDisabled={!state.captainOrderMethod} />
    </section>
  );
};

export { DraftOrderStep };
