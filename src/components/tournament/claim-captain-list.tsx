'use client';

import { PlayerChip } from '@/components/tournament/player-chip';

type ClaimCaptainListProps = {
  captainIds: string[];
  getPlayerName: (playerId: string) => string;
  claiming: boolean;
  error?: string;
  onClaim: (captainId: string) => void;
};

const ClaimCaptainList = ({
  captainIds,
  getPlayerName,
  claiming,
  error,
  onClaim,
}: ClaimCaptainListProps) => (
  <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-4 py-12">
    <h1 className="d-display font-bold text-2xl uppercase tracking-wide">
      ¿Quién eres?
    </h1>
    <p className="text-(--faded) text-sm">Toca tu nombre para reclamarlo.</p>
    <div className="flex flex-col gap-2">
      {captainIds.map((captainId) => (
        <button
          className="w-full text-left"
          disabled={claiming}
          key={captainId}
          onClick={() => onClaim(captainId)}
          type="button"
        >
          <PlayerChip name={getPlayerName(captainId)} />
        </button>
      ))}
    </div>
    {error ? <p className="text-(--ember) text-xs">{error}</p> : null}
  </main>
);

export { ClaimCaptainList };
