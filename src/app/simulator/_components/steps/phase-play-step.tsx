'use client';

import { useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { isBracketPhaseComplete } from '@/lib/simulator/bracket-phase';
import {
  computeGroupStandings,
  isGroupPhaseComplete,
} from '@/lib/simulator/group-phase';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';
import type {
  BracketMatch,
  GroupPhase,
  Partido,
  Team,
} from '@/lib/simulator/types';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const getTeamName = (teams: Team[], id: string | null) =>
  id ? (teams.find((team) => team.id === id)?.name ?? id) : 'Por determinar';

type MatchCardProps = {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  gamesToWin: number;
  partido: Partido | null;
  teams: Team[];
  onRecordGame: (
    matchId: string,
    winningTeamId: string,
    factionByPlayerId: Record<string, string>,
  ) => void;
};

const MatchCard = ({
  matchId,
  teamAId,
  teamBId,
  gamesToWin,
  partido,
  teams,
  onRecordGame,
}: MatchCardProps) => {
  const [open, setOpen] = useState(false);
  const [factions, setFactions] = useState<Record<string, string>>({});

  const teamA = teams.find((team) => team.id === teamAId);
  const teamB = teams.find((team) => team.id === teamBId);
  const games = partido?.games ?? [];
  const winsA = games.filter((game) => game.winningTeamId === teamAId).length;
  const winsB = games.filter((game) => game.winningTeamId === teamBId).length;
  const winnerTeamId = partido?.winnerTeamId ?? null;
  const canPlay = teamAId && teamBId;

  const record = (winningTeamId: string) => {
    onRecordGame(matchId, winningTeamId, factions);
    setFactions({});
  };

  const setFaction = (playerId: string, value: string) =>
    setFactions((prev) => ({ ...prev, [playerId]: value }));

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-panel-2 p-4 ring-1 ring-hair">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-sm">
          {getTeamName(teams, teamAId)}{' '}
          <span className="font-mono text-amber">{winsA}</span>
          {' – '}
          <span className="font-mono text-amber">{winsB}</span>{' '}
          {getTeamName(teams, teamBId)}{' '}
          <span className="font-mono text-[0.6rem] text-muted">
            (a {gamesToWin})
          </span>
        </p>
        {winnerTeamId ? (
          <span className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
            Ganó {getTeamName(teams, winnerTeamId)}
          </span>
        ) : null}
      </div>

      {!winnerTeamId && canPlay ? (
        <>
          <button
            className="self-start rounded-full bg-panel px-4 py-1.5 font-semibold text-xs ring-1 ring-hair transition-colors hover:bg-hair"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? 'Ocultar partida' : `Registrar partida ${games.length + 1}`}
          </button>

          {open ? (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[teamA, teamB].map((team) =>
                  team ? (
                    <div className="flex flex-col gap-1.5" key={team.id}>
                      <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
                        {team.name}
                      </p>
                      {team.playerIds.map((playerId) => (
                        <label
                          className="flex items-center justify-between gap-2 text-xs"
                          key={playerId}
                        >
                          <span>{getPlayerName(playerId)}</span>
                          <input
                            className="w-32 rounded bg-panel px-2 py-1 text-xs ring-1 ring-hair focus:outline-none focus:ring-amber"
                            onChange={(event) =>
                              setFaction(playerId, event.target.value)
                            }
                            placeholder="Facción"
                            value={factions[playerId] ?? ''}
                          />
                        </label>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
              <div className="flex gap-2">
                {teamAId ? (
                  <button
                    className="rounded-full bg-amber px-4 py-2 font-extrabold text-ground text-xs transition-opacity hover:opacity-90"
                    onClick={() => record(teamAId)}
                    type="button"
                  >
                    Ganó {getTeamName(teams, teamAId)}
                  </button>
                ) : null}
                {teamBId ? (
                  <button
                    className="rounded-full bg-amber px-4 py-2 font-extrabold text-ground text-xs transition-opacity hover:opacity-90"
                    onClick={() => record(teamBId)}
                    type="button"
                  >
                    Ganó {getTeamName(teams, teamBId)}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

const GroupPhaseView = ({
  matches,
  teams,
  ranking,
  phase,
  onRecordGame,
}: {
  matches: Partido[];
  teams: Team[];
  ranking: string[];
  phase: GroupPhase;
  onRecordGame: MatchCardProps['onRecordGame'];
}) => {
  const standings = computeGroupStandings(matches, teams, phase, ranking);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          Clasificación
        </p>
        <ol className="flex flex-col gap-1.5">
          {standings.map((standing, index) => (
            <li
              className="flex items-center gap-3 rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair"
              key={standing.teamId}
            >
              <span className="w-6 font-mono text-muted text-xs">
                {index + 1}
              </span>
              <span className="flex-1 font-semibold">
                {getTeamName(teams, standing.teamId)}
              </span>
              <span className="font-mono text-muted text-xs">
                {standing.wins}V {standing.losses}D
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          Partidos
        </p>
        {matches.map((match) => (
          <MatchCard
            gamesToWin={match.gamesToWin}
            key={match.id}
            matchId={match.id}
            onRecordGame={onRecordGame}
            partido={match}
            teamAId={match.teamAId}
            teamBId={match.teamBId}
            teams={teams}
          />
        ))}
      </div>
    </div>
  );
};

const BracketPhaseView = ({
  matches,
  teams,
  onRecordGame,
}: {
  matches: BracketMatch[];
  teams: Team[];
  onRecordGame: MatchCardProps['onRecordGame'];
}) => {
  const rounds = [...new Set(matches.map((match) => match.round))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="flex flex-col gap-6">
      {rounds.map((round) => (
        <div className="flex flex-col gap-3" key={round}>
          <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
            {round === 0 ? 'Play-in' : `Ronda ${round}`}
          </p>
          {matches
            .filter((match) => match.round === round)
            .map((match) => (
              <MatchCard
                gamesToWin={match.partido?.gamesToWin ?? 1}
                key={match.id}
                matchId={match.id}
                onRecordGame={onRecordGame}
                partido={match.partido}
                teamAId={match.teamAId}
                teamBId={match.teamBId}
                teams={teams}
              />
            ))}
        </div>
      ))}
    </div>
  );
};

const PhasePlayStep = () => {
  const { state, dispatch } = useSimulator();
  const phaseIndex = state.currentPhaseIndex ?? 0;
  const phase = state.phases?.[phaseIndex];
  const runtime = state.phaseRuntimes?.[phaseIndex];
  const teams = state.teams ?? [];
  const totalPhases = state.phases?.length ?? 0;
  const isLastPhase = phaseIndex === totalPhases - 1;
  const ranking = state.finalRanking ?? state.participantIds;

  if (!phase || !runtime) return null;

  const complete =
    runtime.type === 'group'
      ? isGroupPhaseComplete(runtime.matches)
      : isBracketPhaseComplete(runtime.matches);

  const onRecordGame: MatchCardProps['onRecordGame'] = (
    matchId,
    winningTeamId,
    factions,
  ) =>
    dispatch({
      type: 'RECORD_GAME',
      matchId,
      winningTeamId,
      factionByPlayerId: factions,
    });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tight">
          Fase {phaseIndex + 1} de {totalPhases}
        </h2>
        <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          {phase.type === 'group' ? 'Grupo' : 'Eliminatoria'}
        </p>
      </div>

      {runtime.type === 'group' && phase.type === 'group' ? (
        <GroupPhaseView
          matches={runtime.matches}
          onRecordGame={onRecordGame}
          phase={phase}
          ranking={ranking}
          teams={teams}
        />
      ) : runtime.type === 'bracket' ? (
        <BracketPhaseView
          matches={runtime.matches}
          onRecordGame={onRecordGame}
          teams={teams}
        />
      ) : null}

      <button
        className="self-start rounded-full bg-amber px-6 py-2.5 font-extrabold text-ground text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!complete}
        onClick={() => {
          dispatch({ type: 'ADVANCE_PHASE' });
          if (isLastPhase) dispatch({ type: 'ADVANCE' });
        }}
        type="button"
      >
        {isLastPhase ? 'Ver campeón →' : 'Siguiente fase →'}
      </button>
    </section>
  );
};

export { PhasePlayStep };
