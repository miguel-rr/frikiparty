'use client';

import { use, useEffect, useState } from 'react';

import { BidControls } from '@/app/simulator/_components/ui/bid-controls';
import { CaptainBudgetHud } from '@/app/simulator/_components/ui/captain-budget-hud';
import { ClaimCaptainList } from '@/app/simulator/_components/ui/claim-captain-list';
import { CountdownRing } from '@/app/simulator/_components/ui/countdown-ring';
import { getEligibleBidders } from '@/lib/simulator/auction';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';
import type { AuctionRoomPayload } from '@/lib/simulator/types';
import { api } from '@/trpc/react';

const DEVICE_ID_KEY = 'frikiparty-device-id';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const useDeviceId = (): string | null => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    setDeviceId(id);
  }, []);
  return deviceId;
};

type PageProps = {
  params: Promise<{ code: string }>;
};

const AuctionRoomPage = ({ params }: PageProps) => {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const deviceId = useDeviceId();

  const [payload, setPayload] = useState<AuctionRoomPayload | null>(null);
  api.auctionRoom.onUpdate.useSubscription({ code }, { onData: setPayload });

  const claim = api.auctionRoom.claim.useMutation();
  const bid = api.auctionRoom.placeBid.useMutation();

  if (!deviceId || !payload) {
    return (
      <main className="mx-auto flex max-w-[520px] flex-col gap-4 px-4 py-12">
        <p className="text-muted text-sm">Conectando con la sala {code}…</p>
      </main>
    );
  }

  const { auction, captainIds, claims } = payload;
  const myCaptainId = Object.entries(claims).find(
    ([, owner]) => owner === deviceId,
  )?.[0];
  const unclaimedCaptainIds = captainIds.filter((id) => !claims[id]);
  const currentLot = auction.lots[auction.currentLotIndex];
  const isClosed = auction.status === 'closed';
  const eligible = getEligibleBidders(auction, payload.pots, captainIds);

  if (!myCaptainId && unclaimedCaptainIds.length > 0) {
    return (
      <ClaimCaptainList
        captainIds={unclaimedCaptainIds}
        claiming={claim.isPending}
        error={claim.error?.message}
        onClaim={(captainId) => claim.mutate({ code, captainId, deviceId })}
      />
    );
  }

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl uppercase tracking-tight">
        {myCaptainId ? `Eres ${getPlayerName(myCaptainId)}` : 'Subasta'}
      </h1>

      {isClosed ? (
        <p className="font-semibold text-sm">
          La subasta ha terminado — mira la pantalla.
        </p>
      ) : currentLot ? (
        <div className="flex flex-col gap-4 rounded-xl bg-panel-2 p-4 ring-1 ring-hair">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
                Bombo {currentLot.potIndex + 1}
              </p>
              <p className="font-bold text-xl">
                {getPlayerName(currentLot.playerId)}
              </p>
            </div>
            <CountdownRing
              durationMs={auction.status === 'lockout' ? 1_500 : 10_000}
              endsAt={
                auction.status === 'lockout'
                  ? auction.lockoutEndsAt
                  : auction.countdownEndsAt
              }
              label={auction.status === 'lockout' ? 'Bloqueo' : 'Puja'}
            />
          </div>

          {auction.currentBid ? (
            <p className="text-sm">
              Puja actual:{' '}
              <span className="font-bold text-amber">
                {auction.currentBid.amount}
              </span>
            </p>
          ) : (
            <p className="text-muted text-sm">Sin pujas todavía.</p>
          )}

          {myCaptainId ? (
            <>
              <BidControls
                auction={auction}
                disabled={
                  bid.isPending ||
                  auction.status !== 'open' ||
                  !eligible.includes(myCaptainId)
                }
                onBid={(amount) => bid.mutate({ code, deviceId, amount })}
              />
              {bid.error ? (
                <p className="text-foe text-xs">{bid.error.message}</p>
              ) : null}
            </>
          ) : (
            <p className="text-muted text-xs">
              Todos los capitanes están reclamados — modo espectador.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          Capitanes
        </p>
        <CaptainBudgetHud
          activeCaptainId={myCaptainId}
          budgets={auction.budgets}
          captainIds={captainIds}
          rosters={auction.rosters}
        />
      </div>
    </main>
  );
};

export default AuctionRoomPage;
