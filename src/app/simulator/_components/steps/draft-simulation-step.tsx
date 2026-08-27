'use client';

import { useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { PlayerChip } from '@/components/tournament/player-chip';
import {
  getAvailablePotIndices,
  getUndraftedPlayersInPot,
  resolveNextTurn,
} from '@/lib/tournament/draft';

const DraftSimulationStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const [selectedPot, setSelectedPot] = useState<number | null>(null);

  const draft = state.draft;
  const pots = state.pots ?? [];
  const captainIds = state.captainIds ?? [];

  if (!draft) return null;

  const currentCaptain = resolveNextTurn(draft, pots);
  const isComplete = currentCaptain === undefined;
  const availablePots = currentCaptain
    ? getAvailablePotIndices(pots, draft, currentCaptain)
    : [];
  const playersInSelectedPot =
    currentCaptain && selectedPot !== null
      ? getUndraftedPlayersInPot(pots, draft, selectedPot)
      : [];

  const pick = (potIndex: number, playerId: string) => {
    if (!currentCaptain) return;
    dispatch({
      type: 'DRAFT_PICK',
      captainId: currentCaptain,
      potIndex,
      playerId,
    });
    setSelectedPot(null);
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tight">
          Draft
        </h2>
        <p className="font-mono text-muted text-xs">
          Pick {draft.picks.length} / {draft.turnQueue.length}
        </p>
      </div>

      {isComplete ? (
        <p className="font-semibold text-sm">Draft completo.</p>
      ) : (
        <p className="text-sm">
          Turno de{' '}
          <span className="font-bold text-amber">
            {getPlayerName(currentCaptain ?? '')}
          </span>
        </p>
      )}

      {!isComplete ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {availablePots.map((potIndex) => (
              <button
                className={`rounded-full px-4 py-2 font-semibold text-sm ring-1 transition-colors ${
                  selectedPot === potIndex
                    ? 'bg-amber text-ground ring-amber'
                    : 'bg-panel-2 ring-hair hover:bg-hair'
                }`}
                key={potIndex}
                onClick={() => setSelectedPot(potIndex)}
                type="button"
              >
                Bombo {potIndex + 1}
              </button>
            ))}
          </div>

          {selectedPot !== null ? (
            <div className="flex flex-wrap gap-2">
              {playersInSelectedPot.map((playerId) => (
                <button
                  key={playerId}
                  onClick={() => pick(selectedPot, playerId)}
                  type="button"
                >
                  <PlayerChip name={getPlayerName(playerId)} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {captainIds.map((captainId) => (
          <div
            className="flex flex-col gap-2 rounded-xl bg-panel-2/60 p-3 ring-1 ring-hair"
            key={captainId}
          >
            <PlayerChip name={getPlayerName(captainId)} />
            <ul className="flex flex-wrap gap-1.5">
              {draft.picks
                .filter((pickItem) => pickItem.captainId === captainId)
                .map((pickItem) => (
                  <li key={pickItem.playerId}>
                    <PlayerChip name={getPlayerName(pickItem.playerId)} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <WizardNav nextDisabled={!isComplete} nextLabel="Ver equipos" />
    </section>
  );
};

export { DraftSimulationStep };
