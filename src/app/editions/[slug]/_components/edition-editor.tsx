'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import {
  btn,
  input,
  label,
  PlayerBlazon,
  panelGold,
} from '@/components/theme/primitives';
import { api } from '@/trpc/react';

type EditionEditorProps = {
  edition: {
    id: string;
    label: string;
    confirmedPlayers: { id: string; name: string; slug: string }[];
  };
};

/**
 * Admin-only inline editor for an edition that hasn't been played yet,
 * same pattern as the venue editor: a quiet Editar button that unfolds
 * the attendance list. Confirming or removing a player persists at once
 * and refreshes the page (the mutation revalidates it and /council).
 */
const EditionEditor = ({ edition }: EditionEditorProps) => {
  const router = useRouter();
  // Client-side gate so the page stays static; the mutations re-check.
  const { user } = useSessionUser();
  const [editing, setEditing] = useState(false);
  const [playerId, setPlayerId] = useState('');

  const players = api.player.list.useQuery(undefined, { enabled: editing });
  const confirmedIds = new Set(edition.confirmedPlayers.map((p) => p.id));
  const candidates = (players.data ?? []).filter(
    (candidate) => !confirmedIds.has(candidate.id),
  );

  const confirm = api.edition.confirmPlayer.useMutation({
    onSuccess: () => {
      setPlayerId('');
      router.refresh();
    },
  });
  const unconfirm = api.edition.unconfirmPlayer.useMutation({
    onSuccess: () => router.refresh(),
  });
  const busy = confirm.isPending || unconfirm.isPending;
  const error = confirm.error ?? unconfirm.error;

  if (user?.role !== 'admin') {
    return null;
  }

  if (!editing) {
    return (
      <div className="flex justify-end">
        <button
          className={`${btn.secondary} px-4 py-1.5 text-sm`}
          onClick={() => setEditing(true)}
          type="button"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className={`${panelGold} flex flex-col gap-5 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1">
        <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          Asistencia confirmada · {edition.label}
        </span>
        <p className="text-(--faded) text-sm">
          Quien aparece aquí se muestra en El Concilio, en orden de ranking.
        </p>
      </div>

      {edition.confirmedPlayers.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {edition.confirmedPlayers.map((player, index) => (
            <li
              className="flex items-center gap-2.5 rounded-lg border border-(--hair) bg-(--night-2) py-1.5 pr-2 pl-2.5"
              key={player.id}
            >
              <span className="w-5 text-right font-mono text-(--faded) text-2xs">
                {index + 1}
              </span>
              <PlayerBlazon name={player.name} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold text-sm">
                {player.name}
              </span>
              <button
                className={`${btn.ghost} px-2.5 py-1 text-xs hover:text-(--ember)`}
                disabled={busy}
                onClick={() =>
                  unconfirm.mutate({
                    editionId: edition.id,
                    playerId: player.id,
                  })
                }
                type="button"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-(--faded) text-sm italic">
          Nadie ha confirmado todavía.
        </p>
      )}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (playerId) {
            confirm.mutate({ editionId: edition.id, playerId });
          }
        }}
      >
        <div className="flex-1">
          <label className={label} htmlFor="edition-confirm-player">
            Añadir jugador
          </label>
          <select
            className={input}
            disabled={players.isPending || candidates.length === 0}
            id="edition-confirm-player"
            onChange={(event) => setPlayerId(event.target.value)}
            value={playerId}
          >
            <option value="">
              {players.isPending
                ? 'Cargando jugadores…'
                : candidates.length === 0
                  ? 'Todos los jugadores han confirmado'
                  : 'Elige un jugador…'}
            </option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            className={`${btn.ghost} px-4 py-1.5 text-sm`}
            onClick={() => setEditing(false)}
            type="button"
          >
            Cerrar
          </button>
          <button
            className={`${btn.primary} px-5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-55`}
            disabled={busy || !playerId}
            type="submit"
          >
            {confirm.isPending ? 'Confirmando…' : 'Confirmar asistencia'}
          </button>
        </div>
      </form>
      {error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
};

export { EditionEditor };
