'use client';

import { useRouter } from 'next/navigation';

import { btn } from '@/components/theme/primitives';
import { authClient } from '@/server/better-auth/client';

type UserMenuProps = {
  label: string;
};

/**
 * Only the sign-out action needs to be interactive. The session itself is
 * resolved on the server so the nav renders identically on both sides.
 */
const UserMenu = ({ label }: UserMenuProps) => {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-(--hair-gold) bg-linear-to-b from-(--gold-hi) to-(--gold-dark) font-bold font-mono text-[#211803] text-xs">
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="hidden font-bold text-sm sm:inline">{label}</span>
      <button
        className={`${btn.secondary} px-4 py-1.5 text-sm`}
        onClick={handleSignOut}
        type="button"
      >
        Salir
      </button>
    </div>
  );
};

export { UserMenu };
