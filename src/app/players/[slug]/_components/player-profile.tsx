'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/trpc/react';

type Title = {
  year: number;
  order: number;
  game: string | null;
  type: 'team' | 'individual';
};

type PlayerProfileProps = {
  id: string;
  name: string;
  bio: string | null;
  rings: number;
  individualRings: number;
  position: number | null;
  titles: Title[];
  canEdit: boolean;
};

const titleLabel = (title: Title) => {
  const edition = `Edición ${title.year}${title.order > 1 ? ` #${title.order}` : ''}`;
  const kind =
    title.type === 'team' ? 'Campeón por equipos' : 'Campeón individual';
  const game = title.game ?? 'AotR/BotME';
  return `${edition} — ${kind} (${game})`;
};

const MEDAL_CLASS_BY_POSITION: Record<number, string> = {
  1: 'medal-gold',
  2: 'medal-silver',
  3: 'medal-bronze',
};

/** Game-achievement-style badge: gold/silver/bronze for the podium, wood for everyone else. */
const RankBadge = ({ position }: { position: number }) => (
  <div
    className={`grid size-16 shrink-0 place-items-center rounded-full p-[3px] ${
      MEDAL_CLASS_BY_POSITION[position] ?? 'medal-wood'
    }`}
  >
    <div className="grid size-full place-items-center rounded-full bg-ground">
      <span className="font-display text-ink text-lg">{position}º</span>
    </div>
  </div>
);

const PlayerProfile = ({
  id,
  name: initialName,
  bio: initialBio,
  rings,
  individualRings,
  position,
  titles,
  canEdit,
}: PlayerProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const router = useRouter();

  // The page is a Server Component, so a client-side query cache invalidation
  // wouldn't touch its props — refresh() re-runs it with fresh data instead.
  const update = api.player.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });

  const cancel = () => {
    setName(initialName);
    setBio(initialBio ?? '');
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {position !== null ? <RankBadge position={position} /> : null}
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-amber font-bold font-mono text-2xl text-ground">
            {initialName.charAt(0).toUpperCase()}
          </span>
          <div>
            {editing ? (
              <input
                className="rounded-lg bg-panel-2 px-3 py-1.5 font-display text-2xl uppercase tracking-tight ring-1 ring-hair focus:outline-none focus:ring-amber sm:text-3xl"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            ) : (
              <h1 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">
                {initialName}
              </h1>
            )}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              <span className="font-mono text-muted text-sm uppercase tracking-widest">
                {rings} {rings === 1 ? 'anillo' : 'anillos'}
              </span>
              {individualRings > 0 ? (
                <span className="font-mono text-[0.65rem] text-muted/60 uppercase tracking-widest">
                  {individualRings}{' '}
                  {individualRings === 1
                    ? 'anillo individual'
                    : 'anillos individuales'}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {canEdit && !editing ? (
          <button
            className="rounded-full bg-panel-2 px-4 py-2 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
            onClick={() => setEditing(true)}
            type="button"
          >
            Editar
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
              Bio
            </span>
            <textarea
              className="min-h-32 rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair focus:outline-none focus:ring-amber"
              onChange={(event) => setBio(event.target.value)}
              value={bio}
            />
          </label>

          <div className="flex gap-2">
            <button
              className="rounded-full bg-amber px-5 py-2 font-extrabold text-ground text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={update.isPending || name.trim().length === 0}
              onClick={() =>
                update.mutate({
                  id,
                  name,
                  bio: bio.trim().length > 0 ? bio : null,
                })
              }
              type="button"
            >
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              className="rounded-full bg-panel-2 px-5 py-2 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
              disabled={update.isPending}
              onClick={cancel}
              type="button"
            >
              Cancelar
            </button>
          </div>
          {update.error ? (
            <p className="text-foe text-xs">{update.error.message}</p>
          ) : null}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">
          {initialBio ?? <span className="text-muted">Sin biografía.</span>}
        </p>
      )}

      {titles.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
            Títulos
          </p>
          <ul className="flex flex-col gap-1.5">
            {titles.map((title) => (
              <li
                className="rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair"
                key={`${title.year}-${title.order}-${title.type}`}
              >
                {titleLabel(title)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export { PlayerProfile };
