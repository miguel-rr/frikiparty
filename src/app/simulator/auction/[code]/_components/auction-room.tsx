'use client';

import { useEffect, useState } from 'react';

import { BidControls } from '@/components/tournament/bid-controls';
import { CaptainBudgetHud } from '@/components/tournament/captain-budget-hud';
import { ClaimCaptainList } from '@/components/tournament/claim-captain-list';
import { CountdownRing } from '@/components/tournament/countdown-ring';
import type { AuctionRoomPayload } from '@/lib/simulator/types';
import { getEligibleBidders } from '@/lib/tournament/auction';
import { api } from '@/trpc/react';

const DEVICE_ID_KEY = 'frikiparty-device-id';

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

const AuctionRoom = ({ code: rawCode }: { code: string }) => {
  const code = rawCode.toUpperCase();
  const deviceId = useDeviceId();
  const { data: players } = api.player.list.useQuery();
  const getPlayerName = (id: string) =>
    players?.find((player) => player.id === id)?.name ?? id;

  const [payload, setPayload] = useState<AuctionRoomPayload | null>(null);
  api.auctionRoom.onUpdate.useSubscription({ code }, { onData: setPayload });

  const claim = api.auctionRoom.claim.useMutation();
  const bid = api.auctionRoom.placeBid.useMutation();

  if (!deviceId || !payload || !players) {
    return (
      <main className="mx-auto flex max-w-130 flex-col gap-4 px-4 py-12">
        <p className="text-(--faded) text-sm">Conectando con la sala {code}…</p>
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
        getPlayerName={getPlayerName}
        onClaim={(captainId) => claim.mutate({ code, captainId, deviceId })}
      />
    );
  }

  return (
    <main className="mx-auto flex max-w-130 flex-col gap-6 px-4 py-12">
      <h1 className="d-display font-bold text-2xl uppercase tracking-wide">
        {myCaptainId ? `Eres ${getPlayerName(myCaptainId)}` : 'Subasta'}
      </h1>

      {isClosed ? (
        <p className="font-semibold text-sm">
          La subasta ha terminado — mira la pantalla.
        </p>
      ) : currentLot ? (
        <div className="flex flex-col gap-4 rounded-xl bg-(--panel-2) p-4 ring-(--hair) ring-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-(--faded) text-2xs uppercase tracking-widest">
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
              <span className="font-bold text-(--gold)">
                {auction.currentBid.amount}
              </span>
            </p>
          ) : (
            <p className="text-(--faded) text-sm">Sin pujas todavía.</p>
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
                <p className="text-(--ember) text-xs">{bid.error.message}</p>
              ) : null}
            </>
          ) : (
            <p className="text-(--faded) text-xs">
              Todos los capitanes están reclamados — modo espectador.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="font-mono text-(--faded) text-2xs uppercase tracking-widest">
          Capitanes
        </p>
        <CaptainBudgetHud
          activeCaptainId={myCaptainId}
          budgets={auction.budgets}
          captainIds={captainIds}
          getPlayerName={getPlayerName}
          rosters={auction.rosters}
        />
      </div>
    </main>
  );
};

export { AuctionRoom };
