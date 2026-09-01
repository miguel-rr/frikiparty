'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { btn } from '@/components/theme/primitives';
import {
  combineBallotsToRanking,
  combineRankings,
  sortByHistoricalRanking,
} from '@/lib/tournament/ranking';

const SimulatedVotingStep = () => {
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
  const players = state.players
    .filter((player) => state.participantIds.includes(player.id))
    .map((player) => ({
      ...player,
      rings: 0,
      individualRings: 0,
    }));

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
      <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
        Votación
      </h2>
      <p className="text-(--faded) text-sm">
        Cada participante ordena al resto de mejor a peor. Como esto es un
        simulador de un solo usuario, las papeletas se generan automáticamente.
      </p>

      <button
        className={`${btn.secondary} self-start px-5 py-2 text-sm`}
        onClick={() => dispatch({ type: 'GENERATE_BALLOTS' })}
        type="button"
      >
        Sortear votos
      </button>

      {preview ? (
        <ol className="flex flex-col gap-1.5">
          {preview.map((playerId, index) => (
            <li
              className="flex items-center gap-3 rounded-lg bg-(--panel-2) px-3 py-2 text-sm ring-(--hair) ring-1"
              key={playerId}
            >
              <span className="w-6 font-mono text-(--faded) text-xs">
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
