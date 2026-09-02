'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { btn, input } from '@/components/theme/primitives';
import { authClient } from '@/server/better-auth/client';
import { api } from '@/trpc/react';

type UserMenuProps = {
  label: string;
  role: string;
};

const item =
  'block w-full cursor-pointer px-4 py-2 text-left text-(--faded) text-sm transition-colors hover:bg-[#c9a5570f] hover:text-(--gold-hi)';

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

  const mine = api.player.mine.useQuery(undefined, { enabled: open });

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
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-60 rounded-lg border border-(--hair-gold) bg-(--panel-2) py-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.5)]"
          role="menu"
        >
          <p className="truncate px-4 pt-2 pb-1.5 font-bold text-(--parchment) text-sm">
            {label}
          </p>
          <div className="mx-2 my-1 h-px bg-(--hair)" />
          {linking ? (
            <LinkPlayerForm
              onDone={() => {
                setLinking(false);
                mine.refetch();
                router.refresh();
              }}
            />
          ) : (
            <>
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

/** Code entry inside the dropdown: one field, one button, the error inline. */
const LinkPlayerForm = ({ onDone }: { onDone: () => void }) => {
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
    <form className="flex flex-col gap-2 px-3 py-2" onSubmit={handleSubmit}>
      <p className="text-(--faded) text-xs">
        Introduce el código que te ha dado el admin.
      </p>
      <input
        aria-label="Código de jugador"
        autoCapitalize="characters"
        autoComplete="off"
        className={`${input} font-mono text-sm uppercase tracking-[0.18em]`}
        onChange={(event) => setCode(event.target.value)}
        placeholder="XXXX-XXXX"
        ref={inputRef}
        spellCheck={false}
        value={code}
      />
      {link.error ? (
        <p className="text-(--ember) text-xs">{link.error.message}</p>
      ) : null}
      <button
        className={`${btn.primary} px-4 py-1.5 text-sm`}
        disabled={link.isPending || !code.trim()}
        type="submit"
      >
        {link.isPending ? 'Vinculando…' : 'Vincular'}
      </button>
    </form>
  );
};

export { UserMenu };
