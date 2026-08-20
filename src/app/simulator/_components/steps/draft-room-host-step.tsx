'use client';

import { skipToken } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { PlayerChip } from '@/app/simulator/_components/ui/player-chip';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { resolveNextTurn } from '@/lib/simulator/draft';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';
import type { DraftRoomPayload } from '@/lib/simulator/types';
import { api } from '@/trpc/react';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const DraftRoomHostStep = () => {
  const { state, dispatch } = useSimulator();
  const code = state.draftRoomCode;
  const [payload, setPayload] = useState<DraftRoomPayload | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (!code) return;
    setJoinUrl(`${window.location.origin}/simulator/draft/${code}`);
  }, [code]);

  api.draftRoom.onUpdate.useSubscription(code ? { code } : skipToken, {
    onData: setPayload,
  });

  if (!code) return null;

  const draft = payload?.draft;
  const captainIds = payload?.captainIds ?? [];
  const claims = payload?.claims ?? {};
  const currentCaptain = draft
    ? resolveNextTurn(draft, payload?.pots ?? [])
    : undefined;
  const isComplete = Boolean(draft) && currentCaptain === undefined;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl uppercase tracking-tight">
        Draft en varios móviles
      </h2>

      <div className="flex flex-col items-center gap-2 rounded-xl bg-panel-2 p-6 ring-1 ring-hair">
        <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
          Código para unirse
        </p>
        <p className="font-bold font-mono text-5xl text-amber tracking-widest">
          {code}
        </p>
        {joinUrl ? (
          <p className="break-all text-center font-mono text-muted text-xs">
            {joinUrl}
          </p>
        ) : null}
      </div>

      {!draft ? (
        <p className="text-muted text-sm">Esperando a que empiece…</p>
      ) : isComplete ? (
        <p className="font-semibold text-sm">Draft completo.</p>
      ) : (
        <p className="text-sm">
          Pick {draft.picks.length} / {draft.turnQueue.length} — turno de{' '}
          <span className="font-bold text-amber">
            {currentCaptain ? getPlayerName(currentCaptain) : ''}
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {captainIds.map((captainId) => (
          <div
            className="flex flex-col gap-2 rounded-xl bg-panel-2/60 p-3 ring-1 ring-hair"
            key={captainId}
          >
            <PlayerChip playerId={captainId} />
            <ul className="flex flex-wrap gap-1.5">
              {(draft?.picks ?? [])
                .filter((pick) => pick.captainId === captainId)
                .map((pick) => (
                  <li key={pick.playerId}>
                    <PlayerChip playerId={pick.playerId} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-muted text-xs">
        Reclamados: {Object.keys(claims).length} / {captainIds.length}
      </p>

      <WizardNav
        nextDisabled={!isComplete}
        nextLabel="Ver equipos"
        onBeforeNext={() => {
          if (draft) dispatch({ type: 'IMPORT_DRAFT_RESULT', draft });
        }}
      />
    </section>
  );
};

export { DraftRoomHostStep };
