'use client';

import Link from 'next/link';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn } from '@/components/theme/primitives';
import { isAdmin } from '@/lib/roles';

/** The organiser's way into the tournament setup, from the door of /live. */
const SetupLink = () => {
  const { user } = useSessionUser();
  if (!isAdmin(user)) return null;
  return (
    <div className="flex justify-center">
      <Link className={btn.outline} href="/live/setup">
        Preparar el torneo
      </Link>
    </div>
  );
};

export { SetupLink };
