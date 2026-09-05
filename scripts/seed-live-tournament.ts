import { and, eq, inArray } from 'drizzle-orm';

import {
  distributeGroups,
  roundRobinSchedule,
} from '@/lib/tournament/phase-engine';
import { teamsLayout } from '@/lib/tournament/teams-layout';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { db } from '@/server/db';
import {
  edition,
  editionPlayer,
  game,
  gameVersion,
  liveVersion,
  match,
  phase,
  phaseBracketConfig,
  phaseBracketRoundConfig,
  phaseFactionRules,
  phaseGroup,
  phaseGroupConfig,
  phaseGroupTeam,
  player,
  team,
  teamFormationPotPlayer,
  teamMember,
  tournament,
  tournamentEvent,
  tournamentRankingSnapshot,
} from '@/server/db/schema';

/**
 * A rehearsal tournament for the match sheets (dev only): the coming
 * edition's confirmed players (or the top of the ranking when fewer than
 * eight confirmed), historical ranking, teams of four seated at random
 * with the best-ranked as captains, a single group (one leg, one game per
 * match, depleting faction pool) followed by a bracket (semis to two wins,
 * final to three), the group's jornadas generated and the tournament
 * already in play. Replaces any live tournament of that edition.
 * `pnpm run db:seed:live-tournament`.
 */
const TEAM_SIZE = 4;

const main = async () => {
  if (process.env.VERCEL_ENV === 'production')
    throw new Error('El torneo de ensayo no existe en producción.');
  const today = new Date().toISOString().slice(0, 10);
  const editions = await db.select().from(edition);
  const coming = editions
    .filter((e) => e.endsAt && e.endsAt >= today)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))[0];
  if (!coming) throw new Error('No hay una edición por venir.');

  const [aotr] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.name, 'Age of the Ring'));
  if (!aotr) throw new Error('Siembra el catálogo primero.');
  const versions = await db
    .select()
    .from(gameVersion)
    .where(eq(gameVersion.gameId, aotr.id))
    .orderBy(gameVersion.releaseOrder);
  const version = versions.at(-1);
  if (!version) throw new Error('AotR no tiene versiones.');

  // Participants: the edition's confirmations, topped up from the ranking.
  const ranking = await getHistoricalRanking(db);
  const confirmed = new Set(
    (
      await db
        .select({ playerId: editionPlayer.playerId })
        .from(editionPlayer)
        .where(eq(editionPlayer.editionId, coming.id))
    ).map((r) => r.playerId),
  );
  const chosen = ranking.filter((p) => confirmed.has(p.id));
  for (const p of ranking) {
    if (chosen.length >= 21) break;
    if (!confirmed.has(p.id)) chosen.push(p);
  }
  const ordered = ranking.filter((p) => chosen.some((c) => c.id === p.id));

  await db.transaction(async (tx) => {
    // Out with the previous rehearsal.
    const old = await tx
      .select({ id: tournament.id })
      .from(tournament)
      .where(
        and(eq(tournament.editionId, coming.id), eq(tournament.kind, 'team')),
      );
    for (const row of old) {
      const teams = await tx
        .select({ id: team.id })
        .from(team)
        .where(eq(team.tournamentId, row.id));
      const teamIds = teams.map((t) => t.id);
      const phases = await tx
        .select({ id: phase.id })
        .from(phase)
        .where(eq(phase.tournamentId, row.id));
      if (phases.length > 0) {
        const phaseIds = phases.map((p) => p.id);
        await tx
          .update(match)
          .set({ feederMatchAId: null, feederMatchBId: null })
          .where(inArray(match.phaseId, phaseIds));
        await tx.delete(match).where(inArray(match.phaseId, phaseIds));
        await tx.delete(phase).where(inArray(phase.id, phaseIds));
      }
      await tx
        .delete(tournamentEvent)
        .where(eq(tournamentEvent.tournamentId, row.id));
      await tx.delete(liveVersion).where(eq(liveVersion.tournamentId, row.id));
      await tx.delete(teamMember).where(eq(teamMember.tournamentId, row.id));
      if (teamIds.length > 0)
        await tx.delete(team).where(inArray(team.id, teamIds));
      await tx
        .delete(teamFormationPotPlayer)
        .where(eq(teamFormationPotPlayer.tournamentId, row.id));
      await tx
        .delete(tournamentRankingSnapshot)
        .where(eq(tournamentRankingSnapshot.tournamentId, row.id));
      await tx.delete(tournament).where(eq(tournament.id, row.id));
    }

    const [t] = await tx
      .insert(tournament)
      .values({
        editionId: coming.id,
        gameId: aotr.id,
        isOfficial: true,
        gameVersionId: version.id,
        model: 'classic',
        kind: 'team',
        stage: 'in_progress',
        stageChangedAt: new Date(),
        teamSize: TEAM_SIZE,
        rankingSource: 'historical',
        formationMethod: 'pots_random',
        captainPotIndex: 0,
        teamRankingSnapshot: ordered.map((p) => p.id),
      })
      .returning({ id: tournament.id });
    if (!t) throw new Error('No se pudo crear el torneo.');
    await tx.insert(tournamentRankingSnapshot).values(
      ordered.map((p, index) => ({
        tournamentId: t.id,
        playerId: p.id,
        position: index + 1,
        rings: p.rings,
        individualRings: p.individualRings,
      })),
    );

    // Pots by ranking, captains from the first, random teams within pots.
    const { teamCount } = teamsLayout(ordered.length, TEAM_SIZE);
    const pots: string[][] = [];
    for (let i = 0; i < ordered.length; i += teamCount)
      pots.push(ordered.slice(i, i + teamCount).map((p) => p.id));
    await tx
      .insert(teamFormationPotPlayer)
      .values(
        pots.flatMap((pot, potIndex) =>
          pot.map((playerId) => ({ tournamentId: t.id, potIndex, playerId })),
        ),
      );
    const teamIds: string[] = [];
    for (let i = 0; i < teamCount; i += 1) {
      const [row] = await tx
        .insert(team)
        .values({ tournamentId: t.id })
        .returning({ id: team.id });
      if (row) teamIds.push(row.id);
    }
    const members: (typeof teamMember.$inferInsert)[] = [];
    pots.forEach((pot, potIndex) => {
      const shuffled = [...pot].sort(() => Math.random() - 0.5);
      shuffled.forEach((playerId, index) => {
        const teamId = teamIds[index % teamCount];
        if (!teamId) return;
        members.push({
          teamId,
          playerId,
          tournamentId: t.id,
          isCaptain: potIndex === 0,
          seat: potIndex,
        });
      });
    });
    await tx.insert(teamMember).values(members);

    // Phase 1: one group, single leg, one game per match, depleting pool.
    const [groupPhase] = await tx
      .insert(phase)
      .values({ tournamentId: t.id, phaseOrder: 1, type: 'group', name: null })
      .returning({ id: phase.id });
    const [bracketPhase] = await tx
      .insert(phase)
      .values({
        tournamentId: t.id,
        phaseOrder: 2,
        type: 'bracket',
        name: 'Playoffs',
      })
      .returning({ id: phase.id });
    if (!groupPhase || !bracketPhase)
      throw new Error('No se pudieron crear las fases.');
    await tx.insert(phaseGroupConfig).values({
      phaseId: groupPhase.id,
      roundsFormat: 'single',
      gamesToWinMatch: 1,
      groupCount: 1,
      qualifiersPerGroup: 4,
      groupDistribution: 'random',
    });
    await tx.insert(phaseBracketConfig).values({
      phaseId: bracketPhase.id,
      hasThirdPlaceMatch: false,
      seedingSource: 'previous_phase',
    });
    await tx.insert(phaseBracketRoundConfig).values([
      { phaseId: bracketPhase.id, roundIndex: 1, gamesToWinMatch: 2 },
      { phaseId: bracketPhase.id, roundIndex: 2, gamesToWinMatch: 3 },
    ]);
    await tx.insert(phaseFactionRules).values([
      {
        phaseId: groupPhase.id,
        allowRepeatAcrossTeams: false,
        poolMode: 'depleting',
        poolCarriesOver: false,
      },
      {
        phaseId: bracketPhase.id,
        allowRepeatAcrossTeams: false,
        poolMode: 'depleting',
        poolCarriesOver: true,
      },
    ]);
    const [groups] = distributeGroups(teamIds, 1, 'random');
    const [groupRow] = await tx
      .insert(phaseGroup)
      .values({ phaseId: groupPhase.id, groupIndex: 0, label: 'A' })
      .returning({ id: phaseGroup.id });
    if (!groupRow || !groups) throw new Error('No se pudo crear el grupo.');
    await tx.insert(phaseGroupTeam).values(
      groups.map((teamId, seed) => ({
        groupId: groupRow.id,
        teamId,
        seed: seed + 1,
      })),
    );
    const jornadas = roundRobinSchedule(groups, 'single');
    await tx.insert(match).values(
      jornadas.flatMap((jornada) =>
        jornada.pairings.map((p, order) => ({
          phaseId: groupPhase.id,
          groupId: groupRow.id,
          teamAId: p.teamAId,
          teamBId: p.teamBId,
          roundIndex: jornada.roundIndex,
          leg: p.leg,
          order: order + 1,
        })),
      ),
    );
    await tx.insert(liveVersion).values({ tournamentId: t.id });
    await tx.insert(tournamentEvent).values({
      tournamentId: t.id,
      stream: 'admin',
      seq: 1,
      type: 'rehearsal_seeded',
      payload: { participants: ordered.length, teams: teamCount },
      at: new Date(),
    });
    console.log(
      `Torneo de ensayo ${coming.year}: ${ordered.length} jugadores, ${teamCount} equipos, ${jornadas.length} jornadas.`,
    );
  });
  const names = await db
    .select({ name: player.name })
    .from(player)
    .where(
      inArray(
        player.id,
        ordered.slice(0, 5).map((p) => p.id),
      ),
    );
  console.log('Capitanes (primer bombo):', names.map((n) => n.name).join(', '));
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
