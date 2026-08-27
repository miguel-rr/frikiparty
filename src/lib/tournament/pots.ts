import { shuffle } from '@/lib/tournament/ranking';
import type { Pots, Team } from '@/lib/tournament/types';

/**
 * Chunks a confirmed ranking into `potCount` contiguous tiers. Team count is
 * derived (players / potCount, rounded up), so when the total isn't
 * divisible by potCount the last pot ends up smaller than the rest.
 */
const generatePots = (
  ranking: string[],
  potCount: number,
): { pots: Pots; teamCount: number } => {
  const teamCount = Math.ceil(ranking.length / potCount);
  const pots: Pots = [];
  for (let i = 0; i < potCount; i++) {
    pots.push(ranking.slice(i * teamCount, (i + 1) * teamCount));
  }
  return { pots, teamCount };
};

/** One random player per pot goes to each team, pot by pot. */
const assignRandomWithinPots = (pots: Pots, teamCount: number): Team[] => {
  const teams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    playerIds: [],
  }));

  for (const pot of pots) {
    const shuffled = shuffle(pot);
    shuffled.forEach((playerId, index) => {
      teams[index]?.playerIds.push(playerId);
    });
  }

  return teams;
};

export { assignRandomWithinPots, generatePots };
