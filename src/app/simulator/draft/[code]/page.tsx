'use client';

import { use, useEffect, useState } from 'react';

import { ClaimCaptainList } from '@/components/tournament/claim-captain-list';
import { PlayerChip } from '@/components/tournament/player-chip';
import type { DraftRoomPayload } from '@/lib/simulator/types';
import {
  getAvailablePotIndices,
  getUndraftedPlayersInPot,
  resolveNextTurn,
} from '@/lib/tournament/draft';
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

type PageProps = {
  params: Promise<{ code: string }>;
};

const DraftRoomPage = ({ params }: PageProps) => {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const deviceId = useDeviceId();
  const { data: players } = api.player.list.useQuery();
  const getPlayerName = (id: string) =>
    players?.find((player) => player.id === id)?.name ?? id;

  const [payload, setPayload] = useState<DraftRoomPayload | null>(null);
  const [selectedPot, setSelectedPot] = useState<number | null>(null);
  api.draftRoom.onUpdate.useSubscription({ code }, { onData: setPayload });

  const claim = api.draftRoom.claim.useMutation();
  const pick = api.draftRoom.pick.useMutation();

  if (!deviceId || !payload || !players) {
    return (
      <main className="mx-auto flex max-w-[520px] flex-col gap-4 px-4 py-12">
        <p className="text-muted text-sm">Conectando con la sala {code}…</p>
      </main>
    );
  }

  const { pots, draft, captainIds, claims } = payload;
  const myCaptainId = Object.entries(claims).find(
    ([, owner]) => owner === deviceId,
  )?.[0];
  const unclaimedCaptainIds = captainIds.filter((id) => !claims[id]);

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

  const currentCaptain = resolveNextTurn(draft, pots);
  const isComplete = currentCaptain === undefined;
  const isMyTurn = Boolean(myCaptainId) && currentCaptain === myCaptainId;
  const availablePots =
    isMyTurn && myCaptainId
      ? getAvailablePotIndices(pots, draft, myCaptainId)
      : [];
  const playersInSelectedPot =
    isMyTurn && selectedPot !== null
      ? getUndraftedPlayersInPot(pots, draft, selectedPot)
      : [];

  const submitPick = (potIndex: number, playerId: string) => {
    pick.mutate(
      { code, deviceId, potIndex, playerId },
      { onSuccess: () => setSelectedPot(null) },
    );
  };

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl uppercase tracking-tight">
        {myCaptainId ? `Eres ${getPlayerName(myCaptainId)}` : 'Draft'}
      </h1>

      {isComplete ? (
        <p className="font-semibold text-sm">
          Draft completo — mira la pantalla.
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl bg-panel-2 p-4 ring-1 ring-hair">
          <p className="text-sm">
            Pick {draft.picks.length} / {draft.turnQueue.length} — turno de{' '}
            <span className="font-bold text-amber">
              {getPlayerName(currentCaptain ?? '')}
            </span>
          </p>

          {isMyTurn ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {availablePots.map((potIndex) => (
                  <button
                    className={`rounded-full px-4 py-2 font-semibold text-sm ring-1 transition-colors ${
                      selectedPot === potIndex
                        ? 'bg-amber text-ground ring-amber'
                        : 'bg-panel-2 ring-hair hover:bg-hair'
                    }`}
                    key={potIndex}
                    onClick={() => setSelectedPot(potIndex)}
                    type="button"
                  >
                    Bombo {potIndex + 1}
                  </button>
                ))}
              </div>

              {selectedPot !== null ? (
                <div className="flex flex-wrap gap-2">
                  {playersInSelectedPot.map((playerId) => (
                    <button
                      disabled={pick.isPending}
                      key={playerId}
                      onClick={() => submitPick(selectedPot, playerId)}
                      type="button"
                    >
                      <PlayerChip name={getPlayerName(playerId)} />
                    </button>
                  ))}
                </div>
              ) : null}

              {pick.error ? (
                <p className="text-foe text-xs">{pick.error.message}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted text-xs">
              {myCaptainId
                ? 'Espera tu turno…'
                : 'Todos los capitanes están reclamados — modo espectador.'}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          Capitanes
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {captainIds.map((captainId) => (
            <div
              className="flex flex-col gap-2 rounded-xl bg-panel-2/60 p-3 ring-1 ring-hair"
              key={captainId}
            >
              <PlayerChip name={getPlayerName(captainId)} />
              <ul className="flex flex-wrap gap-1.5">
                {draft.picks
                  .filter((pickItem) => pickItem.captainId === captainId)
                  .map((pickItem) => (
                    <li key={pickItem.playerId}>
                      <PlayerChip name={getPlayerName(pickItem.playerId)} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default DraftRoomPage;
