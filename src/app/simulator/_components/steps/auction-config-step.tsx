'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { PlayerChip } from '@/components/tournament/player-chip';
import { computeBudget, computeMinBidsByPot } from '@/lib/tournament/auction';
import { api } from '@/trpc/react';

const AuctionConfigStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const pots = state.pots ?? [];
  const captainIds = state.captainIds ?? [];
  const minBidByPot = computeMinBidsByPot(pots);
  const budget = computeBudget(minBidByPot);

  const createRoom = api.auctionRoom.create.useMutation({
    onSuccess: ({ code }) => {
      dispatch({ type: 'SET_AUCTION_ROOM_CODE', code });
      dispatch({ type: 'ADVANCE' });
    },
  });

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl uppercase tracking-tight">
        Antes de subastar
      </h2>
      <p className="text-muted text-sm">
        El bombo 1 (capitanes) no se subasta. El resto empieza por el mejor
        bombo y baja hasta el peor; dentro de cada bombo el orden es aleatorio.
      </p>

      <div className="flex flex-col gap-2">
        {pots.map((pot, potIndex) =>
          potIndex === 0 ? null : (
            <div
              className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair"
              // biome-ignore lint/suspicious/noArrayIndexKey: pot tiers are positionally fixed, only their members move.
              key={`pot-${potIndex}`}
            >
              <span className="font-semibold">
                Bombo {potIndex + 1} ({pot.length} jugadores)
              </span>
              <span className="font-mono text-amber">
                Precio mínimo: {minBidByPot[potIndex]}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
          Presupuesto por capitán: {budget}
        </p>
        <div className="flex flex-wrap gap-2">
          {captainIds.map((captainId) => (
            <PlayerChip key={captainId} name={getPlayerName(captainId)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="self-start rounded-full bg-panel-2 px-5 py-2.5 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair disabled:cursor-not-allowed disabled:opacity-40"
          disabled={createRoom.isPending}
          onClick={() => createRoom.mutate({ pots, captainIds })}
          type="button"
        >
          {createRoom.isPending ? 'Creando sala…' : 'Con varios móviles →'}
        </button>
        {createRoom.error ? (
          <p className="text-foe text-xs">{createRoom.error.message}</p>
        ) : null}
      </div>

      <WizardNav
        nextLabel="Solo, en este dispositivo"
        onBeforeNext={() => dispatch({ type: 'START_AUCTION' })}
      />
    </section>
  );
};

export { AuctionConfigStep };
