'use client';

import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';

type PlayerChipProps = {
  playerId: string;
  subtitle?: string;
};

const PlayerChip = ({ playerId, subtitle }: PlayerChipProps) => {
  const player = MOCK_PLAYERS.find((candidate) => candidate.id === playerId);
  const name = player?.name ?? playerId;

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-panel-2 px-2.5 py-1.5 ring-1 ring-hair">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber font-bold font-mono text-ground text-xs">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-sm">{name}</p>
        {subtitle ? (
          <p className="truncate font-mono text-[0.6rem] text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export { PlayerChip };
