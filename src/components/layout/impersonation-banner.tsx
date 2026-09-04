'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/server/better-auth/client';

/**
 * Shown while an admin is signed in as someone else ("Entrar como"): who
 * this browser currently is, and the way back. Sits right under the nav.
 */
const ImpersonationBanner = () => {
  const { data } = authClient.useSession();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const impersonatedBy = (
    data?.session as { impersonatedBy?: string | null } | undefined
  )?.impersonatedBy;
  if (!data || !impersonatedBy) return null;
  const stop = async () => {
    setLeaving(true);
    await authClient.admin.stopImpersonating();
    router.push('/admin/players');
    router.refresh();
  };
  return (
    <div className="sticky top-14 z-30 border-(--ember)/40 border-b bg-[#2a1410f2] text-sm backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <span className="text-(--parchment)">
          Estás actuando como{' '}
          <strong className="text-(--gold-hi)">{data.user.name}</strong>
        </span>
        <button
          className="rounded-full border border-(--gold)/60 px-3 py-1 font-mono text-(--gold) text-xs uppercase tracking-2xl transition-colors hover:border-(--gold) hover:text-(--gold-hi) disabled:opacity-60"
          disabled={leaving}
          onClick={stop}
          type="button"
        >
          {leaving ? 'Volviendo…' : 'Volver a mi cuenta'}
        </button>
      </div>
    </div>
  );
};

export { ImpersonationBanner };
