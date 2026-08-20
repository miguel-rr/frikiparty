'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';
import {
  combineBallotsToRanking,
  combineRankings,
  sortByHistoricalRanking,
} from '@/lib/simulator/ranking';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const SimulatedVotingStep = () => {
  const { state, dispatch } = useSimulator();
  const players = MOCK_PLAYERS.filter((player) =>
    state.participantIds.includes(player.id),
  );

  const preview = state.ballots
    ? (() => {
        const voting = combineBallotsToRanking(
          state.ballots ?? [],
          state.participantIds,
        );
        if (state.rankingSource !== 'combined') return voting;
        const historical = sortByHistoricalRanking(players);
        return combineRankings(
          historical,
          voting,
          state.historicalWeight ?? 50,
        );
      })()
    : null;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl uppercase tracking-tight">
        Votación
      </h2>
      <p className="text-muted text-sm">
        Cada participante ordena al resto de mejor a peor. Como esto es un
        simulador de un solo usuario, las papeletas se generan automáticamente.
      </p>

      <button
        className="self-start rounded-full bg-panel-2 px-5 py-2.5 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
        onClick={() => dispatch({ type: 'GENERATE_BALLOTS' })}
        type="button"
      >
        Sortear votos
      </button>

      {preview ? (
        <ol className="flex flex-col gap-1.5">
          {preview.map((playerId, index) => (
            <li
              className="flex items-center gap-3 rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair"
              key={playerId}
            >
              <span className="w-6 font-mono text-muted text-xs">
                {index + 1}
              </span>
              <span className="font-semibold">{getPlayerName(playerId)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <WizardNav nextDisabled={!state.ballots} />
    </section>
  );
};

export { SimulatedVotingStep };
