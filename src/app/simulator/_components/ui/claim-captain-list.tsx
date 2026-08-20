'use client';

import { PlayerChip } from '@/app/simulator/_components/ui/player-chip';

type ClaimCaptainListProps = {
  captainIds: string[];
  claiming: boolean;
  error?: string;
  onClaim: (captainId: string) => void;
};

const ClaimCaptainList = ({
  captainIds,
  claiming,
  error,
  onClaim,
}: ClaimCaptainListProps) => (
  <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-4 py-12">
    <h1 className="font-display text-2xl uppercase tracking-tight">
      ¿Quién eres?
    </h1>
    <p className="text-muted text-sm">Toca tu nombre para reclamarlo.</p>
    <div className="flex flex-col gap-2">
      {captainIds.map((captainId) => (
        <button
          className="w-full text-left"
          disabled={claiming}
          key={captainId}
          onClick={() => onClaim(captainId)}
          type="button"
        >
          <PlayerChip playerId={captainId} />
        </button>
      ))}
    </div>
    {error ? <p className="text-foe text-xs">{error}</p> : null}
  </main>
);

export { ClaimCaptainList };
