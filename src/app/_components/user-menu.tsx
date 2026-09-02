'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { authClient } from '@/server/better-auth/client';

type UserMenuProps = {
  label: string;
};

/**
 * The signed-in corner: just the initial in a gold ring. Clicking it opens
 * a dropdown that today only signs out — user and admin entries will grow
 * here over time.
 */
const UserMenu = ({ label }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-52 rounded-lg border border-(--hair-gold) bg-(--panel-2) py-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.5)]"
          role="menu"
        >
          <p className="truncate px-4 pt-2 pb-1.5 font-bold text-(--parchment) text-sm">
            {label}
          </p>
          <div className="mx-2 my-1 h-px bg-(--hair)" />
          <button
            className="w-full cursor-pointer px-4 py-2 text-left text-(--faded) text-sm transition-colors hover:bg-[#c9a5570f] hover:text-(--gold-hi)"
            onClick={handleSignOut}
            role="menuitem"
            type="button"
          >
            Salir
          </button>
        </div>
      ) : null}
    </div>
  );
};

export { UserMenu };
