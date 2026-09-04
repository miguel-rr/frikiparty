'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Calendar } from '@/components/live/calendar';
import { BracketView } from '@/components/live/phase/bracket-view';
import { GroupView } from '@/components/live/phase/group-view';
import { SwissView } from '@/components/live/phase/swiss-view';
import { btn, tag } from '@/components/theme/primitives';
import type { LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

const phaseTitle = (p: LivePhase) =>
  p.name ??
  (p.type === 'group'
    ? 'Fase de grupos'
    : p.type === 'bracket'
      ? 'Eliminatorias'
      : 'Suizo');

/** One phase, rendered by its type. */
const PhaseView = ({
  state,
  phase,
  compact,
}: {
  state: LiveState;
  phase: LivePhase;
  compact?: boolean;
}) => {
  if (phase.matches.length === 0) {
    return (
      <p className="text-(--faded) text-sm">Esta fase aún no tiene partidos.</p>
    );
  }
  if (phase.type === 'group')
    return <GroupView compact={compact} phase={phase} state={state} />;
  if (phase.type === 'bracket')
    return <BracketView compact={compact} phase={phase} state={state} />;
  return <SwissView compact={compact} phase={phase} state={state} />;
};

/** The phase page's live wrapper: subscribes and hands the snapshot down. */
const PhaseLive = ({
  initial,
  phaseId,
}: {
  initial: LiveState;
  phaseId: string;
}) => {
  const [state, setState] = useState(initial);
  api.live.onChange.useSubscription(
    { tournamentId: initial.id },
    { onData: setState },
  );
  const phase = state.phases.find((p) => p.id === phaseId);
  if (!phase) return <p className="text-(--faded)">Esa fase ya no existe.</p>;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className={tag}>
            Edición {state.editionYear} · fase {phase.order}
          </span>
          <span className="d-display font-bold text-(--parchment) text-2xl uppercase sm:text-3xl">
            {phaseTitle(phase)}
          </span>
        </div>
        <div className="flex gap-2">
          {state.phases
            .filter((p) => p.id !== phase.id && p.matches.length > 0)
            .map((p) => (
              <Link
                className={btn.outline}
                href={`/live/phase/${p.id}`}
                key={p.id}
              >
                {phaseTitle(p)}
              </Link>
            ))}
          <Link className={btn.outline} href="/live">
            El torneo
          </Link>
        </div>
      </header>
      <PhaseView phase={phase} state={state} />
      {phase.type !== 'bracket' ? (
        <>
          <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
            {phase.type === 'group' ? 'Las jornadas' : 'Las rondas'}
          </h3>
          <Calendar onlyPhaseId={phase.id} state={state} />
        </>
      ) : null}
    </div>
  );
};

/** The phase with something left to play, else the last one with matches. */
const currentPhase = (state: LiveState) =>
  state.phases.find(
    (p) =>
      p.matches.length > 0 && p.matches.some((m) => m.status !== 'completed'),
  ) ?? [...state.phases].reverse().find((p) => p.matches.length > 0);

export { currentPhase, PhaseLive, PhaseView, phaseTitle };
