'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { btn } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

const DraftMethodStep = () => {
  const { state, dispatch } = useSimulator();

  const createRoom = api.draftRoom.create.useMutation({
    onSuccess: ({ code }) => {
      dispatch({ type: 'SET_DRAFT_ROOM_CODE', code });
      dispatch({ type: 'ADVANCE' });
    },
  });

  const canCreateRoom =
    Boolean(state.pots) &&
    Boolean(state.captainIds) &&
    Boolean(state.captainOrderMethod);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Método de draft
      </h2>
      <p className="text-(--faded) text-sm">
        Serpiente invierte el orden cada ronda. Lineal mantiene siempre el mismo
        orden.
      </p>

      <SegmentedControl
        onChange={(method) => dispatch({ type: 'SET_DRAFT_METHOD', method })}
        options={[
          { value: 'snake', label: 'Serpiente' },
          { value: 'linear', label: 'Lineal' },
        ]}
        value={state.draftMethod}
      />

      {state.draftMethod ? (
        <div className="flex flex-col gap-2">
          <button
            className={`${btn.secondary} self-start px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={createRoom.isPending || !canCreateRoom}
            onClick={() =>
              state.pots &&
              state.captainIds &&
              state.captainOrderMethod &&
              state.draftMethod &&
              createRoom.mutate({
                pots: state.pots,
                captainIds: state.captainIds,
                ranking: state.finalRanking ?? state.participantIds,
                captainOrderMethod: state.captainOrderMethod,
                draftMethod: state.draftMethod,
              })
            }
            type="button"
          >
            {createRoom.isPending ? 'Creando sala…' : 'Con varios móviles →'}
          </button>
          {createRoom.error ? (
            <p className="text-(--ember) text-xs">{createRoom.error.message}</p>
          ) : null}
        </div>
      ) : null}

      <WizardNav
        nextDisabled={!state.draftMethod}
        nextLabel="Solo, en este dispositivo"
        onBeforeNext={() => dispatch({ type: 'START_DRAFT' })}
      />
    </section>
  );
};

export { DraftMethodStep };
