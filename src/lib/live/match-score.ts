type ScoreMatch = {
  teamAId: string | null;
  teamBId: string | null;
  games: { winnerTeamId: string | null }[];
};

/** Games won per side, from a match's games (Drizzle-free, for the client). */
const matchScore = (m: ScoreMatch) => ({
  a: m.games.filter((g) => g.winnerTeamId && g.winnerTeamId === m.teamAId)
    .length,
  b: m.games.filter((g) => g.winnerTeamId && g.winnerTeamId === m.teamBId)
    .length,
});

export { matchScore, type ScoreMatch };
