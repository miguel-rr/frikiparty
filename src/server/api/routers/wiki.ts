import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { slugify } from '@/lib/slug';
import { adminProcedure, createTRPCRouter } from '@/server/api/trpc';
import {
  faction,
  factionHero,
  factionPower,
  factionRevision,
  factionStructure,
  factionUnit,
  game,
  gameMap,
  gameVersion,
} from '@/server/db/schema';

const id = z.string().uuid();
const optionalText = z.string().trim().max(20_000).nullable();

/** The wiki is static: every write refreshes its pages. */
const revalidateWiki = () => {
  revalidatePath('/games');
  revalidatePath('/games/[slug]', 'page');
  revalidatePath('/games/[slug]/[version]', 'page');
  revalidatePath('/games/[slug]/[version]/[code]', 'page');
};

const stats = z.record(z.string(), z.number()).default({});
const counterTag = z.enum([
  'swordsmen',
  'pikemen',
  'archers',
  'cavalry',
  'siege',
  'monsters',
  'heroes',
  'heroic',
  'structures',
  'infantry',
  'flying',
  'ranged',
  'melee',
  'elite',
  'numbers',
  'fire',
]);
const ability = z.object({
  name: z.string().trim().min(1),
  level: z.number().int().nullable(),
  hotkey: z.string().trim().max(3).nullable(),
  kind: z.enum(['active', 'passive', 'leadership', 'toggle', 'formation']),
  description: z.string().trim(),
  stats: z.record(z.string(), z.number()).optional(),
});
const upgrade = z.object({
  name: z.string().trim().min(1),
  cost: z.number().int().nullable(),
  hotkey: z.string().trim().max(3).nullable(),
  level: z.number().int().nullable(),
  description: z.string().trim(),
  stats: z.record(z.string(), z.number()).optional(),
});
const imageUrl = z.string().trim().url().nullable();

const rowsSchema = z.object({
  heroes: z.array(
    z.object({
      name: z.string().trim().min(1),
      title: optionalText,
      recruitedAt: optionalText,
      cost: z.number().int().nullable(),
      buildTimeSeconds: z.number().int().nullable(),
      health: z.number().int().nullable(),
      armourSet: optionalText,
      attackType: optionalText,
      isSummon: z.boolean().default(false),
      description: optionalText,
      abilities: z.array(ability),
      stats,
      imageUrl,
      portraitUrl: imageUrl,
    }),
  ),
  units: z.array(
    z.object({
      name: z.string().trim().min(1),
      category: z.enum([
        'swordsmen',
        'pikemen',
        'archers',
        'cavalry',
        'siege',
        'monster',
        'heroic',
        'special',
      ]),
      recruitedAt: optionalText,
      requirements: optionalText,
      cost: z.number().int().nullable(),
      commandPoints: z.number().int().nullable(),
      health: z.number().int().nullable(),
      buildTimeSeconds: z.number().int().nullable(),
      armourSet: optionalText,
      attackType: optionalText,
      maxCount: z.number().int().nullable(),
      isSummon: z.boolean().default(false),
      strongAgainst: z.array(counterTag).default([]),
      weakAgainst: z.array(counterTag).default([]),
      description: optionalText,
      abilities: z.array(ability).default([]),
      upgrades: z.array(upgrade).default([]),
      stats,
      imageUrl,
      portraitUrl: imageUrl,
    }),
  ),
  structures: z.array(
    z.object({
      name: z.string().trim().min(1),
      kind: z
        .enum([
          'fortress',
          'economy',
          'production',
          'defence',
          'support',
          'summoned',
        ])
        .nullable(),
      cost: z.number().int().nullable(),
      buildTimeSeconds: z.number().int().nullable(),
      health: z.number().int().nullable(),
      healthByLevel: z.array(z.number().int()).default([]),
      armourSet: optionalText,
      maxCount: z.number().int().nullable(),
      description: optionalText,
      bonus: optionalText,
      produces: z.array(z.string().trim().min(1)).default([]),
      upgrades: z.array(upgrade).default([]),
      abilities: z.array(ability).default([]),
      stats,
      imageUrl,
    }),
  ),
  powers: z.array(
    z.object({
      name: z.string().trim().min(1),
      tier: z.number().int().min(1).max(4).nullable(),
      cost: z.number().int().nullable(),
      position: z.enum(['L', 'C', 'R', 'LL', 'LR', 'RL', 'RR']).nullable(),
      kind: z
        .enum(['buff', 'debuff', 'summon', 'heal', 'utility', 'attack'])
        .nullable(),
      requires: z.array(z.string().trim().min(1)).default([]),
      description: optionalText,
      stats,
      imageUrl,
    }),
  ),
});

const wikiRouter = createTRPCRouter({
  /** Everything the admin desk lists: games with versions, factions and maps. */
  overview: adminProcedure.query(async ({ ctx }) => {
    const [games, versions, factions, maps] = await Promise.all([
      ctx.db.select().from(game).orderBy(asc(game.name)),
      ctx.db.select().from(gameVersion).orderBy(asc(gameVersion.releaseOrder)),
      ctx.db
        .select()
        .from(faction)
        .orderBy(asc(faction.kind), asc(faction.sortOrder), asc(faction.name)),
      ctx.db.select().from(gameMap).orderBy(asc(gameMap.name)),
    ]);
    const revisions = await ctx.db
      .select({
        factionId: factionRevision.factionId,
        gameVersionId: factionRevision.gameVersionId,
      })
      .from(factionRevision);
    return { games, versions, factions, maps, revisions };
  }),

  updateGame: adminProcedure
    .input(
      z.object({
        id,
        name: z.string().trim().min(1),
        slug: z.string().trim().nullable(),
        isOfficial: z.boolean(),
        description: optionalText,
        websiteUrl: optionalText,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: gameId, ...rest } = input;
      await ctx.db
        .update(game)
        .set({ ...rest, slug: rest.slug ? slugify(rest.slug) : null })
        .where(eq(game.id, gameId));
      revalidateWiki();
      return { ok: true };
    }),

  createGame: adminProcedure
    .input(
      z.object({ name: z.string().trim().min(1), isOfficial: z.boolean() }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(game)
        .values({
          name: input.name,
          isOfficial: input.isOfficial,
          slug: slugify(input.name),
        })
        .returning({ id: game.id });
      revalidateWiki();
      return { id: row?.id };
    }),

  upsertVersion: adminProcedure
    .input(
      z.object({
        id: id.optional(),
        gameId: id,
        version: z.string().trim().min(1),
        releaseOrder: z.number().int().min(1),
        releasedAt: z.string().nullable(),
        notes: optionalText,
        changelogUrl: optionalText,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: versionId, ...rest } = input;
      if (versionId) {
        await ctx.db
          .update(gameVersion)
          .set(rest)
          .where(eq(gameVersion.id, versionId));
      } else {
        await ctx.db.insert(gameVersion).values(rest);
      }
      revalidateWiki();
      return { ok: true };
    }),

  upsertFaction: adminProcedure
    .input(
      z.object({
        id: id.optional(),
        name: z.string().trim().min(1),
        code: z.string().trim().min(1),
        kind: z.enum(['core', 'alternate']),
        introducedInVersionId: id,
        removedInVersionId: id.nullable(),
        transformsFactionId: id.nullable(),
        sortOrder: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: factionId, ...rest } = input;
      if (factionId) {
        await ctx.db.update(faction).set(rest).where(eq(faction.id, factionId));
      } else {
        await ctx.db.insert(faction).values(rest);
      }
      revalidateWiki();
      return { ok: true };
    }),

  upsertMap: adminProcedure
    .input(
      z.object({
        id: id.optional(),
        gameId: id,
        name: z.string().trim().min(1),
        players: z.number().int().nullable(),
        introducedInVersionId: id.nullable(),
        description: optionalText,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: mapId, ...rest } = input;
      if (mapId) {
        await ctx.db.update(gameMap).set(rest).where(eq(gameMap.id, mapId));
      } else {
        await ctx.db.insert(gameMap).values(rest);
      }
      revalidateWiki();
      return { ok: true };
    }),

  deleteMap: adminProcedure
    .input(z.object({ id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(gameMap).where(eq(gameMap.id, input.id));
      revalidateWiki();
      return { ok: true };
    }),

  /** A revision with its rows, for the editor (null when none exists yet). */
  revision: adminProcedure
    .input(z.object({ factionId: id, gameVersionId: id }))
    .query(async ({ ctx, input }) => {
      const [rev] = await ctx.db
        .select()
        .from(factionRevision)
        .where(
          and(
            eq(factionRevision.factionId, input.factionId),
            eq(factionRevision.gameVersionId, input.gameVersionId),
          ),
        );
      if (!rev) return null;
      const [heroes, units, structures, powers] = await Promise.all([
        ctx.db
          .select()
          .from(factionHero)
          .where(eq(factionHero.revisionId, rev.id))
          .orderBy(asc(factionHero.sortOrder)),
        ctx.db
          .select()
          .from(factionUnit)
          .where(eq(factionUnit.revisionId, rev.id))
          .orderBy(asc(factionUnit.sortOrder)),
        ctx.db
          .select()
          .from(factionStructure)
          .where(eq(factionStructure.revisionId, rev.id))
          .orderBy(asc(factionStructure.sortOrder)),
        ctx.db
          .select()
          .from(factionPower)
          .where(eq(factionPower.revisionId, rev.id))
          .orderBy(asc(factionPower.sortOrder)),
      ]);
      return { ...rev, heroes, units, structures, powers };
    }),

  /** Writes a whole revision: the text and every row, replacing what was there. */
  saveRevision: adminProcedure
    .input(
      z
        .object({
          factionId: id,
          gameVersionId: id,
          summary: optionalText,
          overview: optionalText,
          strengths: z.array(z.string().trim().min(1)),
          weaknesses: z.array(z.string().trim().min(1)),
          changes: optionalText,
          ringHero: optionalText,
          sourceUrl: optionalText,
        })
        .merge(rowsSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const { heroes, units, structures, powers, ...rest } = input;
      await ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: factionRevision.id })
          .from(factionRevision)
          .where(
            and(
              eq(factionRevision.factionId, rest.factionId),
              eq(factionRevision.gameVersionId, rest.gameVersionId),
            ),
          );
        let revisionId = existing?.id;
        if (revisionId) {
          await tx
            .update(factionRevision)
            .set({ ...rest, updatedAt: new Date() })
            .where(eq(factionRevision.id, revisionId));
          for (const table of [
            factionHero,
            factionUnit,
            factionStructure,
            factionPower,
          ]) {
            await tx.delete(table).where(eq(table.revisionId, revisionId));
          }
        } else {
          const [row] = await tx
            .insert(factionRevision)
            .values(rest)
            .returning({ id: factionRevision.id });
          revisionId = row?.id;
        }
        if (!revisionId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rid = revisionId;
        if (heroes.length)
          await tx
            .insert(factionHero)
            .values(
              heroes.map((h, i) => ({ ...h, revisionId: rid, sortOrder: i })),
            );
        if (units.length)
          await tx
            .insert(factionUnit)
            .values(
              units.map((u, i) => ({ ...u, revisionId: rid, sortOrder: i })),
            );
        if (structures.length)
          await tx.insert(factionStructure).values(
            structures.map((s, i) => ({
              ...s,
              revisionId: rid,
              sortOrder: i,
            })),
          );
        if (powers.length)
          await tx
            .insert(factionPower)
            .values(
              powers.map((p, i) => ({ ...p, revisionId: rid, sortOrder: i })),
            );
      });
      revalidateWiki();
      return { ok: true };
    }),

  deleteRevision: adminProcedure
    .input(z.object({ factionId: id, gameVersionId: id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(factionRevision)
        .where(
          and(
            eq(factionRevision.factionId, input.factionId),
            eq(factionRevision.gameVersionId, input.gameVersionId),
          ),
        );
      revalidateWiki();
      return { ok: true };
    }),
});

export { wikiRouter };
