/**
 * How many teams a tournament gets and how big each one is, from the
 * participant count and the max players per team (= number of pots).
 *
 * teams = ceil(players / teamSize); pots hold `teams` players each, the
 * last pot short — so with 21 players and 5 per team there are 5 teams,
 * four of 4 and one of 5 (core-logic.md §Equipos, live plan §6.1).
 */
const teamsLayout = (playerCount: number, teamSize: number) => {
  if (playerCount <= 0 || teamSize <= 0) {
    return { teamCount: 0, sizes: [] as number[] };
  }
  const teamCount = Math.ceil(playerCount / teamSize);
  const sizes: number[] = [];
  for (let index = 0; index < teamCount; index += 1) {
    // Pot p (0-based) has players for teams 0..teams-1 until it runs out;
    // team t gets one player from every pot that still reaches it.
    let size = 0;
    for (let pot = 0; pot < teamSize; pot += 1) {
      const potSize = Math.max(
        0,
        Math.min(teamCount, playerCount - pot * teamCount),
      );
      if (index < potSize) size += 1;
    }
    sizes.push(size);
  }
  return { teamCount, sizes };
};

/** "5 equipos: cuatro de 4 y uno de 5". */
const describeTeamsLayout = (playerCount: number, teamSize: number) => {
  const { teamCount, sizes } = teamsLayout(playerCount, teamSize);
  if (teamCount === 0) return 'Sin equipos';
  const counts = new Map<number, number>();
  for (const size of sizes) counts.set(size, (counts.get(size) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([size, count]) => `${countWord(count)} de ${size}`);
  const head = teamCount === 1 ? '1 equipo' : `${teamCount} equipos`;
  return counts.size === 1
    ? `${head} de ${sizes[0]}`
    : `${head}: ${joinEs(parts)}`;
};

const COUNT_WORDS = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
];

const countWord = (count: number) => COUNT_WORDS[count] ?? String(count);

const joinEs = (parts: string[]) =>
  parts.length <= 1
    ? (parts[0] ?? '')
    : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;

export { describeTeamsLayout, teamsLayout };
