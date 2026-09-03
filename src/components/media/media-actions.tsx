'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, label } from '@/components/theme/primitives';
import type { MediaItem } from '@/server/api/routers/media-queries';
import { api } from '@/trpc/react';

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] transition-colors ${
    active
      ? 'border-(--gold) bg-[#c9a55726] text-(--gold-hi)'
      : 'border-(--hair) text-(--faded) hover:border-(--hair-gold) hover:text-(--parchment)'
  }`;

const quiet =
  'cursor-pointer rounded-full border border-(--hair) px-3 py-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em] transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)';

/**
 * Editar / Eliminar for the file's uploader or an admin, with the inline
 * editor (caption, players, edition, tournament; the long description is
 * admin-only). Deletion asks twice in place, never with a browser dialog.
 */
const MediaActions = ({
  item,
  editing: initialEditing = false,
  doneHref,
  onRemoved,
  removedHref,
}: {
  item: MediaItem;
  /** Start with the editor open (the visitor already asked to edit). */
  editing?: boolean;
  /** After saving or cancelling, go here instead of folding the editor. */
  doneHref?: string;
  /** Called after a successful delete (close the lightbox). */
  onRemoved?: () => void;
  /** Where to go after a delete when there's no lightbox to close. */
  removedHref?: string;
}) => {
  const { user } = useSessionUser();
  const router = useRouter();
  const [editing, setEditing] = useState(initialEditing);
  const [confirming, setConfirming] = useState(false);

  const utils = api.useUtils();
  const isAdmin = user?.role === 'admin';
  const canEdit =
    user !== undefined && (isAdmin || user.id === item.uploadedByUserId);

  // Galleries are client queries and /archive pages are dynamic: refresh both.
  const refresh = () => {
    utils.media.gallery.invalidate();
    router.refresh();
  };
  const reprocess = api.media.reprocessVideo.useMutation({
    onSuccess: refresh,
  });
  const remove = api.media.remove.useMutation({
    onSuccess: () => {
      if (removedHref) {
        router.push(removedHref);
      }
      refresh();
      onRemoved?.();
    },
  });

  if (!canEdit) {
    return null;
  }
  if (editing) {
    return (
      <MediaEditor
        isAdmin={isAdmin}
        item={item}
        onDone={() => {
          if (doneHref) {
            router.push(doneHref);
            return;
          }
          setEditing(false);
          refresh();
        }}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={quiet} onClick={() => setEditing(true)} type="button">
        Editar
      </button>
      {isAdmin && item.type === 'video' ? (
        <button
          className={quiet}
          disabled={reprocess.isPending || item.playbackStatus === 'converting'}
          onClick={() => reprocess.mutate({ id: item.id })}
          title="Vuelve a sacar el póster y, si hace falta, la versión H.264"
          type="button"
        >
          {item.playbackStatus === 'failed'
            ? 'Reintentar conversión'
            : 'Reprocesar vídeo'}
        </button>
      ) : null}
      {confirming ? (
        <>
          <span className="text-(--ember) text-xs">
            Se borra para siempre, también del almacén.
          </span>
          <button
            className={`${btn.danger} px-4 py-1.5 text-xs`}
            disabled={remove.isPending}
            onClick={() => remove.mutate({ id: item.id })}
            type="button"
          >
            {remove.isPending ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button
            className={quiet}
            onClick={() => setConfirming(false)}
            type="button"
          >
            No
          </button>
        </>
      ) : (
        <button
          className={`${quiet} hover:border-[#cf6a4873] hover:text-(--ember)`}
          onClick={() => setConfirming(true)}
          type="button"
        >
          Eliminar
        </button>
      )}
      {remove.error ? (
        <span className="text-(--ember) text-xs">{remove.error.message}</span>
      ) : null}
    </div>
  );
};

const MediaEditor = ({
  isAdmin,
  item,
  onDone,
}: {
  isAdmin: boolean;
  item: MediaItem;
  onDone: () => void;
}) => {
  const context = api.media.uploadContext.useQuery();
  const update = api.media.update.useMutation({ onSuccess: onDone });
  const [caption, setCaption] = useState(item.caption ?? '');
  const [description, setDescription] = useState(item.description ?? '');
  const [playerIds, setPlayerIds] = useState(item.players.map((p) => p.id));
  const [editionId, setEditionId] = useState(item.edition?.id ?? '');
  const [tournamentId, setTournamentId] = useState(item.tournamentId ?? '');

  const tournaments = useMemo(
    () =>
      context.data?.editions.find((e) => e.id === editionId)?.tournaments ?? [],
    [context.data, editionId],
  );

  const togglePlayer = (id: string) =>
    setPlayerIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  const save = () =>
    update.mutate({
      id: item.id,
      caption: caption.trim() || null,
      ...(isAdmin ? { description: description.trim() || null } : {}),
      playerIds,
      editionId: editionId || null,
      tournamentId: tournamentId || null,
    });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-(--hair-gold) bg-(--night-2) p-4">
      <div className="flex flex-col">
        <label className={label} htmlFor={`caption-${item.id}`}>
          Título
        </label>
        <input
          className={input}
          id={`caption-${item.id}`}
          maxLength={200}
          onChange={(event) => setCaption(event.target.value)}
          value={caption}
        />
      </div>
      {isAdmin ? (
        <div className="flex flex-col">
          <label className={label} htmlFor={`description-${item.id}`}>
            Descripción
          </label>
          <textarea
            className={`${input} min-h-24`}
            id={`description-${item.id}`}
            maxLength={4000}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className={label}>Jugadores que salen · al menos uno</span>
        {context.data ? (
          <div className="flex flex-wrap gap-1.5">
            {context.data.players.map((p) => (
              <button
                aria-pressed={playerIds.includes(p.id)}
                className={chip(playerIds.includes(p.id))}
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                type="button"
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-(--faded) text-sm">Cargando…</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className={label} htmlFor={`edition-${item.id}`}>
            Edición
          </label>
          <select
            className={`${input} appearance-none`}
            id={`edition-${item.id}`}
            onChange={(event) => {
              setEditionId(event.target.value);
              setTournamentId('');
            }}
            value={editionId}
          >
            <option value="">Sin edición</option>
            {context.data?.editions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        {tournaments.length > 0 ? (
          <div className="flex flex-col">
            <label className={label} htmlFor={`tournament-${item.id}`}>
              Torneo
            </label>
            <select
              className={`${input} appearance-none`}
              id={`tournament-${item.id}`}
              onChange={(event) => setTournamentId(event.target.value)}
              value={tournamentId}
            >
              <option value="">Fuera del torneo</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.kind === 'team' ? 'Por equipos' : 'Individual'}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {update.error ? (
        <p className="text-(--ember) text-xs">{update.error.message}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={update.isPending || playerIds.length === 0}
          onClick={save}
          type="button"
        >
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          className={`${btn.ghost} text-sm`}
          onClick={onDone}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export { MediaActions };
