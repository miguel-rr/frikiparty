import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  edition,
  game,
  player,
  team,
  teamMember,
  tournament,
  venue,
} from '@/server/db/schema';

type HistoricalEdition = {
  year: number;
  order?: number;
  venue?: string;
  mapsUrl?: string;
  winningTeam: (string | null)[];
  individualChampion?: string;
};

/** Years for which we're confident the game was Age of the Ring — everything else stays unofficial-game (gameId null). */
const AOTR_YEARS = new Set([2024, 2025]);

const main = async () => {
  const path = join(import.meta.dirname, 'data/historical-editions.json');
  const { editions } = JSON.parse(readFileSync(path, 'utf-8')) as {
    editions: HistoricalEdition[];
  };

  // Fail loudly instead of silently creating a player — the whole point of
  // this check is that every name in the JSON must already exist.
  const allPlayers = await db.select().from(player);
  const playerIdByName = new Map(allPlayers.map((p) => [p.name, p.id]));
  const unknownNames = new Set(
    editions
      .flatMap((e) => [...e.winningTeam, e.individualChampion ?? null])
      .filter((name): name is string => name !== null)
      .filter((name) => !playerIdByName.has(name)),
  );
  if (unknownNames.size > 0) {
    throw new Error(
      `Unknown player name(s), not importing anything: ${[...unknownNames].join(', ')}`,
    );
  }

  const venueIdByName = new Map<string, string>();
  const getOrCreateVenue = async (name: string, mapsUrl?: string) => {
    const existing = venueIdByName.get(name);
    if (existing) return existing;
    const [row] = await db
      .insert(venue)
      .values({ name, mapsUrl })
      .returning({ id: venue.id });
    if (!row) throw new Error(`Failed to insert venue "${name}"`);
    venueIdByName.set(name, row.id);
    return row.id;
  };

  let aotrGameId: string | null = null;
  const getAotrGameId = async () => {
    if (aotrGameId) return aotrGameId;
    const [existing] = await db
      .select({ id: game.id })
      .from(game)
      .where(eq(game.name, 'Age of the Ring'));
    if (existing) {
      aotrGameId = existing.id;
      return existing.id;
    }
    const [row] = await db
      .insert(game)
      .values({ name: 'Age of the Ring', isOfficial: true })
      .returning({ id: game.id });
    if (!row) throw new Error('Failed to insert game "Age of the Ring"');
    aotrGameId = row.id;
    return row.id;
  };

  for (const entry of editions) {
    const venueId = entry.venue
      ? await getOrCreateVenue(entry.venue, entry.mapsUrl)
      : null;

    const [editionRow] = await db
      .insert(edition)
      .values({ year: entry.year, order: entry.order ?? 1, venueId })
      .returning({ id: edition.id });
    if (!editionRow) throw new Error(`Failed to insert edition ${entry.year}`);

    const gameId = AOTR_YEARS.has(entry.year) ? await getAotrGameId() : null;

    const [tournamentRow] = await db
      .insert(tournament)
      .values({ editionId: editionRow.id, gameId, isOfficial: true })
      .returning({ id: tournament.id });
    if (!tournamentRow)
      throw new Error(`Failed to insert tournament for ${entry.year}`);

    const [teamRow] = await db
      .insert(team)
      .values({ tournamentId: tournamentRow.id })
      .returning({ id: team.id });
    if (!teamRow)
      throw new Error(`Failed to insert winning team for ${entry.year}`);

    await db.insert(teamMember).values(
      entry.winningTeam.map((name) => ({
        teamId: teamRow.id,
        tournamentId: tournamentRow.id,
        playerId: name ? (playerIdByName.get(name) ?? null) : null,
      })),
    );

    console.log(
      `Imported ${entry.year}${entry.order ? ` (#${entry.order})` : ''} — ${entry.winningTeam.map((n) => n ?? '???').join(', ')}`,
    );

    if (entry.individualChampion) {
      // Same edition, same game as the team tournament that year — just a
      // second official tournament with a one-player "team" as its winner.
      const [individualTournamentRow] = await db
        .insert(tournament)
        .values({ editionId: editionRow.id, gameId, isOfficial: true })
        .returning({ id: tournament.id });
      if (!individualTournamentRow)
        throw new Error(
          `Failed to insert individual tournament for ${entry.year}`,
        );

      const [individualTeamRow] = await db
        .insert(team)
        .values({ tournamentId: individualTournamentRow.id })
        .returning({ id: team.id });
      if (!individualTeamRow)
        throw new Error(
          `Failed to insert individual champion team for ${entry.year}`,
        );

      await db.insert(teamMember).values({
        teamId: individualTeamRow.id,
        tournamentId: individualTournamentRow.id,
        playerId: playerIdByName.get(entry.individualChampion) ?? null,
      });

      console.log(
        `  + Individual champion ${entry.year} — ${entry.individualChampion}`,
      );
    }
  }

  console.log(`\nDone: ${editions.length} historical editions imported.`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
