'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
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
      <h2 className="font-display text-2xl uppercase tracking-tight">
        Método de draft
      </h2>
      <p className="text-muted text-sm">
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
            className="self-start rounded-full bg-panel-2 px-5 py-2.5 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="text-foe text-xs">{createRoom.error.message}</p>
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
