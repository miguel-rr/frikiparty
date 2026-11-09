'use client';

import { useEffect, useState } from 'react';

import {
  FactionChip,
  type FactionRef,
} from '@/components/live/match/faction-chip';
import { LineupEditor } from '@/components/live/match/lineup-editor';
import { MapBoardView, type RingView } from '@/components/live/match/map-board';
import { ReplayBox } from '@/components/live/match/replay-box';
import { btn, input, panel, panelGold } from '@/components/theme/primitives';
import type { RingSides } from '@/lib/live/map-board';
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
  const map = state.maps.find((x) => x.id === game.mapId);
  const board = map?.board ?? null;
  const needsBoard = state.maps.some((x) => x.board);
  // The public snapshot hides the line-up until the game starts; the
  // captain reads the team's own plan to pick up where it was left.
  const planning = isMine && game.status === 'factions_drawn';
  const plan = api.match.myTeamPlan.useQuery(
    { tournamentId: state.id, matchId },
    { enabled: planning },
  );
  const refetchPlan = plan.refetch;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new snapshot version may carry a reset plan
  useEffect(() => {
    if (planning) void refetchPlan();
  }, [planning, refetchPlan, state.version]);
  const positions = game.positions;
  const slotOf = (playerId: string) => {
    const ring = positions.find((p) => p.playerId === playerId)?.ring;
    return ring === undefined ? null : (board?.rings[ring]?.slot ?? null);
  };
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
          disabled={readyMutation.isPending || (needsBoard && !board)}
          onClick={() =>
            readyMutation.mutate({ tournamentId: state.id, matchId })
          }
          title={needsBoard && !board ? 'Elegid antes el mapa' : undefined}
          type="button"
        >
          {readyMutation.isPending ? 'Un momento…' : '¡Listos!'}
        </button>
      ) : null}

      {game.status === 'factions_drawn' ? (
        isMine ? (
          plan.data === undefined ? (
            <span className="font-mono text-(--faded) text-3xs uppercase">
              Cargando vuestro reparto…
            </span>
          ) : (
            <LineupEditor
              confirmed={Boolean(confirmed)}
              error={error}
              factions={drawn}
              initial={(plan.data?.lineup ?? []).map((l) => ({
                ...l,
                ring:
                  plan.data?.positions.find((p) => p.playerId === l.playerId)
                    ?.ring ?? null,
              }))}
              key={`${game.id}-${JSON.stringify(plan.data)}-${JSON.stringify(game.ringSides)}`}
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
              placement={
                board && game.ringSides
                  ? {
                      board,
                      mapName: map?.name ?? '',
                      sides: game.ringSides,
                      side,
                    }
                  : null
              }
            />
          )
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
                {slotOf(m.playerId) !== null ? (
                  <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                    pos. {slotOf(m.playerId)}
                  </span>
                ) : null}
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

/**
 * Map name, editable by the captains and the organiser. With illustrated
 * sheets the map is picked from the booklet's list; with no game open yet
 * (`game` null) picking it opens the next game, since it comes before
 * "Listos".
 */
const MapField = ({
  state,
  matchId,
  game,
  editable,
}: {
  state: LiveState;
  matchId: string;
  game: LiveGame | null;
  editable: boolean;
}) => {
  const current = game?.map ?? '';
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);
  const [error, setError] = useState<string | null>(null);
  const setMap = api.match.setMap.useMutation({
    onError: (e) => {
      setError(errorText(e));
      setValue(current);
    },
    onSuccess: () => setError(null),
  });
  const boardMaps = state.maps.filter((m) => m.board);
  const fieldId = `map-${game?.id ?? matchId}`;
  const save = (next: string) => {
    if (current === next.trim()) return;
    setMap.mutate({
      tournamentId: state.id,
      matchId,
      gameId: game?.id ?? null,
      map: next.trim() || null,
      mapId:
        state.maps.find(
          (m) => m.name.toLowerCase() === next.trim().toLowerCase(),
        )?.id ?? null,
    });
  };
  if (!editable)
    return current ? (
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        Mapa · <span className="text-(--parchment)">{current}</span>
      </span>
    ) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-(--faded) text-2xs uppercase tracking-xl">
      <label htmlFor={fieldId}>Mapa</label>
      {boardMaps.length > 0 ? (
        <select
          className={`${input} max-w-64 py-1 text-xs normal-case tracking-normal`}
          disabled={setMap.isPending}
          id={fieldId}
          onChange={(e) => {
            setValue(e.target.value);
            save(e.target.value);
          }}
          value={value}
        >
          <option disabled value="">
            Elige el mapa del dossier
          </option>
          {boardMaps.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            className={`${input} max-w-56 py-1 text-xs normal-case tracking-normal`}
            id={fieldId}
            list={`maps-${game?.id ?? matchId}`}
            onBlur={() => save(value)}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="¿Dónde se juega?"
            value={value}
          />
          <datalist id={`maps-${game?.id ?? matchId}`}>
            {state.maps.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </>
      )}
      {error ? (
        <span className="text-(--ember) text-xs normal-case tracking-normal">
          {error}
        </span>
      ) : null}
    </div>
  );
};

/** Which side holds a ring, from a game's split. */
const sideOfRing = (sides: RingSides | null, ring: number) =>
  sides?.A.includes(ring) ? 'A' : sides?.B.includes(ring) ? 'B' : null;

/**
 * The organiser re-splits the rings between the teams: tap a ring to move
 * it A → B → nobody's. A team whose rings change places and confirms again.
 */
const RingSidesEditor = ({
  state,
  matchId,
  game,
  mapName,
  board,
}: {
  state: LiveState;
  matchId: string;
  game: LiveGame & { ringSides: RingSides };
  mapName: string;
  board: NonNullable<LiveState['maps'][number]['board']>;
}) => {
  const [sides, setSides] = useState<RingSides>(game.ringSides);
  const [error, setError] = useState<string | null>(null);
  const save = api.match.setRingSides.useMutation({
    onError: (e) => setError(errorText(e)),
    onSuccess: () => setError(null),
  });
  const changed = JSON.stringify(sides) !== JSON.stringify(game.ringSides);
  const cycle = (ring: number) => {
    const now = sideOfRing(sides, ring);
    const next = now === 'A' ? 'B' : now === 'B' ? null : 'A';
    setSides({
      A: [
        ...sides.A.filter((r) => r !== ring),
        ...(next === 'A' ? [ring] : []),
      ],
      B: [
        ...sides.B.filter((r) => r !== ring),
        ...(next === 'B' ? [ring] : []),
      ],
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-(--gold) text-2xs uppercase tracking-xl">
        Organizador · anillos de cada equipo
      </span>
      <MapBoardView
        board={board}
        name={mapName}
        onRing={cycle}
        rings={board.rings.map((_, index) => ({
          side: sideOfRing(sides, index),
        }))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
          Toca un anillo para pasarlo de azul (A) a rojo (B) o a ninguno
        </span>
        <button
          className={`${btn.outline} text-2xs`}
          disabled={!changed || save.isPending}
          onClick={() =>
            save.mutate({ tournamentId: state.id, matchId, sides })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar anillos'}
        </button>
        {changed ? (
          <button
            className={`${btn.ghost} text-2xs`}
            onClick={() => setSides(game.ringSides)}
            type="button"
          >
            Deshacer
          </button>
        ) : null}
        {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
      </div>
    </div>
  );
};

/**
 * The game's map sheet as everyone sees it: the rings before the draw, the
 * teams' sides while the captains place their players (who stands where
 * stays secret), and every player on their ring once the game starts.
 */
const GameBoard = ({
  state,
  matchId,
  game,
  teamA,
  teamB,
  viewer,
}: {
  state: LiveState;
  matchId: string;
  game: LiveGame;
  teamA: Team;
  teamB: Team;
  viewer: Viewer;
}) => {
  const map = state.maps.find((x) => x.id === game.mapId);
  const board = map?.board;
  if (!map || !board) return null;
  const { ringSides } = game;
  if (
    viewer.isAdmin &&
    game.status === 'factions_drawn' &&
    ringSides !== null
  ) {
    return (
      <RingSidesEditor
        board={board}
        game={{ ...game, ringSides }}
        key={JSON.stringify(ringSides)}
        mapName={map.name}
        matchId={matchId}
        state={state}
      />
    );
  }
  // The captains place theirs in their own editor.
  if (game.status === 'factions_drawn' && viewer.captainOf) return null;
  const names = new Map(
    [...teamA.members, ...teamB.members].map((m) => [m.playerId, m.name]),
  );
  const rings: RingView[] = board.rings.map((_, index) => {
    const standing = game.positions.find((p) => p.ring === index);
    return {
      side: sideOfRing(ringSides, index),
      label: standing ? (names.get(standing.playerId) ?? null) : null,
    };
  });
  return (
    <div className="flex flex-col gap-1.5">
      <MapBoardView board={board} name={map.name} rings={rings} />
      <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
        {game.status === 'pending'
          ? 'El lado de cada equipo se sortea con las facciones'
          : game.status === 'factions_drawn'
            ? `Azul: ${teamLabel(teamA)} · Rojo: ${teamLabel(teamB)} · las posiciones se verán cuando confirmen los dos capitanes`
            : `Azul: ${teamLabel(teamA)} · Rojo: ${teamLabel(teamB)} · el número es la posición en el lobby`}
      </span>
    </div>
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
  // The map is chosen before "Listos"; once drawn, only the organiser moves it.
  const canEditMap =
    game.status === 'pending'
      ? viewer.isAdmin || viewer.captainOf !== null
      : game.status === 'factions_drawn'
        ? viewer.isAdmin
        : !game.ringSides && (viewer.isAdmin || viewer.captainOf !== null);
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

      <GameBoard
        game={game}
        matchId={m.id}
        state={state}
        teamA={teamA}
        teamB={teamB}
        viewer={viewer}
      />

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

export { GameCard, MapField, type Viewer };
