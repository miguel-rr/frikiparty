'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, label } from '@/components/theme/primitives';
import type { CardSpec } from '@/components/tournament/hearth-card';
import { PortraitCard } from '@/components/tournament/portrait-card';
import {
  cardSpecFor,
  LORE_OPTIONS,
  PORTRAIT_OPTIONS,
  portraitPath,
} from '@/lib/tournament/card-lore';
import { api } from '@/trpc/react';

type PlayerProfileProps = {
  id: string;
  name: string;
  bio: string | null;
  /** The card dealt server-side for this visit (saved choices already applied). */
  card: CardSpec;
  cardPortrait: string | null;
  cardLore: string | null;
  rings: number;
  individualRings: number;
  /** Richar: his line never rotates, so the card picker is hidden. */
  pinnedLore: boolean;
  /** Linked user who owns the profile; edit rights resolve client-side. */
  ownerUserId: string | null;
  /** Server-rendered stats and palmarés, shown under the header column. */
  children?: ReactNode;
};

/**
 * Card + name/bio header with inline editing for the linked user (or an
 * admin). The pickers preview instantly on the card: Guardar persists the
 * choice, Cancelar restores whatever this visit had dealt.
 */
const PlayerProfile = ({
  id,
  name: initialName,
  bio: initialBio,
  card,
  cardPortrait: initialPortrait,
  cardLore: initialLore,
  rings,
  individualRings,
  pinnedLore,
  ownerUserId,
  children,
}: PlayerProfileProps) => {
  // Session read on the client so the page itself is built statically;
  // player.update re-checks permissions server-side anyway.
  const { user } = useSessionUser();
  const canEdit =
    user !== undefined && (user.role === 'admin' || user.id === ownerUserId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [portrait, setPortrait] = useState(initialPortrait ?? '');
  const [lore, setLore] = useState(initialLore ?? '');
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
    setPortrait(initialPortrait ?? '');
    setLore(initialLore ?? '');
    setEditing(false);
  };

  const selectedLore = LORE_OPTIONS.find((pair) => pair.ability === lore);

  // Live preview while editing: chosen portrait/lore apply instantly; when a
  // choice is cleared back to automatic, fall back to the player's defaults
  // (portrait) or keep this visit's dealt line (lore) until saved.
  const defaults = cardSpecFor({ name: initialName, rings, individualRings });
  const previewCard: CardSpec = editing
    ? {
        ...card,
        portrait: portrait ? portraitPath(portrait) : defaults.portrait,
        ability: pinnedLore
          ? card.ability
          : (selectedLore?.ability ?? card.ability),
        text: pinnedLore ? card.text : (selectedLore?.text ?? card.text),
      }
    : card;

  return (
    <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-start">
      <PortraitCard card={previewCard} className="w-[250px] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {editing ? (
              <input
                className={`${input} max-w-sm font-bold text-2xl`}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            ) : (
              <h1 className="d-display d-gold-text font-black text-4xl uppercase tracking-wide sm:text-5xl">
                {initialName}
              </h1>
            )}
            {canEdit && !editing ? (
              <button
                className={`${btn.secondary} px-4 py-1.5 text-sm`}
                onClick={() => setEditing(true)}
                type="button"
              >
                Editar
              </button>
            ) : null}
          </div>

          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <span className={label}>Bio</span>
                <textarea
                  className={`${input} min-h-32`}
                  onChange={(event) => setBio(event.target.value)}
                  value={bio}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className={label}>Ilustración</span>
                  <select
                    className={`${input} d-select py-1.5 pr-9 text-sm`}
                    onChange={(event) => setPortrait(event.target.value)}
                    value={portrait}
                  >
                    <option value="">Automática</option>
                    {PORTRAIT_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {pinnedLore ? null : (
                  <div>
                    <span className={label}>Carta</span>
                    <select
                      className={`${input} d-select py-1.5 pr-9 text-sm`}
                      onChange={(event) => setLore(event.target.value)}
                      value={lore}
                    >
                      <option value="">
                        Aleatoria (cambia en cada visita)
                      </option>
                      {LORE_OPTIONS.map((pair) => (
                        <option key={pair.ability} value={pair.ability}>
                          {pair.ability}
                        </option>
                      ))}
                    </select>
                    {selectedLore ? (
                      <p className="mt-1.5 text-(--faded) text-xs italic">
                        {selectedLore.text}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className={btn.primary}
                  disabled={update.isPending || name.trim().length === 0}
                  onClick={() =>
                    update.mutate({
                      id,
                      name,
                      bio: bio.trim().length > 0 ? bio : null,
                      cardPortrait: portrait.length > 0 ? portrait : null,
                      cardLore: lore.length > 0 ? lore : null,
                    })
                  }
                  type="button"
                >
                  {update.isPending ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  className={btn.secondary}
                  disabled={update.isPending}
                  onClick={cancel}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
              {update.error ? (
                <p className="text-(--ember) text-xs">{update.error.message}</p>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-(--parchment)">
              {initialBio ?? (
                <span className="text-(--faded)">Sin biografía.</span>
              )}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export { PlayerProfile };
