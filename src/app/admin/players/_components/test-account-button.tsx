'use client';

import { useRouter } from 'next/navigation';

import { btn } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

/**
 * Outside production only: gives a player an account nobody can sign into
 * (made-up address), so "Entrar como" can drive that player from another
 * browser during rehearsals.
 */
const TestAccountButton = ({ playerId }: { playerId: string }) => {
  const router = useRouter();
  const create = api.player.createTestAccount.useMutation({
    onSuccess: () => router.refresh(),
  });
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        className={`${btn.secondary} px-3 py-1 text-xs`}
        disabled={create.isPending}
        onClick={() => create.mutate({ playerId })}
        type="button"
      >
        {create.isPending ? 'Creando…' : 'Cuenta de pruebas'}
      </button>
      {create.error ? (
        <span className="text-(--ember) text-xs">{create.error.message}</span>
      ) : null}
    </span>
  );
};

export { TestAccountButton };
