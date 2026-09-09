'use client';

import { EditionList } from '@/components/editions/edition-list';
import { useSessionUser } from '@/components/layout/auth-slot';
import { isAdmin } from '@/lib/roles';
import type { EditionView } from '@/lib/tournament/edition-view';

/**
 * Rehearsal editions (simulations, dry runs) for the organiser's eyes
 * only: reachable from here, absent from the chronicle everyone reads.
 */
const RehearsalEditions = ({ editions }: { editions: EditionView[] }) => {
  const { user } = useSessionUser();
  if (!isAdmin(user) || editions.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex flex-col gap-1">
        <span className="font-bold font-mono text-(--ember) text-2xs uppercase tracking-2xl">
          Ensayos
        </span>
        <p className="text-(--faded) text-sm">
          Ediciones simuladas para probar el módulo en vivo. No suman anillos ni
          salen en la crónica; sólo el organizador las ve aquí.
        </p>
      </div>
      <EditionList editions={editions} />
    </div>
  );
};

export { RehearsalEditions };
