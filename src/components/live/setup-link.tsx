'use client';

import Link from 'next/link';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn } from '@/components/theme/primitives';
import { isAdmin } from '@/lib/roles';

/**
 * The organiser's way into the tournament setup, from the door of /live.
 * A tournament in preparation is private until "Dar comienzo": only the
 * organiser is told it exists.
 */
const SetupLink = ({ preparing }: { preparing: boolean }) => {
  const { user } = useSessionUser();
  if (!isAdmin(user)) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <Link className={btn.outline} href="/live/setup">
        {preparing ? 'Seguir preparando el torneo' : 'Preparar el torneo'}
      </Link>
      {preparing ? (
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          Hay un torneo en preparación · nadie lo ve hasta "Dar comienzo"
        </span>
      ) : null}
    </div>
  );
};

export { SetupLink };
