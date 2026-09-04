'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { PotsReveal } from '@/components/live/pots-reveal';
import { RankingBlock } from '@/components/live/ranking-block';
import { StageTimeline } from '@/components/live/stage-timeline';
import { VotingStatus } from '@/components/live/voting-status';
import { btn, panel, panelGold, tag } from '@/components/theme/primitives';
import { STAGE_META } from '@/lib/live/stages';
import { stageIndex } from '@/lib/tournament/stages';
import { describeTeamsLayout } from '@/lib/tournament/teams-layout';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/**
 * The live block: what /live shows now and /council shows once the
 * tournament has begun. Renders from the snapshot it was given and keeps
 * itself current through the change subscription (a fresh snapshot each
 * time the tournament's version moves).
 */
const LiveHub = ({ initial }: { initial: LiveState }) => {
  const [state, setState] = useState(initial);
  api.live.onChange.useSubscription(
    { tournamentId: initial.id },
    { onData: setState },
  );
  const { user } = useSessionUser();
  const isAdmin = user?.role === 'admin';
  const meta = STAGE_META[state.stage];
  const playersPerTeam = state.teamSize ?? 1;
  const linkedCount = state.participants.filter((p) => p.hasAccount).length;
  // Once the pots are public they show everyone; the plain list retires.
  const potsPublished =
    stageIndex(state.stage) >= stageIndex('formation') && state.pots.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className={tag}>
          Edición {state.editionYear} ·{' '}
          {state.kind === 'individual'
            ? 'Torneo individual'
            : 'Torneo por equipos'}
        </span>
        <h2 className="d-display font-bold text-(--parchment) text-3xl uppercase sm:text-4xl">
          {meta.title}
        </h2>
        <p className="max-w-[52ch] text-(--faded)">{meta.next}</p>
        {isAdmin ? (
          <Link className={btn.outline} href="/live/setup">
            Gestionar el torneo
          </Link>
        ) : null}
      </header>

      <StageTimeline
        hideVoting={state.rankingSource === 'historical'}
        stage={state.stage}
      />

      {state.stage === 'voting' ? <VotingStatus state={state} /> : null}

      {potsPublished ? (
        <>
          <PotsReveal state={state} />
          <RankingBlock state={state} />
        </>
      ) : null}

      {potsPublished ? null : (
        <section className={`${panelGold} flex flex-col gap-5 p-5 sm:p-7`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Los participantes
            </h3>
            <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
              {state.participants.length} jugadores ·{' '}
              {describeTeamsLayout(state.participants.length, playersPerTeam)}
            </span>
          </div>
          <ol className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
            {state.participants.map((participant) => (
              <li
                className="flex items-center gap-2 text-sm"
                key={participant.id}
              >
                <span className="w-6 shrink-0 text-right font-mono text-(--gold) text-xs">
                  {participant.position}
                </span>
                <Link
                  className="truncate text-(--parchment) transition-colors hover:text-(--gold-hi)"
                  href={`/players/${participant.slug}`}
                >
                  {participant.name}
                </Link>
                {isAdmin && !participant.hasAccount ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-(--ember)"
                    title="Sin cuenta vinculada"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          {isAdmin ? (
            <p className="text-(--faded) text-xs">
              {linkedCount} de {state.participants.length} con cuenta vinculada.
              {linkedCount < state.participants.length
                ? ' Los marcados en rojo no podrán votar ni actuar hasta que reclamen su jugador.'
                : ''}
            </p>
          ) : null}
        </section>
      )}

      {state.teams.length > 0 ? (
        <section className={`${panel} flex flex-col gap-4 p-5 sm:p-7`}>
          <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
            Los equipos
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {state.teams.map((team, index) => (
              <div
                className="flex min-h-24 flex-col gap-1 rounded-lg border border-(--hair) border-dashed p-3"
                key={team.id}
              >
                <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                  {team.name ?? `Equipo ${index + 1}`}
                </span>
                {team.members.length === 0 ? (
                  <span className="text-(--faded)/60 text-xs italic">
                    Por formar
                  </span>
                ) : (
                  team.members.map((member) => (
                    <span
                      className={`text-sm ${member.isCaptain ? 'font-bold text-(--gold)' : 'text-(--parchment)'}`}
                      key={member.playerId}
                    >
                      {member.name}
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export { LiveHub };
