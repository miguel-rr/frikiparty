'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { BioParchment } from '@/components/players/bio-parchment';
import { btn, input, label } from '@/components/theme/primitives';
import type { CardSpec } from '@/components/tournament/hearth-card';
import { PortraitCard } from '@/components/tournament/portrait-card';
import {
  cardSpecFor,
  PORTRAIT_OPTIONS,
  portraitPath,
} from '@/lib/tournament/card-lore';
import { api } from '@/trpc/react';

type PlayerProfileProps = {
  id: string;
  /** The page's address; a rename moves the page and we follow it. */
  slug: string;
  name: string;
  bio: string | null;
  /** The card dealt server-side for this visit (saved choices already applied). */
  card: CardSpec;
  cardPortrait: string | null;
  cardAbility: string | null;
  cardAbilityText: string | null;
  rings: number;
  individualRings: number;
  /** Quick stats (ranking position, rings) shown beside the card. */
  stats?: ReactNode;
  /** Server-rendered palmarés, shown under the chronicle. */
  children?: ReactNode;
};

/**
 * Card + name/bio header with inline editing for the linked user (or an
 * admin). The pickers preview instantly on the card: Guardar persists the
 * choice, Cancelar restores whatever this visit had dealt.
 */
const PlayerProfile = ({
  id,
  slug,
  name: initialName,
  bio: initialBio,
  card,
  cardPortrait: initialPortrait,
  cardAbility: initialAbility,
  cardAbilityText: initialAbilityText,
  rings,
  individualRings,
  stats,
  children,
}: PlayerProfileProps) => {
  // The page is built statically, so ownership is resolved live on the
  // client: the session for the role, player.mine for the linked player.
  // Nothing baked into the HTML can go stale; player.update re-checks
  // permissions server-side anyway.
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: user !== undefined,
    staleTime: 5 * 60 * 1000,
  });
  const canEdit =
    user !== undefined && (user.role === 'admin' || mine.data?.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [portrait, setPortrait] = useState(initialPortrait ?? '');
  const [abilityName, setAbilityName] = useState(initialAbility ?? '');
  const [abilityText, setAbilityText] = useState(initialAbilityText ?? '');
  const router = useRouter();
  const utils = api.useUtils();

  // The page is a Server Component, so a client-side query cache invalidation
  // wouldn't touch its props — refresh() re-runs it with fresh data instead.
  // A rename moves the page (the slug follows the name): go to the new
  // address, which renders with the fresh data; the user menu's link and
  // any player list re-read their slugs.
  const update = api.player.update.useMutation({
    onSuccess: (updated) => {
      setEditing(false);
      void utils.player.mine.invalidate();
      void utils.player.list.invalidate();
      if (updated && updated.slug !== slug) {
        router.replace(`/players/${updated.slug}`);
        return;
      }
      router.refresh();
    },
  });

  const cancel = () => {
    setName(initialName);
    setBio(initialBio ?? '');
    setPortrait(initialPortrait ?? '');
    setAbilityName(initialAbility ?? '');
    setAbilityText(initialAbilityText ?? '');
    setEditing(false);
  };

  // Name and definition travel together: exactly one filled is invalid.
  const attackIncomplete =
    (abilityName.trim() === '') !== (abilityText.trim() === '');

  // Live preview while editing: portrait and the typed attack apply to the
  // card instantly; cleared fields fall back to the automatic defaults.
  const defaults = cardSpecFor({ name: initialName, rings, individualRings });
  const previewCard: CardSpec = editing
    ? {
        ...card,
        portrait: portrait ? portraitPath(portrait) : defaults.portrait,
        ability: abilityName.trim() === '' ? undefined : abilityName,
        text: abilityText.trim() === '' ? defaults.text : abilityText,
      }
    : card;

  return (
    // Requested composition: name on top left; below it the portrait with
    // its stats stacked underneath, and the chronicle to the right.
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:text-left">
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
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-10">
        <div className="flex shrink-0 flex-col items-center gap-6 sm:items-start">
          <PortraitCard card={previewCard} className="w-62.5 shrink-0" />
          {stats}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <span className={label}>Bio</span>
                <textarea
                  className={`${input} min-h-44 font-serif text-base leading-relaxed`}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="La crónica del jugador, al tono del Libro Rojo…"
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
                <div>
                  <span className={label}>Ataque · nombre</span>
                  <input
                    className={input}
                    maxLength={80}
                    onChange={(event) => setAbilityName(event.target.value)}
                    placeholder="Grito de batalla"
                    value={abilityName}
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className={label}>Ataque · definición</span>
                  <input
                    className={input}
                    maxLength={300}
                    onChange={(event) => setAbilityText(event.target.value)}
                    placeholder="Añade un anillo a tu mano."
                    value={abilityText}
                  />
                  {attackIncomplete ? (
                    <p className="mt-1.5 text-(--ember) text-xs">
                      El ataque necesita nombre y definición — o ninguno de los
                      dos.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={btn.primary}
                  disabled={
                    update.isPending ||
                    name.trim().length === 0 ||
                    attackIncomplete
                  }
                  onClick={() =>
                    update.mutate({
                      id,
                      name,
                      bio: bio.trim().length > 0 ? bio : null,
                      cardPortrait: portrait.length > 0 ? portrait : null,
                      cardAbility:
                        abilityName.trim().length > 0
                          ? abilityName.trim()
                          : null,
                      cardAbilityText:
                        abilityText.trim().length > 0
                          ? abilityText.trim()
                          : null,
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
          ) : initialBio ? (
            <BioParchment text={initialBio} />
          ) : (
            <p className="text-(--faded)">Sin biografía.</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export { PlayerProfile };
