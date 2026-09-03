'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btn } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

/**
 * The admin's hand: pick a free player for an account that never typed
 * its code. The page re-renders after linking, so the row disappears from
 * this list and the player shows the account in the roster above.
 */
const LinkUserRow = ({
  userId,
  freePlayers,
}: {
  userId: string;
  freePlayers: { id: string; name: string }[];
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [playerId, setPlayerId] = useState('');
  const link = api.player.linkUser.useMutation({
    onSuccess: () => {
      // The admin may have linked their own account: the user menu's
      // "Mi jugador" and the archive access come from these queries.
      utils.player.mine.invalidate();
      utils.media.access.invalidate();
      router.refresh();
    },
  });

  if (freePlayers.length === 0) {
    return (
      <span className="text-(--faded) text-xs italic">
        No queda ningún jugador libre.
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Jugador"
        className="min-w-44 appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-1.5 text-(--parchment) text-sm transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none"
        disabled={link.isPending}
        onChange={(event) => setPlayerId(event.target.value)}
        value={playerId}
      >
        <option value="">Elegir jugador…</option>
        {freePlayers.map((freePlayer) => (
          <option key={freePlayer.id} value={freePlayer.id}>
            {freePlayer.name}
          </option>
        ))}
      </select>
      <button
        className={`${btn.primary} px-4 py-1.5 text-xs`}
        disabled={!playerId || link.isPending}
        onClick={() => link.mutate({ userId, playerId })}
        type="button"
      >
        {link.isPending ? 'Vinculando…' : 'Vincular'}
      </button>
      {link.error ? (
        <span className="text-(--ember) text-xs">{link.error.message}</span>
      ) : null}
    </div>
  );
};

export { LinkUserRow };
