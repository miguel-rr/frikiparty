'use client';

import { skipToken } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { CaptainBudgetHud } from '@/components/tournament/captain-budget-hud';
import { CountdownRing } from '@/components/tournament/countdown-ring';
import type { AuctionRoomPayload } from '@/lib/simulator/types';
import { api } from '@/trpc/react';

const AuctionRoomHostStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const code = state.auctionRoomCode;
  const [payload, setPayload] = useState<AuctionRoomPayload | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (!code) return;
    setJoinUrl(`${window.location.origin}/simulator/auction/${code}`);
  }, [code]);

  api.auctionRoom.onUpdate.useSubscription(code ? { code } : skipToken, {
    onData: setPayload,
  });

  if (!code) return null;

  const auction = payload?.auction;
  const captainIds = payload?.captainIds ?? [];
  const claims = payload?.claims ?? {};
  const currentLot = auction?.lots[auction.currentLotIndex];
  const isClosed = auction?.status === 'closed';

  return (
    <section className="flex flex-col gap-6">
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Subasta en varios móviles
      </h2>

      <div className="flex flex-col items-center gap-2 rounded-xl bg-(--panel-2) p-6 ring-(--hair) ring-1">
        <p className="font-mono text-(--faded) text-[0.65rem] uppercase tracking-widest">
          Código para unirse
        </p>
        <p className="font-bold font-mono text-(--gold) text-5xl tracking-widest">
          {code}
        </p>
        {joinUrl ? (
          <p className="break-all text-center font-mono text-(--faded) text-xs">
            {joinUrl}
          </p>
        ) : null}
      </div>

      {!payload ? (
        <p className="text-(--faded) text-sm">Esperando a que empiece…</p>
      ) : isClosed ? (
        <p className="font-semibold text-sm">Subasta terminada.</p>
      ) : currentLot ? (
        <div className="flex flex-col gap-4 rounded-xl bg-(--panel-2) p-4 ring-(--hair) ring-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-(--faded) text-[0.6rem] uppercase tracking-widest">
                Bombo {currentLot.potIndex + 1}
              </p>
              <p className="font-bold text-xl">
                {getPlayerName(currentLot.playerId)}
              </p>
            </div>
            {auction ? (
              <CountdownRing
                durationMs={auction.status === 'lockout' ? 1_500 : 10_000}
                endsAt={
                  auction.status === 'lockout'
                    ? auction.lockoutEndsAt
                    : auction.countdownEndsAt
                }
                label={auction.status === 'lockout' ? 'Bloqueo' : 'Puja'}
              />
            ) : null}
          </div>

          {auction?.currentBid ? (
            <p className="text-sm">
              Puja actual:{' '}
              <span className="font-bold text-(--gold)">
                {auction.currentBid.amount}
              </span>
            </p>
          ) : (
            <p className="text-(--faded) text-sm">Sin pujas todavía.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="font-mono text-(--faded) text-[0.6rem] uppercase tracking-widest">
          Capitanes
        </p>
        <CaptainBudgetHud
          budgets={auction?.budgets ?? {}}
          captainIds={captainIds}
          getPlayerName={getPlayerName}
          rosters={auction?.rosters ?? {}}
        />
        <p className="text-(--faded) text-xs">
          Reclamados: {Object.keys(claims).length} / {captainIds.length}
        </p>
      </div>

      <WizardNav
        nextDisabled={!isClosed || !auction}
        nextLabel="Ver equipos"
        onBeforeNext={() => {
          if (auction) dispatch({ type: 'IMPORT_AUCTION_RESULT', auction });
        }}
      />
    </section>
  );
};

export { AuctionRoomHostStep };
