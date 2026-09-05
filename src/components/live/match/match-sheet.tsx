'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { EpicFaceOff, epicKind } from '@/components/live/match/epic-face-off';
import { GameCard, type Viewer } from '@/components/live/match/game-card';
import { phaseTitle } from '@/components/live/phase/phase-view';
import { CommentThread } from '@/components/social/comment-thread';
import { btn, panelGold, tag } from '@/components/theme/primitives';
import { gamesToWinFor } from '@/lib/live/games-to-win';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import type { LiveMatch, LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

const roundWord = (phase: LivePhase, m: LiveMatch) => {
  if (m.roundIndex === null) return '';
  if (phase.type === 'group') return `jornada ${m.roundIndex}`;
  if (phase.type === 'swiss') return `ronda ${m.roundIndex}`;
  const last = Math.max(...phase.matches.map((x) => x.roundIndex ?? 0));
  if (m.isThirdPlace) return 'tercer puesto';
  if (m.roundIndex === 0) return 'play-in';
  if (m.roundIndex === last) return 'final';
  if (m.roundIndex === last - 1) return 'semifinal';
  if (m.roundIndex === last - 2) return 'cuartos';
  return `ronda ${m.roundIndex}`;
};

/**
 * The match sheet: both teams face to face with the score, then every
 * game as a scroll (the open one glowing), the organiser's tools, and
 * the conversation. Everything acts through the match router and the
 * page keeps itself current through the change subscription.
 */
const MatchSheet = ({
  state,
  phase,
  match: m,
}: {
  state: LiveState;
  phase: LivePhase;
  match: LiveMatch;
}) => {
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const teamA = state.teams.find((t) => t.id === m.teamAId);
  const teamB = state.teams.find((t) => t.id === m.teamBId);
  const myTeam = mine.data
    ? state.teams.find((t) =>
        t.members.some((x) => x.playerId === mine.data?.id),
      )
    : undefined;
  const viewer: Viewer = {
    userId: user?.id ?? null,
    playerId: mine.data?.id ?? null,
    isAdmin: user?.role === 'admin',
    captainOf:
      myTeam &&
      mine.data &&
      myTeam.members.some((x) => x.playerId === mine.data?.id && x.isCaptain)
        ? myTeam.id === m.teamAId
          ? 'A'
          : myTeam.id === m.teamBId
            ? 'B'
            : null
        : null,
    plays: Boolean(
      myTeam && (myTeam.id === m.teamAId || myTeam.id === m.teamBId),
    ),
  };
  const score = matchScore(m);
  const toWin = gamesToWinFor(phase, m);
  const winner = state.teams.find((t) => t.id === m.winnerTeamId);
  const lastDecided = [...m.games]
    .reverse()
    .find((g) => g.status === 'completed');
  const openGame = m.games.find((g) => g.status !== 'completed');
  const [error, setError] = useState<string | null>(null);
  const setResult = api.match.setResult.useMutation({
    onError: (e) => setError('message' in e ? e.message : 'Error'),
  });
  const epic = teamA && teamB ? epicKind(phase, m) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={tag}>
          Edición {state.editionYear} · {phaseTitle(phase)}
          {m.roundIndex !== null ? ` · ${roundWord(phase, m)}` : ''}
          {m.isTiebreak ? ' · desempate' : ''}
        </span>
        <div className="flex gap-2">
          <Link className={btn.outline} href={`/live/phase/${phase.id}`}>
            {phaseTitle(phase)}
          </Link>
          <Link className={btn.outline} href="/live">
            El torneo
          </Link>
        </div>
      </div>

      {epic ? (
        <EpicFaceOff kind={epic} match={m} phase={phase} state={state} />
      ) : (
        <div
          className={`${panelGold} grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto_1fr] sm:p-10`}
        >
          <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
            <span
              className={`d-display font-bold text-2xl uppercase ${winner && winner.id === teamA?.id ? 'd-gold-text' : 'text-(--parchment)'}`}
            >
              {teamLabel(teamA)}
            </span>
            <span className="text-(--faded) text-sm">{teamRoster(teamA)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="d-display text-center font-black text-(--gold-hi) text-6xl tabular-nums">
              {score.a}–{score.b}
            </span>
            <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
              {toWin === 1 ? 'partida única' : `primero a ${toWin}`}
              {m.status === 'completed' ? ' · decidido' : ''}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
            <span
              className={`d-display font-bold text-2xl uppercase ${winner && winner.id === teamB?.id ? 'd-gold-text' : 'text-(--parchment)'}`}
            >
              {teamLabel(teamB)}
            </span>
            <span className="text-(--faded) text-sm">{teamRoster(teamB)}</span>
          </div>
        </div>
      )}

      {!teamA || !teamB ? (
        <p className="text-center text-(--faded) text-sm">
          Los equipos de este partido saldrán de los cruces anteriores.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-5">
            {m.games.map((g) => (
              <GameCard
                game={g}
                isLastDecided={g.id === lastDecided?.id}
                key={g.id}
                match={m}
                state={state}
                teamA={teamA}
                teamB={teamB}
                viewer={viewer}
              />
            ))}
          </ul>

          {m.status !== 'completed' && !openGame ? (
            <div
              className={`${panelGold} flex flex-col items-center gap-3 p-6 text-center`}
            >
              <span className="d-display font-bold text-(--parchment) text-lg uppercase">
                {m.games.length === 0
                  ? 'Primera partida'
                  : `Partida ${m.games.length + 1}`}
              </span>
              <p className="max-w-[48ch] text-(--faded) text-sm">
                Cuando los dos capitanes pulsen «Listos» se sortean las
                facciones.
                {viewer.captainOf
                  ? ' Eres capitán: cuando estéis, dale.'
                  : viewer.isAdmin
                    ? ' Como organizador puedes anotar un resultado directamente.'
                    : ''}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {viewer.captainOf ? (
                  <ReadyButton matchId={m.id} tournamentId={state.id} />
                ) : null}
                {viewer.isAdmin ? (
                  <>
                    <button
                      className={`${btn.outline} text-2xs`}
                      disabled={setResult.isPending}
                      onClick={() =>
                        setResult.mutate({
                          tournamentId: state.id,
                          matchId: m.id,
                          gameId: null,
                          winnerTeamId: teamA.id,
                        })
                      }
                      type="button"
                    >
                      Anotar: gana {teamLabel(teamA)}
                    </button>
                    <button
                      className={`${btn.outline} text-2xs`}
                      disabled={setResult.isPending}
                      onClick={() =>
                        setResult.mutate({
                          tournamentId: state.id,
                          matchId: m.id,
                          gameId: null,
                          winnerTeamId: teamB.id,
                        })
                      }
                      type="button"
                    >
                      Anotar: gana {teamLabel(teamB)}
                    </button>
                  </>
                ) : null}
              </div>
              {error ? (
                <span className="text-(--ember) text-xs">{error}</span>
              ) : null}
            </div>
          ) : null}

          {m.status === 'completed' && winner ? (
            <p className="text-center font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              Partido decidido · {teamLabel(winner)} {score.a}–{score.b}
            </p>
          ) : null}
        </>
      )}

      {user ? <CommentThread target={{ matchId: m.id }} /> : null}
    </div>
  );
};

/** "Listos" for the next game when none is open yet (opens it). */
const ReadyButton = ({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) => {
  const ready = api.match.ready.useMutation();
  return (
    <button
      className={btn.primary}
      disabled={ready.isPending}
      onClick={() => ready.mutate({ tournamentId, matchId })}
      type="button"
    >
      {ready.isPending ? 'Un momento…' : '¡Listos!'}
    </button>
  );
};

export { MatchSheet };
