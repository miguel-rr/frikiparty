type PhaseLike = {
  group: { gamesToWinMatch: number } | null;
  bracket: { rounds: { roundIndex: number; gamesToWinMatch: number }[] } | null;
};

/** Games needed to win a given match, from its phase's configuration (Drizzle-free, for the client). */
const gamesToWinFor = (
  phaseRow: PhaseLike,
  m: { roundIndex: number | null },
) => {
  if (phaseRow.group) return phaseRow.group.gamesToWinMatch;
  if (phaseRow.bracket) {
    return (
      phaseRow.bracket.rounds.find((r) => r.roundIndex === m.roundIndex)
        ?.gamesToWinMatch ??
      phaseRow.bracket.rounds.at(-1)?.gamesToWinMatch ??
      1
    );
  }
  return 1;
};

export { gamesToWinFor };
