'use client';

import Link from 'next/link';

import { useSessionUser } from '@/components/layout/auth-slot';
import { phaseTitle } from '@/components/live/phase/phase-view';
import { panel, panelGold } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { activePhase, isPending } from '@/lib/live/progression';
import { teamLabel } from '@/lib/live/team-label';
import type { LiveMatch, LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type Located = { phase: LivePhase; match: LiveMatch };

const roundLabel = (phase: LivePhase, m: LiveMatch) => {
  if (m.roundIndex === null) return phaseTitle(phase);
  if (phase.type === 'group') return `Jornada ${m.roundIndex}`;
  if (phase.type === 'swiss') return `Ronda ${m.roundIndex}`;
  const last = Math.max(...phase.matches.map((x) => x.roundIndex ?? 0));
  if (m.isThirdPlace) return 'Tercer puesto';
  if (m.roundIndex === 0) return 'Play-in';
  if (m.roundIndex === last) return 'Final';
  if (m.roundIndex === last - 1) return 'Semifinal';
  return `Ronda ${m.roundIndex}`;
};

/** A match as one line: teams, score or state, where it belongs. */
const MatchRow = ({
  state,
  located: { phase, match: m },
  highlightTeamId,
}: {
  state: LiveState;
  located: Located;
  highlightTeamId?: string | null;
}) => {
  const a = state.teams.find((t) => t.id === m.teamAId);
  const b = state.teams.find((t) => t.id === m.teamBId);
  const score = matchScore(m);
  const open = m.games.some((g) => g.status !== 'completed');
  const side = (team: typeof a, id: string | null) => (
    <span
      className={`truncate ${
        m.winnerTeamId && m.winnerTeamId === id
          ? 'font-bold text-(--gold-hi)'
          : m.winnerTeamId
            ? 'text-(--faded)'
            : 'text-(--parchment)'
      } ${highlightTeamId && highlightTeamId === id ? 'underline decoration-(--gold)/60 decoration-dotted underline-offset-4' : ''}`}
    >
      {teamLabel(team)}
    </span>
  );
  return (
    <li>
      <Link
        className={`${panel} grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 text-sm transition-colors hover:border-(--gold)`}
        href={`/matches/${m.id}`}
      >
        <span className="text-right">{side(a, m.teamAId)}</span>
        <span className="flex flex-col items-center">
          <span className="font-bold font-mono text-(--gold) tabular-nums">
            {m.status === 'completed' || score.a + score.b > 0
              ? `${score.a}–${score.b}`
              : open
                ? '· en juego ·'
                : 'vs'}
          </span>
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            {roundLabel(phase, m)}
          </span>
        </span>
        <span className="text-left">{side(b, m.teamBId)}</span>
      </Link>
    </li>
  );
};

/**
 * The Council's match digest while the tournament runs: the viewer's
 * own matches (when their player is in it), what is up next, and the
 * latest results. Every line opens its sheet.
 */
const MatchesDigest = ({ state }: { state: LiveState }) => {
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const myTeam = mine.data
    ? state.teams.find((t) =>
        t.members.some((x) => x.playerId === mine.data?.id),
      )
    : undefined;
  const all: Located[] = state.phases.flatMap((phase) =>
    phase.matches.map((match) => ({ phase, match })),
  );
  const active = activePhase(state);
  const upcoming = all
    .filter(
      ({ phase, match: m }) =>
        phase.id === active?.id && isPending(m) && m.teamAId && m.teamBId,
    )
    .slice(0, 6);
  const results = all
    .filter(({ match: m }) => m.status === 'completed')
    .sort((x, y) => {
      const at = (m: LiveMatch) =>
        Math.max(
          0,
          ...m.games.map((g) => (g.playedAt ? Date.parse(g.playedAt) : 0)),
        );
      return at(y.match) - at(x.match);
    })
    .slice(0, 5);
  const ours = myTeam
    ? all.filter(
        ({ match: m }) => m.teamAId === myTeam.id || m.teamBId === myTeam.id,
      )
    : [];
  const ourNext = ours.find(
    ({ match: m }) => isPending(m) && m.teamAId && m.teamBId,
  );
  const ourPlayed = ours
    .filter(({ match: m }) => m.status === 'completed')
    .slice(-3);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {myTeam ? (
        <section
          className={`${panelGold} flex flex-col gap-3 p-5 lg:col-span-2`}
        >
          <h3 className="d-display font-bold text-(--gold-hi) text-lg uppercase">
            Mis partidos · {teamLabel(myTeam)}
          </h3>
          {ourNext ? (
            <>
              <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                El siguiente
              </span>
              <ul className="flex flex-col gap-2">
                <MatchRow
                  highlightTeamId={myTeam.id}
                  located={ourNext}
                  state={state}
                />
              </ul>
            </>
          ) : (
            <p className="text-(--faded) text-sm">
              {ourPlayed.length > 0
                ? 'Sin partidos pendientes por ahora.'
                : 'Aún no hay partidos programados para tu equipo.'}
            </p>
          )}
          {ourPlayed.length > 0 ? (
            <>
              <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                Ya jugados
              </span>
              <ul className="flex flex-col gap-2">
                {ourPlayed.map((l) => (
                  <MatchRow
                    highlightTeamId={myTeam.id}
                    key={l.match.id}
                    located={l}
                    state={state}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
          Próximos partidos
        </h3>
        {upcoming.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {upcoming.map((l) => (
              <MatchRow key={l.match.id} located={l} state={state} />
            ))}
          </ul>
        ) : (
          <p className="text-(--faded) text-sm">Nada pendiente en esta fase.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
          Últimos resultados
        </h3>
        {results.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {results.map((l) => (
              <MatchRow key={l.match.id} located={l} state={state} />
            ))}
          </ul>
        ) : (
          <p className="text-(--faded) text-sm">
            Todavía no se ha decidido ningún partido.
          </p>
        )}
      </section>
    </div>
  );
};

export { MatchesDigest };
