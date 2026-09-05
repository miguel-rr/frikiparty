'use client';

import { useEffect, useState } from 'react';

import {
  FactionChip,
  type FactionRef,
} from '@/components/live/match/faction-chip';
import { LineupEditor } from '@/components/live/match/lineup-editor';
import { ReplayBox } from '@/components/live/match/replay-box';
import { btn, input, panel, panelGold } from '@/components/theme/primitives';
import { teamLabel } from '@/lib/live/team-label';
import type { LiveGame, LiveMatch } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type Team = LiveState['teams'][number];

type Viewer = {
  userId: string | null;
  playerId: string | null;
  isAdmin: boolean;
  /** The side the viewer captains in this match, if any. */
  captainOf: 'A' | 'B' | null;
  /** The viewer plays in this match (either side). */
  plays: boolean;
};

const STATUS_LABEL: Record<LiveGame['status'], string> = {
  pending: 'Esperando a los capitanes',
  awaiting_draw: 'Sorteando…',
  factions_drawn: 'Facciones sorteadas · reparto',
  ready: 'En juego',
  completed: 'Decidida',
};

const errorText = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Error';

/** A team's block inside the game: the drawn factions, the line-up, the captain's tools. */
const TeamBlock = ({
  state,
  matchId,
  game,
  team,
  side,
  factions,
  viewer,
  mirrored,
}: {
  state: LiveState;
  matchId: string;
  game: LiveGame;
  team: Team;
  side: 'A' | 'B';
  factions: FactionRef[];
  viewer: Viewer;
  mirrored: boolean;
}) => {
  const isMine = viewer.captainOf === side;
  const ready = side === 'A' ? game.readyTeamAAt : game.readyTeamBAt;
  const confirmed =
    side === 'A' ? game.confirmedTeamAAt : game.confirmedTeamBAt;
  const drawn = game.draws
    .filter((d) => d.teamId === team.id)
    .map((d) => factions.find((f) => f.id === d.factionId))
    .filter((f): f is FactionRef => Boolean(f));
  const lineup = game.lineup.filter((l) =>
    team.members.some((m) => m.playerId === l.playerId),
  );
  const [error, setError] = useState<string | null>(null);
  const readyMutation = api.match.ready.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const setLineup = api.match.setLineup.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const confirm = api.match.confirmLineup.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const members = [...team.members].sort(
    (a, b) =>
      Number(b.isCaptain) - Number(a.isCaptain) ||
      (a.seat ?? 99) - (b.seat ?? 99),
  );

  return (
    <div
      className={`flex flex-col gap-3 ${mirrored ? 'sm:items-end sm:text-right' : ''}`}
    >
      <div
        className={`flex items-baseline gap-2 ${mirrored ? 'sm:flex-row-reverse' : ''}`}
      >
        <span className="d-display font-bold text-(--parchment) text-base uppercase">
          {teamLabel(team)}
        </span>
        {game.status === 'pending' ? (
          <span
            className={`font-mono text-3xs uppercase tracking-wider ${ready ? 'text-(--moss)' : 'text-(--faded)'}`}
          >
            {ready ? 'listos' : 'aún no'}
          </span>
        ) : null}
      </div>

      {game.status === 'pending' && isMine && !ready ? (
        <button
          className={btn.primary}
          disabled={readyMutation.isPending}
          onClick={() =>
            readyMutation.mutate({ tournamentId: state.id, matchId })
          }
          type="button"
        >
          {readyMutation.isPending ? 'Un momento…' : '¡Listos!'}
        </button>
      ) : null}

      {game.status === 'factions_drawn' ? (
        isMine ? (
          <LineupEditor
            confirmed={Boolean(confirmed)}
            error={error}
            factions={drawn}
            initial={lineup}
            key={`${game.id}-${lineup.map((l) => l.factionId).join()}`}
            members={members}
            onConfirm={async (assignments) => {
              setError(null);
              await setLineup.mutateAsync({
                tournamentId: state.id,
                matchId,
                assignments,
              });
              await confirm.mutateAsync({ tournamentId: state.id, matchId });
            }}
            pending={setLineup.isPending || confirm.isPending}
          />
        ) : (
          <>
            <div
              className={`flex flex-wrap gap-2 ${mirrored ? 'sm:justify-end' : ''}`}
            >
              {drawn.map((f, i) => (
                <FactionChip delay={i * 160} faction={f} key={f.id} />
              ))}
            </div>
            <span
              className={`font-mono text-3xs uppercase tracking-wider ${confirmed ? 'text-(--moss)' : 'text-(--faded)'}`}
            >
              {confirmed ? 'reparto confirmado' : 'el capitán reparte…'}
            </span>
          </>
        )
      ) : null}

      {game.status === 'ready' || game.status === 'completed' ? (
        <ul className="flex flex-col gap-1.5">
          {members.map((m) => {
            const faction = factions.find(
              (f) =>
                f.id ===
                lineup.find((l) => l.playerId === m.playerId)?.factionId,
            );
            return (
              <li
                className={`flex items-center gap-3 ${mirrored ? 'sm:flex-row-reverse' : ''}`}
                key={m.playerId}
              >
                <span className="font-bold text-(--parchment) text-sm">
                  {m.name}
                </span>
                {faction ? <FactionChip faction={faction} size="sm" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {error && !isMine ? (
        <span className="text-(--ember) text-xs">{error}</span>
      ) : null}
    </div>
  );
};

/** Map name, editable by the captains and the organiser. */
const MapField = ({
  state,
  matchId,
  game,
  editable,
}: {
  state: LiveState;
  matchId: string;
  game: LiveGame;
  editable: boolean;
}) => {
  const [value, setValue] = useState(game.map ?? '');
  useEffect(() => setValue(game.map ?? ''), [game.map]);
  const setMap = api.match.setMap.useMutation();
  const save = () => {
    if ((game.map ?? '') === value.trim()) return;
    setMap.mutate({
      tournamentId: state.id,
      matchId,
      gameId: game.id,
      map: value.trim() || null,
      mapId:
        state.maps.find(
          (m) => m.name.toLowerCase() === value.trim().toLowerCase(),
        )?.id ?? null,
    });
  };
  if (!editable)
    return game.map ? (
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        Mapa · <span className="text-(--parchment)">{game.map}</span>
      </span>
    ) : null;
  return (
    <label className="flex items-center gap-2 font-mono text-(--faded) text-2xs uppercase tracking-xl">
      Mapa
      <input
        className={`${input} max-w-56 py-1 text-xs normal-case tracking-normal`}
        list={`maps-${game.id}`}
        onBlur={save}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="¿Dónde se juega?"
        value={value}
      />
      <datalist id={`maps-${game.id}`}>
        {state.maps.map((m) => (
          <option key={m.id} value={m.name} />
        ))}
      </datalist>
    </label>
  );
};

/**
 * One game of the match as a scroll: its state, both teams' factions and
 * line-ups, the map, the result, the replays; and the actions each role
 * has at that moment.
 */
const GameCard = ({
  state,
  match: m,
  game,
  teamA,
  teamB,
  viewer,
  isLastDecided,
}: {
  state: LiveState;
  match: LiveMatch;
  game: LiveGame;
  teamA: Team;
  teamB: Team;
  viewer: Viewer;
  isLastDecided: boolean;
}) => {
  const factions: FactionRef[] = state.factions;
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const declare = api.match.declareLoss.useMutation({
    onError: (e) => setError(errorText(e)),
    onSettled: () => setArmed(false),
  });
  const setResult = api.match.setResult.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  const undo = api.match.undoGame.useMutation({
    onError: (e) => setError(errorText(e)),
  });
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  const open = game.status !== 'completed';
  const winner =
    game.winnerTeamId === teamA.id
      ? teamA
      : game.winnerTeamId === teamB.id
        ? teamB
        : null;
  const canEditMap = viewer.isAdmin || viewer.captainOf !== null;
  const args = { tournamentId: state.id, matchId: m.id };

  return (
    <li className={`${open ? panelGold : panel} flex flex-col gap-5 p-5`}>
      <style>{`
        @keyframes live-card-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="d-display font-bold text-(--gold) text-sm uppercase tracking-2xl">
          Partida {game.gameNumber ?? ''}
        </span>
        <span
          className={`font-mono text-2xs uppercase tracking-xl ${open ? 'text-(--gold-hi)' : 'text-(--faded)'}`}
        >
          {game.status === 'completed' && winner
            ? `Victoria de ${teamLabel(winner)}`
            : STATUS_LABEL[game.status]}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TeamBlock
          factions={factions}
          game={game}
          matchId={m.id}
          mirrored={false}
          side="A"
          state={state}
          team={teamA}
          viewer={viewer}
        />
        <TeamBlock
          factions={factions}
          game={game}
          matchId={m.id}
          mirrored
          side="B"
          state={state}
          team={teamB}
          viewer={viewer}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair) border-t pt-4">
        <MapField
          editable={canEditMap}
          game={game}
          matchId={m.id}
          state={state}
        />
        <div className="flex flex-wrap items-center gap-2">
          {open && viewer.captainOf ? (
            <button
              className={armed ? btn.danger : btn.secondary}
              disabled={declare.isPending}
              onClick={() => (armed ? declare.mutate(args) : setArmed(true))}
              type="button"
            >
              {declare.isPending
                ? 'Registrando…'
                : armed
                  ? '¿Seguro? Confirmar derrota'
                  : 'Hemos perdido'}
            </button>
          ) : null}
          {open && viewer.isAdmin ? (
            <>
              <button
                className={`${btn.outline} text-2xs`}
                disabled={setResult.isPending}
                onClick={() =>
                  setResult.mutate({
                    ...args,
                    gameId: game.id,
                    winnerTeamId: teamA.id,
                  })
                }
                type="button"
              >
                Gana {teamLabel(teamA)}
              </button>
              <button
                className={`${btn.outline} text-2xs`}
                disabled={setResult.isPending}
                onClick={() =>
                  setResult.mutate({
                    ...args,
                    gameId: game.id,
                    winnerTeamId: teamB.id,
                  })
                }
                type="button"
              >
                Gana {teamLabel(teamB)}
              </button>
            </>
          ) : null}
          {!open && viewer.isAdmin && isLastDecided ? (
            <button
              className={`${btn.ghost} text-2xs`}
              disabled={undo.isPending}
              onClick={() => undo.mutate({ ...args, gameId: game.id })}
              type="button"
            >
              Deshacer resultado
            </button>
          ) : null}
        </div>
      </div>
      {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
      {!open || game.status === 'ready' ? (
        <ReplayBox
          canUpload={viewer.isAdmin || viewer.plays}
          game={game}
          isAdmin={viewer.isAdmin}
          matchId={m.id}
          tournamentId={state.id}
          userId={viewer.userId}
        />
      ) : null}
    </li>
  );
};

export { GameCard, type Viewer };
