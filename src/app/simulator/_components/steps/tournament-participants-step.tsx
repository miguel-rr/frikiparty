'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const MIN_PARTICIPANTS = 6;

const TournamentParticipantsStep = () => {
  const { state, dispatch } = useSimulator();

  const toggle = (playerId: string) => {
    const next = state.participantIds.includes(playerId)
      ? state.participantIds.filter((id) => id !== playerId)
      : [...state.participantIds, playerId];
    dispatch({ type: 'SET_PARTICIPANTS', participantIds: next });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tight">
          Participantes
        </h2>
        <p className="font-mono text-muted text-xs">
          {state.participantIds.length} jugadores
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {state.players.map((player) => {
          const checked = state.participantIds.includes(player.id);
          return (
            <li key={player.id}>
              <label
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ring-1 transition-colors ${
                  checked
                    ? 'bg-panel-2 ring-hair'
                    : 'bg-panel-2/40 text-muted ring-hair/50'
                }`}
              >
                <span className="font-semibold">{player.name}</span>
                <input
                  checked={checked}
                  className="accent-amber"
                  onChange={() => toggle(player.id)}
                  type="checkbox"
                />
              </label>
            </li>
          );
        })}
      </ul>

      {state.participantIds.length < MIN_PARTICIPANTS ? (
        <p className="text-foe text-xs">
          Hacen falta al menos {MIN_PARTICIPANTS} jugadores.
        </p>
      ) : null}

      <WizardNav
        nextDisabled={state.participantIds.length < MIN_PARTICIPANTS}
      />
    </section>
  );
};

export { TournamentParticipantsStep };
