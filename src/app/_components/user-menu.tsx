'use client';

import { useRouter } from 'next/navigation';

import { authClient } from '@/server/better-auth/client';

type UserMenuProps = {
  label: string;
};

/**
 * Only the sign-out action needs to be interactive. The session itself is
 * resolved on the server so the header renders identically on both sides.
 */
const UserMenu = ({ label }: UserMenuProps) => {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber font-bold font-mono text-ground text-xs">
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="font-bold text-sm">{label}</span>
      <button
        className="rounded-full bg-panel-2 px-4 py-2 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
        onClick={handleSignOut}
        type="button"
      >
        Salir
      </button>
    </div>
  );
};

export { UserMenu };
