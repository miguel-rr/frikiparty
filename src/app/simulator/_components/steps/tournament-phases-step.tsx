'use client';

import { useEffect } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { StepperInput } from '@/app/simulator/_components/ui/stepper-input';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import type { Phase } from '@/lib/tournament/types';

const defaultGroupPhase = (id: string): Phase => ({
  id,
  type: 'group',
  rounds: 'single',
  gamesToWinMatch: 1,
  tiebreak: 'inverse-ranking',
});

const TournamentPhasesStep = () => {
  const { state, dispatch } = useSimulator();
  const phases = state.phases ?? [];

  useEffect(() => {
    if (state.phases) return;
    dispatch({ type: 'SET_PHASES', phases: [defaultGroupPhase('phase-1')] });
  }, [state.phases, dispatch]);

  const setPhaseCount = (count: number) => {
    const next = Array.from(
      { length: count },
      (_, index) => phases[index] ?? defaultGroupPhase(`phase-${index + 1}`),
    );
    dispatch({ type: 'SET_PHASES', phases: next });
  };

  const updatePhase = (index: number, phase: Phase) => {
    const next = [...phases];
    next[index] = phase;
    dispatch({ type: 'SET_PHASES', phases: next });
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl uppercase tracking-tight">Fases</h2>

      <StepperInput
        label="Número de fases"
        max={6}
        min={1}
        onChange={setPhaseCount}
        value={phases.length || 1}
      />

      <div className="flex flex-col gap-4">
        {phases.map((phase, index) => (
          <div
            className="flex flex-col gap-4 rounded-xl bg-panel-2 p-4 ring-1 ring-hair"
            key={phase.id}
          >
            <p className="font-bold font-mono text-[0.65rem] text-muted uppercase tracking-widest">
              Fase {index + 1}
            </p>

            <SegmentedControl
              onChange={(type) =>
                updatePhase(
                  index,
                  type === 'group'
                    ? defaultGroupPhase(phase.id)
                    : { id: phase.id, type: 'bracket', gamesToWinMatch: 1 },
                )
              }
              options={[
                { value: 'group', label: 'Grupo' },
                { value: 'bracket', label: 'Eliminatoria' },
              ]}
              value={phase.type}
            />

            {phase.type === 'group' ? (
              <>
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
                    Rondas
                  </p>
                  <SegmentedControl
                    onChange={(rounds) =>
                      updatePhase(index, { ...phase, rounds })
                    }
                    options={[
                      { value: 'single', label: 'Partido único' },
                      { value: 'double', label: 'Ida y vuelta' },
                    ]}
                    value={phase.rounds}
                  />
                </div>
                <StepperInput
                  label="Partidas para ganar el partido"
                  max={7}
                  min={1}
                  onChange={(gamesToWinMatch) =>
                    updatePhase(index, { ...phase, gamesToWinMatch })
                  }
                  value={phase.gamesToWinMatch}
                />
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
                    Desempate
                  </p>
                  <SegmentedControl
                    onChange={(tiebreak) =>
                      updatePhase(index, { ...phase, tiebreak })
                    }
                    options={[
                      { value: 'inverse-ranking', label: 'Ranking inverso' },
                      { value: 'inverse-rings', label: 'Anillos inverso' },
                    ]}
                    value={phase.tiebreak}
                  />
                </div>
              </>
            ) : (
              <StepperInput
                label="Partidas para ganar el partido"
                max={7}
                min={1}
                onChange={(gamesToWinMatch) =>
                  updatePhase(index, { ...phase, gamesToWinMatch })
                }
                value={phase.gamesToWinMatch}
              />
            )}
          </div>
        ))}
      </div>

      <WizardNav nextDisabled={phases.length === 0} />
    </section>
  );
};

export { TournamentPhasesStep };
