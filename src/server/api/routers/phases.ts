import { TRPCError } from '@trpc/server';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  bracketRounds,
  buildBracketPlan,
  distributeGroups,
  pairSwissRound,
  roundRobinSchedule,
  teamRankOrder,
} from '@/lib/tournament/phase-engine';
import { GROUP_TIEBREAK_CRITERIA } from '@/lib/tournament/tiebreak';
import { adminProcedure, createTRPCRouter } from '@/server/api/trpc';
import {
  match,
  phase,
  phaseBracketConfig,
  phaseBracketRoundConfig,
  phaseFactionRules,
  phaseGroup,
  phaseGroupConfig,
  phaseGroupTeam,
  tournament,
  tournamentSwissConfig,
} from '@/server/db/schema';
import { type LivePhase, loadPhases } from '@/server/live/phases';
import { getLiveState, type LiveState } from '@/server/live/state';
import { actorFromSession, runTournamentTx, type Tx } from '@/server/live/tx';

const id = z.string().uuid();

const phasePlanSchema = z.object({
  type: z.enum(['group', 'bracket', 'swiss']),
  name: z.string().trim().max(60).nullable(),
  group: z
    .object({
      groupCount: z.number().int().min(1).max(8),
      roundsFormat: z.enum(['single', 'double']),
      gamesToWinMatch: z.number().int().min(1).max(5),
      tiebreakChain: z.array(z.enum(GROUP_TIEBREAK_CRITERIA)).min(1),
      qualifiersPerGroup: z.number().int().min(1).max(32),
      groupDistribution: z.enum(['random', 'manual']),
    })
    .nullable(),
  bracket: z
    .object({
      hasThirdPlaceMatch: z.boolean(),
      seedingSource: z.enum(['previous_phase', 'ranking', 'manual']),
      /** Games to win per round index (0 = play-in); missing rounds use `defaultGamesToWin`. */
      gamesToWinByRound: z.record(z.string(), z.number().int().min(1).max(5)),
      defaultGamesToWin: z.number().int().min(1).max(5),
    })
    .nullable(),
  swiss: z
    .object({
      eliminationLosses: z.number().int().min(1).max(10),
      pairingMethod: z.enum(['random', 'ranking_parity', 'ranking_seed']),
    })
    .nullable(),
  factions: z
    .object({
      allowRepeatAcrossTeams: z.boolean(),
      poolMode: z.enum(['fresh', 'depleting']),
      poolCarriesOver: z.boolean(),
    })
    .nullable(),
});

type PhasePlan = z.infer<typeof phasePlanSchema>;

const PLANNABLE: LiveState['stage'][] = ['teams_ready', 'phase_setup'];

const loadForPlanning = async (
  db: Parameters<typeof getLiveState>[0],
  tournamentId: string,
) => {
  const state = await getLiveState(db, tournamentId, { privileged: true });
  if (!state) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!PLANNABLE.includes(state.stage)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'Las fases sólo se configuran con los equipos hechos y antes de arrancar.',
    });
  }
  return state;
};

/** Removes every phase row (and its matches) of a tournament. */
const clearPhases = async (tx: Tx, tournamentId: string) => {
  const rows = await tx
    .select({ id: phase.id })
    .from(phase)
    .where(eq(phase.tournamentId, tournamentId));
  const phaseIds = rows.map((r) => r.id);
  if (phaseIds.length === 0) return;
  await clearMatches(tx, phaseIds);
  await tx.delete(phase).where(inArray(phase.id, phaseIds));
  await tx
    .delete(tournamentSwissConfig)
    .where(eq(tournamentSwissConfig.tournamentId, tournamentId));
};

const clearMatches = async (tx: Tx, phaseIds: string[]) => {
  const rows = await tx
    .select({ id: match.id })
    .from(match)
    .where(inArray(match.phaseId, phaseIds));
  const matchIds = rows.map((r) => r.id);
  if (matchIds.length > 0) {
    await tx
      .update(match)
      .set({ feederMatchAId: null, feederMatchBId: null })
      .where(inArray(match.id, matchIds));
    await tx.delete(match).where(inArray(match.id, matchIds));
  }
  const groups = await tx
    .select({ id: phaseGroup.id })
    .from(phaseGroup)
    .where(inArray(phaseGroup.phaseId, phaseIds));
  if (groups.length > 0) {
    await tx.delete(phaseGroupTeam).where(
      inArray(
        phaseGroupTeam.groupId,
        groups.map((g) => g.id),
      ),
    );
    await tx.delete(phaseGroup).where(
      inArray(
        phaseGroup.id,
        groups.map((g) => g.id),
      ),
    );
  }
};

/** How many teams enter a phase: everyone, or the previous phase's qualifiers. */
const entrantsOf = (
  plans: PhasePlan[],
  index: number,
  teamCount: number,
): number => {
  if (index === 0) return teamCount;
  const previous = plans[index - 1];
  if (previous?.group)
    return previous.group.groupCount * previous.group.qualifiersPerGroup;
  return entrantsOf(plans, index - 1, teamCount);
};

const writePlan = async (
  tx: Tx,
  tournamentId: string,
  plans: PhasePlan[],
  teamCount: number,
) => {
  await clearPhases(tx, tournamentId);
  for (const [index, plan] of plans.entries()) {
    const [row] = await tx
      .insert(phase)
      .values({
        tournamentId,
        phaseOrder: index + 1,
        type: plan.type,
        name: plan.name,
      })
      .returning({ id: phase.id });
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    if (plan.type === 'group' && plan.group) {
      await tx
        .insert(phaseGroupConfig)
        .values({ phaseId: row.id, ...plan.group });
    }
    if (plan.type === 'bracket' && plan.bracket) {
      await tx.insert(phaseBracketConfig).values({
        phaseId: row.id,
        hasThirdPlaceMatch: plan.bracket.hasThirdPlaceMatch,
        seedingSource: plan.bracket.seedingSource,
      });
      const entrants = entrantsOf(plans, index, teamCount);
      const rounds = bracketRounds(entrants);
      const hasPlayIn = entrants > 1 && entrants !== 2 ** rounds;
      const roundRows = [];
      for (let r = hasPlayIn ? 0 : 1; r <= rounds; r += 1) {
        roundRows.push({
          phaseId: row.id,
          roundIndex: r,
          gamesToWinMatch:
            plan.bracket.gamesToWinByRound[String(r)] ??
            plan.bracket.defaultGamesToWin,
        });
      }
      if (roundRows.length > 0)
        await tx.insert(phaseBracketRoundConfig).values(roundRows);
    }
    if (plan.type === 'swiss' && plan.swiss) {
      await tx
        .insert(tournamentSwissConfig)
        .values({ tournamentId, ...plan.swiss })
        .onConflictDoUpdate({
          target: tournamentSwissConfig.tournamentId,
          set: plan.swiss,
        });
    }
    if (plan.factions) {
      await tx
        .insert(phaseFactionRules)
        .values({ phaseId: row.id, ...plan.factions });
    }
  }
};

/**
 * Creates a phase's groups and matches from the teams that enter it.
 * Groups: distribute + round-robin jornadas. Bracket: seeds → tree with
 * play-in. Swiss: round 1 by the pairing criterion. `groupsOverride`
 * keeps a hand-made distribution.
 */
const generatePhase = async (
  tx: Tx,
  state: LiveState,
  phaseRow: LivePhase,
  entrantTeamIds: string[],
  groupsOverride?: string[][],
) => {
  await clearMatches(tx, [phaseRow.id]);
  const seeded = teamRankOrder(
    state.teams.filter((t) => entrantTeamIds.includes(t.id)),
    state.ranking ?? [],
  );
  if (phaseRow.type === 'group' && phaseRow.group) {
    const groups =
      groupsOverride ??
      distributeGroups(
        seeded,
        phaseRow.group.groupCount,
        phaseRow.group.groupDistribution === 'random' ? 'random' : 'snake',
      );
    for (const [gi, teamIds] of groups.entries()) {
      const [groupRow] = await tx
        .insert(phaseGroup)
        .values({
          phaseId: phaseRow.id,
          groupIndex: gi,
          label: String.fromCharCode(65 + gi),
        })
        .returning({ id: phaseGroup.id });
      if (!groupRow) continue;
      if (teamIds.length > 0) {
        await tx.insert(phaseGroupTeam).values(
          teamIds.map((teamId, seed) => ({
            groupId: groupRow.id,
            teamId,
            seed: seed + 1,
          })),
        );
      }
      const jornadas = roundRobinSchedule(teamIds, phaseRow.group.roundsFormat);
      const rows = jornadas.flatMap((jornada) =>
        jornada.pairings.map((p, order) => ({
          phaseId: phaseRow.id,
          groupId: groupRow.id,
          teamAId: p.teamAId,
          teamBId: p.teamBId,
          roundIndex: jornada.roundIndex,
          leg: p.leg,
          order: order + 1,
        })),
      );
      if (rows.length > 0) await tx.insert(match).values(rows);
    }
    return;
  }
  if (phaseRow.type === 'bracket' && phaseRow.bracket) {
    const plan = buildBracketPlan(seeded, {
      thirdPlace: phaseRow.bracket.hasThirdPlaceMatch,
    });
    const idByKey = new Map<string, string>();
    for (const planned of plan) {
      const [row] = await tx
        .insert(match)
        .values({
          phaseId: phaseRow.id,
          teamAId: planned.teamAId,
          teamBId: planned.teamBId,
          roundIndex: planned.roundIndex,
          order: planned.order,
          isThirdPlace: planned.isThirdPlace,
        })
        .returning({ id: match.id });
      if (row) idByKey.set(planned.key, row.id);
    }
    for (const planned of plan) {
      const own = idByKey.get(planned.key);
      if (!own || (!planned.feederAKey && !planned.feederBKey)) continue;
      await tx
        .update(match)
        .set({
          feederMatchAId: planned.feederAKey
            ? (idByKey.get(planned.feederAKey) ?? null)
            : null,
          feederMatchBId: planned.feederBKey
            ? (idByKey.get(planned.feederBKey) ?? null)
            : null,
        })
        .where(eq(match.id, own));
    }
    return;
  }
  if (phaseRow.type === 'swiss' && phaseRow.swiss) {
    const { pairings, byeTeamId } = pairSwissRound(
      seeded.map((teamId) => ({
        id: teamId,
        wins: 0,
        losses: 0,
        opponents: [],
      })),
      phaseRow.swiss.pairingMethod,
      seeded,
      phaseRow.swiss.eliminationLosses,
    );
    const rows = pairings.map((p, order) => ({
      phaseId: phaseRow.id,
      teamAId: p.teamAId,
      teamBId: p.teamBId,
      roundIndex: 1,
      order: order + 1,
    }));
    if (byeTeamId) {
      rows.push({
        phaseId: phaseRow.id,
        teamAId: null,
        teamBId: null,
        roundIndex: 1,
        order: rows.length + 1,
        byeTeamId,
      } as never);
    }
    if (rows.length > 0) await tx.insert(match).values(rows);
  }
};

const phasesRouter = createTRPCRouter({
  /** Replaces the whole phase plan (only before the tournament starts). */
  savePlan: adminProcedure
    .input(
      z.object({ tournamentId: id, phases: z.array(phasePlanSchema).min(1) }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadForPlanning(ctx.db, input.tournamentId);
      for (const [index, plan] of input.phases.entries()) {
        if (
          plan.type === 'swiss' &&
          (index !== 0 || input.phases.length !== 1)
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'El suizo es una única fase.',
          });
        }
        if (
          (plan.type === 'group' && !plan.group) ||
          (plan.type === 'bracket' && !plan.bracket) ||
          (plan.type === 'swiss' && !plan.swiss)
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `A la fase ${index + 1} le falta su configuración.`,
          });
        }
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await writePlan(
            tx,
            input.tournamentId,
            input.phases,
            state.teams.length,
          );
          await tx
            .update(tournament)
            .set({ stage: 'teams_ready', stageChangedAt: new Date() })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'phase_plan_saved',
            payload: { phases: input.phases },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),

  /** Generates the first phase's groups and matches; the calendar is born. */
  generateFirst: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadForPlanning(ctx.db, input.tournamentId);
      const phases = await loadPhases(ctx.db, input.tournamentId);
      const first = phases[0];
      if (!first)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Configura las fases primero.',
        });
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await generatePhase(
            tx,
            state,
            first,
            state.teams.map((t) => t.id),
          );
          await tx
            .update(tournament)
            .set({ stage: 'phase_setup', stageChangedAt: new Date() })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'phase_generated',
            payload: { phaseId: first.id, order: 1 },
          });
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: state.stage,
              to: 'phase_setup',
              direction: 'forward',
            },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),

  /** Hand-made group distribution for the first phase (regenerates its matches). */
  setGroups: adminProcedure
    .input(z.object({ tournamentId: id, groups: z.array(z.array(id)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadForPlanning(ctx.db, input.tournamentId);
      const phases = await loadPhases(ctx.db, input.tournamentId);
      const first = phases[0];
      if (!first?.group)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La primera fase no es de grupos.',
        });
      const all = new Set(state.teams.map((t) => t.id));
      const given = input.groups.flat();
      if (
        given.length !== all.size ||
        given.some((t) => !all.has(t)) ||
        new Set(given).size !== given.length
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cada equipo debe estar en exactamente un grupo.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await generatePhase(tx, state, first, given, input.groups);
          await emit({
            stream: 'admin',
            type: 'groups_edited',
            payload: { groups: input.groups },
          });
        },
      );
      return { ok: true };
    }),

  /** "Arrancar torneo": the first jornada is public and results may come in. */
  startPlay: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadForPlanning(ctx.db, input.tournamentId);
      const phases = await loadPhases(ctx.db, input.tournamentId);
      if (!phases[0] || phases[0].matches.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Genera la primera fase antes de arrancar.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({ stage: 'in_progress', stageChangedAt: new Date() })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: state.stage,
              to: 'in_progress',
              direction: 'forward',
            },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),
});

export { generatePhase, phasesRouter };
