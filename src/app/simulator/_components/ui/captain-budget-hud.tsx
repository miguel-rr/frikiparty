'use client';

import { PlayerChip } from '@/app/simulator/_components/ui/player-chip';

type CaptainBudgetHudProps = {
  captainIds: string[];
  budgets: Record<string, number>;
  rosters: Record<string, string[]>;
  activeCaptainId?: string;
};

const CaptainBudgetHud = ({
  captainIds,
  budgets,
  rosters,
  activeCaptainId,
}: CaptainBudgetHudProps) => (
  <div className="flex flex-col gap-3">
    {captainIds.map((captainId) => (
      <div
        className={`flex flex-col gap-2 rounded-xl p-3 ring-1 transition-colors ${
          captainId === activeCaptainId
            ? 'bg-panel-2 ring-amber'
            : 'bg-panel-2/60 ring-hair'
        }`}
        key={captainId}
      >
        <div className="flex items-center justify-between gap-2">
          <PlayerChip playerId={captainId} />
          <span className="font-bold font-mono text-amber text-sm">
            {budgets[captainId] ?? 0}
          </span>
        </div>
        {(rosters[captainId]?.length ?? 0) > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {rosters[captainId]?.map((playerId) => (
              <li key={playerId}>
                <PlayerChip playerId={playerId} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ))}
  </div>
);

export { CaptainBudgetHud };
