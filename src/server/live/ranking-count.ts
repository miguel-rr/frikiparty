import { asc, eq, sql } from 'drizzle-orm';

import type {
  FormationConfig,
  RankingMeta,
} from '@/lib/tournament/formation-config';
import {
  combineRankingsWithTies,
  historicalTieGroups,
} from '@/lib/tournament/ranking';
import type { RankingSource } from '@/lib/tournament/stages';
import type { Ballot } from '@/lib/tournament/types';
import { countVotes, type VoteCount } from '@/lib/tournament/vote-count';
import type { db as Db } from '@/server/db';
import { player, tournamentRankingSnapshot } from '@/server/db/schema';

type Database = typeof Db;

/** The frozen historical order of a tournament, with its ring ties. */
const loadHistoricalRanking = async (db: Database, tournamentId: string) => {
  const rows = await db
    .select({
      id: tournamentRankingSnapshot.playerId,
      name: player.name,
      rings: tournamentRankingSnapshot.rings,
      individualRings: tournamentRankingSnapshot.individualRings,
    })
    .from(tournamentRankingSnapshot)
    .innerJoin(player, eq(player.id, tournamentRankingSnapshot.playerId))
    .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId))
    .orderBy(asc(tournamentRankingSnapshot.position));
  const order = rows.map((row) => row.id);
  return {
    order,
    tieGroups: historicalTieGroups(
      order,
      new Map(rows.map((row) => [row.id, row])),
    ),
    names: Object.fromEntries(rows.map((row) => [row.id, row.name])),
    rings: Object.fromEntries(
      rows.map((row) => [
        row.id,
        { rings: row.rings, individualRings: row.individualRings },
      ]),
    ),
  };
};

/** Year of each player's latest team ring (individual titles aside). */
const loadLatestRingYears = async (
  db: Database,
  playerIds: string[],
): Promise<Record<string, number | null>> => {
  const result: Record<string, number | null> = Object.fromEntries(
    playerIds.map((id) => [id, null]),
  );
  if (playerIds.length === 0) return result;
  const rows = (await db.execute(sql`
    SELECT tm.player_id, max(e.year)::int AS year
    FROM frikiparty_team_member tm
    JOIN frikiparty_team t ON t.id = tm.team_id
    JOIN frikiparty_tournament tr ON tr.id = t.tournament_id
    JOIN frikiparty_edition e ON e.id = tr.edition_id
    WHERE t.final_position = 1
      AND NOT e.is_rehearsal
      AND (SELECT count(*) FROM frikiparty_team_member x WHERE x.team_id = t.id) > 1
      AND tm.player_id IN (${sql.join(
        playerIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
    GROUP BY tm.player_id
  `)) as unknown as { player_id: string; year: number }[];
  for (const row of rows) result[row.player_id] = row.year;
  return result;
};

type RankingOutcome = {
  order: string[];
  meta: RankingMeta;
  /** The vote's own count, when there was a vote. */
  vote: VoteCount | null;
};

/**
 * The tournament ranking for a source and a set of options: the
 * historical order as is, the counted vote, or the blend of both.
 */
const computeRanking = (input: {
  source: RankingSource;
  historical: { order: string[]; tieGroups: string[][] };
  ballots: Ballot[];
  historicalWeightPercent: number | null;
  config: Pick<FormationConfig, 'voteCount' | 'voteOutlierThreshold'>;
}): RankingOutcome => {
  const { historical } = input;
  if (input.source === 'historical') {
    return {
      order: historical.order,
      meta: { tieGroups: historical.tieGroups },
      vote: null,
    };
  }
  const vote = countVotes(input.ballots, historical.order, {
    method: input.config.voteCount,
    outlierThreshold: input.config.voteOutlierThreshold,
  });
  const counted = {
    ballotsUsed: vote.ballotsUsed,
    ballotsDiscarded: vote.ballotsDiscarded,
  };
  if (input.source === 'vote') {
    return {
      order: vote.order,
      meta: { tieGroups: vote.tieGroups, scores: vote.scores, ...counted },
      vote,
    };
  }
  const blended = combineRankingsWithTies(
    historical,
    vote,
    input.historicalWeightPercent ?? 50,
  );
  return {
    order: blended.order,
    meta: { tieGroups: blended.tieGroups, scores: blended.scores, ...counted },
    vote,
  };
};

export {
  computeRanking,
  loadHistoricalRanking,
  loadLatestRingYears,
  type RankingOutcome,
};
