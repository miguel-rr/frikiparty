'use client';

import { skipToken } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { PlayerChip } from '@/components/tournament/player-chip';
import type { DraftRoomPayload } from '@/lib/simulator/types';
import { resolveNextTurn } from '@/lib/tournament/draft';
import { api } from '@/trpc/react';

const DraftRoomHostStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
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
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Draft en varios móviles
      </h2>

      <div className="flex flex-col items-center gap-2 rounded-xl bg-(--panel-2) p-6 ring-(--hair) ring-1">
        <p className="font-mono text-(--faded) text-2xs uppercase tracking-widest">
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

      {!draft ? (
        <p className="text-(--faded) text-sm">Esperando a que empiece…</p>
      ) : isComplete ? (
        <p className="font-semibold text-sm">Draft completo.</p>
      ) : (
        <p className="text-sm">
          Pick {draft.picks.length} / {draft.turnQueue.length} — turno de{' '}
          <span className="font-bold text-(--gold)">
            {currentCaptain ? getPlayerName(currentCaptain) : ''}
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {captainIds.map((captainId) => (
          <div
            className="flex flex-col gap-2 rounded-xl bg-(--panel-2)/60 p-3 ring-(--hair) ring-1"
            key={captainId}
          >
            <PlayerChip name={getPlayerName(captainId)} />
            <ul className="flex flex-wrap gap-1.5">
              {(draft?.picks ?? [])
                .filter((pick) => pick.captainId === captainId)
                .map((pick) => (
                  <li key={pick.playerId}>
                    <PlayerChip name={getPlayerName(pick.playerId)} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-(--faded) text-xs">
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
