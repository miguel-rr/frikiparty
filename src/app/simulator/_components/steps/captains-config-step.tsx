'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const CaptainsConfigStep = () => {
  const { state, dispatch } = useSimulator();
  const pots = state.pots ?? [];
  const captainIds = state.captainIds ?? [];
  const teamCount = state.teamCount ?? pots[0]?.length ?? 0;

  const toggle = (playerId: string) => {
    const next = captainIds.includes(playerId)
      ? captainIds.filter((id) => id !== playerId)
      : [...captainIds, playerId];
    dispatch({ type: 'SET_CAPTAINS', captainIds: next });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tight">
          Capitanes
        </h2>
        <p className="font-mono text-muted text-xs">
          {captainIds.length} / {teamCount}
        </p>
      </div>
      <p className="text-muted text-sm">
        Por defecto son los jugadores del bombo 1 (cabezas de serie). Puedes
        cambiarlos, pero tiene que haber exactamente uno por equipo.
      </p>

      {pots.map((pot, potIndex) => (
        <div
          className="flex flex-col gap-2"
          // biome-ignore lint/suspicious/noArrayIndexKey: pot tiers are positionally fixed, only their members move.
          key={`pot-${potIndex}`}
        >
          <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
            Bombo {potIndex + 1}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pot.map((playerId) => {
              const checked = captainIds.includes(playerId);
              return (
                <li key={playerId}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ring-1 transition-colors ${
                      checked
                        ? 'bg-panel-2 ring-amber'
                        : 'bg-panel-2/40 ring-hair'
                    }`}
                  >
                    <span className="font-semibold">
                      {getPlayerName(playerId)}
                    </span>
                    <input
                      checked={checked}
                      className="accent-amber"
                      onChange={() => toggle(playerId)}
                      type="checkbox"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <WizardNav
        nextDisabled={captainIds.length !== teamCount || teamCount === 0}
      />
    </section>
  );
};

export { CaptainsConfigStep };
