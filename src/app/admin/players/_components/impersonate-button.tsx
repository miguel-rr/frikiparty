'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btn } from '@/components/theme/primitives';
import { authClient } from '@/server/better-auth/client';

/**
 * "Entrar como": this browser becomes that user (a real better-auth
 * session, marked as impersonated). Outside production only; the server
 * refuses it there. Lands on /live, where the rehearsal happens.
 */
const ImpersonateButton = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enter = async () => {
    setPending(true);
    setError(null);
    const result = await authClient.admin.impersonateUser({ userId });
    if (result.error) {
      setError(result.error.message ?? 'No se ha podido entrar.');
      setPending(false);
      return;
    }
    router.push('/live');
    router.refresh();
  };
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        className={`${btn.outline} px-3 py-1`}
        disabled={pending}
        onClick={enter}
        type="button"
      >
        {pending ? 'Entrando…' : 'Entrar como'}
      </button>
      {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
    </span>
  );
};

export { ImpersonateButton };
