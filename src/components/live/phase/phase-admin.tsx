'use client';

import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { phaseTitle } from '@/components/live/phase/phase-view';
import { ReorderList } from '@/components/live/reorder-list';
import { btn, panelGold, RingGlyph } from '@/components/theme/primitives';
import {
  activePhase,
  champion,
  nextPhase,
  openTies,
  phaseIsComplete,
  qualifiersSeeding,
  swissRecords,
} from '@/lib/live/progression';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import type { LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

const errorText = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Error';

/** The champions, once the last phase is done. Everyone sees it. */
const ChampionBanner = ({ state }: { state: LiveState }) => {
  const winnerId = champion(state);
  const team = state.teams.find((t) => t.id === winnerId);
  if (!team || state.stage !== 'completed') return null;
  return (
    <div
      className={`${panelGold} flex flex-col items-center gap-2 p-6 text-center`}
    >
      <span className="flex items-center gap-2 font-mono text-(--gold) text-2xs uppercase tracking-2xl">
        <RingGlyph size={13} tone="solitaire" /> Campeones de la edición{' '}
        {state.editionYear}
      </span>
      <span className="d-display d-gold-text font-black text-3xl uppercase">
        {teamLabel(team)}
      </span>
      <span className="text-(--parchment) text-sm">{teamRoster(team)}</span>
    </div>
  );
};

/**
 * An open tie in a group, for the organiser: settle it by lot, in an order
 * they give, or with tie-break matches (recording the order afterwards).
 */
const TieResolver = ({
  state,
  phase,
  groupId,
  teamIds,
}: {
  state: LiveState;
  phase: LivePhase;
  groupId: string;
  teamIds: string[];
}) => {
  const [order, setOrder] = useState(teamIds);
  const [error, setError] = useState<string | null>(null);
  const resolve = api.match.resolveTie.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const matches = api.match.createTiebreakMatches.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const args = { tournamentId: state.id, phaseId: phase.id, groupId, teamIds };
  const hasTiebreakMatches = phase.matches.some(
    (m) =>
      m.isTiebreak &&
      m.groupId === groupId &&
      teamIds.includes(m.teamAId ?? ''),
  );
  return (
    <div className={`${panelGold} flex flex-col gap-3 p-4`}>
      <span className="font-mono text-(--ember) text-2xs uppercase tracking-2xl">
        Empate por resolver · {teamIds.length} equipos
      </span>
      <ReorderList
        ids={order}
        onChange={setOrder}
        renderItem={(id) => (
          <span className="text-(--parchment) text-sm">
            {teamLabel(teamById.get(id))}
          </span>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className={btn.primary}
          disabled={resolve.isPending}
          onClick={() =>
            resolve.mutate({ ...args, teamIds: order, method: 'manual' })
          }
          type="button"
        >
          Fijar este orden
        </button>
        <button
          className={btn.secondary}
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ ...args, method: 'draw' })}
          type="button"
        >
          A suertes
        </button>
        {!hasTiebreakMatches ? (
          <button
            className={btn.outline}
            disabled={matches.isPending}
            onClick={() => matches.mutate(args)}
            type="button"
          >
            Partidos de desempate
          </button>
        ) : (
          <span className="self-center font-mono text-(--faded) text-3xs uppercase">
            hay partidos de desempate en el calendario; fija el orden con su
            resultado
          </span>
        )}
      </div>
      {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
    </div>
  );
};

/** The next phase's entrants as the server will seed them, for the organiser to review and confirm. */
const NextPhasePanel = ({ state }: { state: LiveState }) => {
  const active = activePhase(state);
  const next = nextPhase(state);
  const [error, setError] = useState<string | null>(null);
  const generate = api.match.generateNext.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  if (!active || !next || next.matches.length > 0) return null;
  if (!phaseIsComplete(state, active)) return null;
  const proposed =
    active.type === 'group'
      ? qualifiersSeeding(state, active)
      : active.type === 'swiss'
        ? [...swissRecords(active)]
            .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
            .map((t) => t.id)
        : null;
  if (!proposed) return null;
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  return (
    <div className={`${panelGold} flex flex-col gap-3 p-5`}>
      <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
        {phaseTitle(active)} terminada · siguiente: {phaseTitle(next)}
      </span>
      <ol className="flex flex-col gap-1 text-sm">
        {proposed.map((id, index) => (
          <li className="flex items-baseline gap-3" key={id}>
            <span className="w-6 font-bold font-mono text-(--gold)">
              {index + 1}
            </span>
            <span className="text-(--parchment)">
              {teamLabel(teamById.get(id))}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-(--faded) text-xs">
        Cabezas de serie en este orden: el primero contra el último, y así hasta
        el centro.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={generate.isPending}
          onClick={() =>
            generate.mutate({ tournamentId: state.id, seedOrder: proposed })
          }
          type="button"
        >
          {generate.isPending ? 'Forjando…' : `Generar ${phaseTitle(next)}`}
        </button>
        {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
      </div>
    </div>
  );
};

/** What the organiser sees under a phase: ties to settle and the door to the next phase. */
const PhaseAdmin = ({
  state,
  phase,
}: {
  state: LiveState;
  phase: LivePhase;
}) => {
  const { user } = useSessionUser();
  if (user?.role !== 'admin') return null;
  const ties = phase.type === 'group' ? openTies(state, phase) : [];
  const allPlayed =
    phase.matches.length > 0 &&
    !phase.matches.some(
      (m) => !m.byeTeamId && m.status !== 'completed' && m.teamAId && m.teamBId,
    );
  return (
    <div className="flex flex-col gap-4">
      {allPlayed
        ? ties.map((tie) => (
            <TieResolver
              groupId={tie.groupId}
              key={tie.teamIds.join()}
              phase={phase}
              state={state}
              teamIds={tie.teamIds}
            />
          ))
        : null}
      <NextPhasePanel state={state} />
    </div>
  );
};

export { ChampionBanner, PhaseAdmin };
