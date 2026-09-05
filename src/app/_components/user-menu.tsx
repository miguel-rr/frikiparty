'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { btn, input, label } from '@/components/theme/primitives';
import { ASPIRANTS_ANCHOR } from '@/lib/council';
import { authClient } from '@/server/better-auth/client';
import { api } from '@/trpc/react';

type UserMenuProps = {
  label: string;
  role: string;
};

// Right-aligned like the avatar the menu hangs from.
const item =
  'block w-full cursor-pointer px-4 py-2 text-right text-(--faded) text-sm transition-colors hover:bg-(--gold)/6 hover:text-(--gold-hi)';

/**
 * The signed-in corner: just the initial in a gold ring. The dropdown
 * holds the player link (claim by code, or a shortcut once claimed), the
 * admin entries, and sign out.
 */
const UserMenu = ({ label, role }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetched as soon as the menu mounts (the user is signed in), not when
  // it opens: by the time anyone clicks, the answer is almost always here.
  const mine = api.player.mine.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  // Same timing: the attendance row is ready before the menu opens.
  const attendance = api.edition.myAttendance.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const utils = api.useUtils();
  // Either way the answer changes, the /council table redraws from its
  // query — the static page regenerates behind, but nobody waits for it.
  const settleAttendance = () => {
    attendance.refetch();
    utils.edition.confirmedPlayers.invalidate();
    router.refresh();
  };
  // Confirming takes you to the table with your card already on it: the
  // fresh list is fetched into the cache first, so the roster mounts (or
  // re-renders, if you're on /council already) with it, then the page
  // scrolls to the anchor.
  const confirmAttendance = api.edition.confirmMyAttendance.useMutation({
    onSuccess: async () => {
      attendance.refetch();
      const editionId = attendance.data?.editionId;
      if (editionId) {
        // staleTime 0: the client's default (30s) would hand back the
        // pre-confirmation list when the table was refetched recently.
        await utils.edition.confirmedPlayers.fetch(
          { editionId },
          { staleTime: 0 },
        );
      }
      setOpen(false);
      if (pathname === '/council') {
        // The table is already live here; a refresh would only rewrite
        // the URL and drop the anchor we just set.
        scrollToAspirants();
        return;
      }
      router.push(`/council#${ASPIRANTS_ANCHOR}`);
      router.refresh();
    },
  });
  const withdrawAttendance = api.edition.withdrawMyAttendance.useMutation({
    onSuccess: settleAttendance,
  });
  const attendanceError = confirmAttendance.error ?? withdrawAttendance.error;

  // Close on outside click or Escape, like any well-behaved menu.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Every open starts on the plain menu, not on a half-typed code.
  useEffect(() => {
    if (!open) {
      setLinking(false);
    }
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await authClient.signOut();
    router.refresh();
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de ${label}`}
        className="grid size-9 cursor-pointer place-items-center rounded-full border border-(--hair-gold) bg-linear-to-b from-(--gold-hi) to-(--gold-dark) font-bold font-mono text-[#211803] text-sm transition-shadow hover:shadow-[0_0_10px_rgba(201,165,87,0.45)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {label.charAt(0).toUpperCase()}
      </button>
      {open ? (
        <div
          className={`absolute top-[calc(100%+10px)] right-0 z-50 rounded-lg border border-(--hair-gold) bg-(--panel-2) py-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.5)] ${linking ? 'w-72' : 'w-60'}`}
          role="menu"
        >
          {linking ? null : (
            <>
              <p className="truncate px-4 pt-2 pb-1.5 text-right font-bold text-(--parchment) text-sm">
                {label}
              </p>
              <div className="mx-2 my-1 h-px bg-(--hair)" />
            </>
          )}
          {linking ? (
            <LinkPlayerForm
              onCancel={() => setLinking(false)}
              onDone={() => {
                setLinking(false);
                mine.refetch();
                attendance.refetch();
                router.refresh();
              }}
            />
          ) : (
            <>
              {/* The player slot always takes its row, so the entries
                  below never jump once the answer arrives. */}
              {mine.data ? (
                <Link
                  className={item}
                  href={`/players/${mine.data.slug}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  Mi jugador
                </Link>
              ) : mine.data === null ? (
                <button
                  className={item}
                  onClick={() => setLinking(true)}
                  role="menuitem"
                  type="button"
                >
                  Vincular jugador
                </button>
              ) : (
                <span
                  aria-hidden
                  className={`${item} cursor-default text-(--hair-gold)`}
                >
                  …
                </span>
              )}
              {/* The call to the next edition, for linked players only:
                  confirm from here, or see yourself among the summoned. */}
              {mine.data && attendance.data ? (
                attendance.data.confirmed ? (
                  <AttendanceConfirmed
                    onWithdraw={() => withdrawAttendance.mutate()}
                    pending={withdrawAttendance.isPending}
                    year={attendance.data.year}
                  />
                ) : (
                  <button
                    className={`${item} disabled:cursor-wait`}
                    disabled={confirmAttendance.isPending}
                    onClick={() => confirmAttendance.mutate()}
                    role="menuitem"
                    type="button"
                  >
                    {confirmAttendance.isPending
                      ? 'Confirmando…'
                      : 'Confirmar asistencia'}
                    <EditionTag year={attendance.data.year} />
                  </button>
                )
              ) : null}
              {attendanceError ? (
                <p className="px-4 pb-1.5 text-right text-(--ember) text-xs leading-snug">
                  {attendanceError.message}
                </p>
              ) : null}
              {/* The library, for whoever may enter it: a claimed player,
                  an editor, an admin. */}
              {role === 'admin' || role === 'editor' || mine.data ? (
                <Link
                  className={item}
                  href="/archive"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  Los Archivos
                </Link>
              ) : null}
              {role === 'admin' ? (
                <Link
                  className={item}
                  href="/admin/players"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  Jugadores
                </Link>
              ) : null}
              {role === 'admin' ? (
                <Link
                  className={item}
                  href="/admin/games"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  Juegos
                </Link>
              ) : null}
              <button
                className={item}
                onClick={handleSignOut}
                role="menuitem"
                type="button"
              >
                Salir
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

/** Breathing room between the sticky nav and the table's eyebrow. */
const ASPIRANTS_SCROLL_GAP = 40;

/**
 * Glide to the aspirants table when already on /council. Done by hand
 * rather than pushing the hash: Next's hash navigation jumps instantly,
 * and its landing spot leaves the eyebrow under the sticky nav. The URL
 * still gets the anchor, via replaceState so nothing jumps.
 */
const scrollToAspirants = () => {
  const target = document.getElementById(ASPIRANTS_ANCHOR);
  if (!target) {
    return;
  }
  const navHeight = document.querySelector('nav')?.offsetHeight ?? 0;
  const top =
    target.getBoundingClientRect().top +
    window.scrollY -
    navHeight -
    ASPIRANTS_SCROLL_GAP;
  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  window.history.replaceState(window.history.state, '', `#${ASPIRANTS_ANCHOR}`);
};

/** Second line under an attendance entry: which edition it is about. */
const EditionTag = ({ year }: { year: number }) => (
  <span className="block font-mono text-(--gold) text-3xs uppercase tracking-2xl">
    Edición {year}
  </span>
);

/**
 * The confirmed state as one block, not a menu row: the check line, and
 * under it the edition tag with a small "Retirar" riding the same line.
 * Retirar asks first, in place — the block turns into the question with
 * its two answers, and the menu closing (unmount) drops the question.
 */
const AttendanceConfirmed = ({
  onWithdraw,
  pending,
  year,
}: {
  onWithdraw: () => void;
  pending: boolean;
  year: number;
}) => {
  const [asking, setAsking] = useState(false);
  return (
    <div className="px-4 py-2 text-right text-sm" role="none">
      {asking ? (
        <>
          <p className="text-(--parchment)">
            ¿Retirar tu asistencia?
            <EditionTag year={year} />
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              className={`${btn.ghost} px-3 py-1 text-xs`}
              onClick={() => setAsking(false)}
              type="button"
            >
              No
            </button>
            <button
              className={`${btn.danger} px-3 py-1 text-xs disabled:cursor-wait disabled:opacity-60`}
              disabled={pending}
              onClick={onWithdraw}
              type="button"
            >
              {pending ? 'Retirando…' : 'Sí, retirar'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-(--faded)">
            <span className="text-(--gold)">✓</span> Asistencia confirmada
          </p>
          <p className="mt-0.5 flex items-baseline justify-end gap-1.5 font-mono text-3xs uppercase tracking-2xl">
            <span className="text-(--gold)">Edición {year}</span>
            <span aria-hidden className="text-(--hair-gold)">
              ·
            </span>
            <button
              className="cursor-pointer text-(--faded) underline-offset-2 transition-colors hover:text-(--ember) hover:underline"
              onClick={() => setAsking(true)}
              type="button"
            >
              Retirar
            </button>
          </p>
        </>
      )}
    </div>
  );
};

/** Code entry inside the dropdown: a labelled field, Vincular and a way back. */
const LinkPlayerForm = ({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const link = api.player.linkByCode.useMutation({ onSuccess: onDone });

  // The form only appears on request, so the field gets focus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim()) {
      link.mutate({ code });
    }
  };

  return (
    <form
      className="flex flex-col gap-4 px-4 pt-2 pb-3"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-(--parchment) text-sm">
          Vincular jugador
        </span>
        <p className="text-(--faded) text-xs leading-snug">
          Introduce el código que te ha dado el admin.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor="link-player-code">
          Código
        </label>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          className={`${input} text-center font-mono text-base uppercase tracking-3xl`}
          id="link-player-code"
          onChange={(event) => setCode(event.target.value)}
          placeholder="XXXX-XXXX"
          ref={inputRef}
          spellCheck={false}
          value={code}
        />
        {link.error ? (
          <p className="text-(--ember) text-xs leading-snug">
            {link.error.message}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          className={`${btn.ghost} px-3 py-1.5 text-sm`}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={link.isPending || !code.trim()}
          type="submit"
        >
          {link.isPending ? 'Vinculando…' : 'Vincular'}
        </button>
      </div>
    </form>
  );
};

export { UserMenu };
