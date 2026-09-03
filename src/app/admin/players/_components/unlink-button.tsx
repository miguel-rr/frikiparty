'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/trpc/react';

const quiet =
  'cursor-pointer rounded-full border border-(--hair) px-2.5 py-1 font-mono text-(--faded) text-[0.58rem] uppercase tracking-[0.18em] transition-colors hover:border-[#cf6a4873] hover:text-(--ember)';

/**
 * Detach an account from its player, confirming in place. The player gets
 * a new code and the account drops to the "sin jugador" list below.
 */
const UnlinkButton = ({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState(false);
  const unlink = api.player.unlinkUser.useMutation({
    onSuccess: () => {
      // The admin may be detaching their own account.
      utils.player.mine.invalidate();
      utils.media.access.invalidate();
      router.refresh();
    },
  });

  if (!confirming) {
    return (
      <button
        className={quiet}
        onClick={() => setConfirming(true)}
        type="button"
      >
        Desvincular
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-(--ember) text-xs">
        ¿Soltar la cuenta de {playerName}?
      </span>
      <button
        className={`${quiet} border-[#cf6a4873] text-(--ember)`}
        disabled={unlink.isPending}
        onClick={() => unlink.mutate({ playerId })}
        type="button"
      >
        {unlink.isPending ? 'Soltando…' : 'Sí'}
      </button>
      <button
        className={quiet}
        onClick={() => setConfirming(false)}
        type="button"
      >
        No
      </button>
      {unlink.error ? (
        <span className="text-(--ember) text-xs">{unlink.error.message}</span>
      ) : null}
    </span>
  );
};

export { UnlinkButton };
