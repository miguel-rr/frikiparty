import type { Partida, Partido } from '@/lib/simulator/types';

const createPartido = (
  teamAId: string,
  teamBId: string,
  gamesToWin: number,
): Partido => ({
  id: crypto.randomUUID(),
  teamAId,
  teamBId,
  gamesToWin,
  games: [],
  winnerTeamId: null,
});

/** Appends a game and re-derives the match winner once a side reaches `gamesToWin`. */
const recordGame = (
  partido: Partido,
  winningTeamId: string,
  factionByPlayerId: Record<string, string>,
): Partido => {
  const game: Partida = {
    id: crypto.randomUUID(),
    winningTeamId,
    factionByPlayerId,
  };
  const games = [...partido.games, game];
  const winsA = games.filter((g) => g.winningTeamId === partido.teamAId).length;
  const winsB = games.filter((g) => g.winningTeamId === partido.teamBId).length;
  const winnerTeamId =
    winsA >= partido.gamesToWin
      ? partido.teamAId
      : winsB >= partido.gamesToWin
        ? partido.teamBId
        : null;
  return { ...partido, games, winnerTeamId };
};

export { createPartido, recordGame };
