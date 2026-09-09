import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';

import { createTRPCRouter, translatorProcedure } from '@/server/api/trpc';
import {
  customString,
  game,
  gameVersion,
  strEntry,
  strFile,
  user,
} from '@/server/db/schema';
import { deleteObjects } from '@/server/storage/r2';
import { exportSummary } from '@/server/translations/export';
import { latestFile, listFiles, NO_FILE } from '@/server/translations/files';

const id = z.string().uuid();
const PAGE = 50;

/** `%` and `_` are wildcards in ILIKE; the user means them literally. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

type SearchRow = {
  key: string;
  seq: number;
  en_value: string | null;
  es_value: string | null;
  comment: string | null;
  custom_value: string | null;
  status: 'ok' | 'review' | null;
  note: string | null;
  total: number;
};

type CompareRow = {
  key: string;
  before: string | null;
  after: string | null;
  total: number;
};

const customCounts = async (db: Parameters<typeof latestFile>[0]) => {
  const [row] = (await db.execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'review')::int AS review
    FROM frikiparty_custom_string
  `)) as unknown as { total: number; review: number }[];
  return row ?? { total: 0, review: 0 };
};

const translationsRouter = createTRPCRouter({
  /** Files, the versions they can be filed under, and the custom strings' tally. */
  overview: translatorProcedure.query(async ({ ctx }) => {
    const [files, versions, games, customs] = await Promise.all([
      listFiles(ctx.db),
      ctx.db
        .select({
          id: gameVersion.id,
          version: gameVersion.version,
          releaseOrder: gameVersion.releaseOrder,
          gameId: gameVersion.gameId,
          gameName: game.name,
        })
        .from(gameVersion)
        .innerJoin(game, eq(game.id, gameVersion.gameId))
        .where(eq(game.isOfficial, true))
        .orderBy(asc(game.name), desc(gameVersion.releaseOrder)),
      ctx.db
        .select({ id: game.id, name: game.name })
        .from(game)
        .where(eq(game.isOfficial, true))
        .orderBy(asc(game.name)),
      customCounts(ctx.db),
    ]);
    const latest = {
      en: files.find((f) => f.language === 'en') ?? null,
      es: files.find((f) => f.language === 'es') ?? null,
    };
    return { files, versions, games, customs, latest };
  }),

  /** A new game version straight from the upload form (no wiki data yet). */
  createVersion: translatorProcedure
    .input(z.object({ gameId: id, version: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [last] = await ctx.db
        .select({ releaseOrder: gameVersion.releaseOrder })
        .from(gameVersion)
        .where(eq(gameVersion.gameId, input.gameId))
        .orderBy(desc(gameVersion.releaseOrder))
        .limit(1);
      const [created] = await ctx.db
        .insert(gameVersion)
        .values({
          gameId: input.gameId,
          version: input.version,
          releaseOrder: (last?.releaseOrder ?? 0) + 1,
        })
        .returning({ id: gameVersion.id });
      if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return created;
    }),

  /** Drop an uploaded file and its blocks; custom strings keep their text. */
  deleteFile: translatorProcedure
    .input(z.object({ fileId: id }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(strFile)
        .where(eq(strFile.id, input.fileId))
        .returning({ r2Key: strFile.r2Key });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await deleteObjects([row.r2Key]).catch(() => undefined);
      return { ok: true };
    }),

  /** Categories (the part before the colon) of the newest English file. */
  categories: translatorProcedure.query(async ({ ctx }) => {
    const spine =
      (await latestFile(ctx.db, 'en')) ?? (await latestFile(ctx.db, 'es'));
    if (!spine) return [];
    const rows = (await ctx.db.execute(sql`
      SELECT split_part(key, ':', 1) AS name, count(DISTINCT key)::int AS count
      FROM frikiparty_str_entry
      WHERE file_id = ${spine.id}
      GROUP BY 1
      ORDER BY 2 DESC, 1
    `)) as unknown as { name: string; count: number }[];
    return rows;
  }),

  /**
   * The working table: every key of the newest English and Spanish files
   * side by side with our string, filtered and paged in the database.
   */
  search: translatorProcedure
    .input(
      z.object({
        q: z.string().trim().default(''),
        category: z.string().trim().default(''),
        mode: z
          .enum(['all', 'custom', 'review', 'untranslated', 'missing'])
          .default('all'),
        page: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [en, es] = await Promise.all([
        latestFile(ctx.db, 'en'),
        latestFile(ctx.db, 'es'),
      ]);
      if (!en && !es)
        return { rows: [], total: 0, pageSize: PAGE, en: null, es: null };
      const conditions: SQL[] = [];
      if (input.q !== '') {
        const pattern = likePattern(input.q);
        conditions.push(
          sql`(r.key ILIKE ${pattern} OR r.en_value ILIKE ${pattern} OR r.es_value ILIKE ${pattern} OR c.value ILIKE ${pattern})`,
        );
      }
      if (input.category !== '')
        conditions.push(sql`r.key LIKE ${`${input.category}:%`}`);
      if (input.mode === 'custom') conditions.push(sql`c.key IS NOT NULL`);
      if (input.mode === 'review') conditions.push(sql`c.status = 'review'`);
      if (input.mode === 'untranslated')
        conditions.push(sql`r.es_value = r.en_value`);
      if (input.mode === 'missing')
        conditions.push(sql`r.es_value IS NULL AND r.en_value IS NOT NULL`);
      const where =
        conditions.length > 0
          ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
          : sql``;
      const rows = (await ctx.db.execute(sql`
        WITH en AS (
          SELECT DISTINCT ON (key) key, value, seq, comment
          FROM frikiparty_str_entry WHERE file_id = ${en?.id ?? NO_FILE}
          ORDER BY key, seq DESC
        ), es AS (
          SELECT DISTINCT ON (key) key, value, seq
          FROM frikiparty_str_entry WHERE file_id = ${es?.id ?? NO_FILE}
          ORDER BY key, seq DESC
        ), r AS (
          SELECT coalesce(en.key, es.key) AS key,
                 coalesce(en.seq, es.seq) AS seq,
                 en.value AS en_value, es.value AS es_value, en.comment
          FROM en FULL OUTER JOIN es ON es.key = en.key
        )
        SELECT r.key, r.seq, r.en_value, r.es_value, r.comment,
               c.value AS custom_value, c.status, c.note,
               count(*) OVER ()::int AS total
        FROM r LEFT JOIN frikiparty_custom_string c ON c.key = r.key
        ${where}
        ORDER BY r.seq
        LIMIT ${PAGE} OFFSET ${input.page * PAGE}
      `)) as unknown as SearchRow[];
      return {
        rows: rows.map((row) => ({
          key: row.key,
          en: row.en_value,
          es: row.es_value,
          comment: row.comment,
          custom: row.custom_value,
          status: row.status,
          note: row.note,
        })),
        total: rows[0]?.total ?? 0,
        pageSize: PAGE,
        en: en ? { id: en.id, version: en.version } : null,
        es: es ? { id: es.id, version: es.version } : null,
      };
    }),

  /** One key across every uploaded file, plus our string for it. */
  entry: translatorProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = (await ctx.db.execute(sql`
        SELECT DISTINCT ON (e.file_id) e.file_id, f.language, v.version,
               v.release_order, e.value, e.comment
        FROM frikiparty_str_entry e
        JOIN frikiparty_str_file f ON f.id = e.file_id
        JOIN frikiparty_game_version v ON v.id = f.game_version_id
        WHERE e.key = ${input.key}
        ORDER BY e.file_id, e.seq DESC
      `)) as unknown as {
        file_id: string;
        language: 'en' | 'es';
        version: string;
        release_order: number;
        value: string;
        comment: string | null;
      }[];
      const [custom] = await ctx.db
        .select({
          value: customString.value,
          note: customString.note,
          status: customString.status,
          baseEnValue: customString.baseEnValue,
          baseEsValue: customString.baseEsValue,
          updatedAt: customString.updatedAt,
          updatedBy: user.name,
        })
        .from(customString)
        .leftJoin(user, eq(user.id, customString.updatedByUserId))
        .where(eq(customString.key, input.key));
      return {
        key: input.key,
        versions: rows
          .map((r) => ({
            fileId: r.file_id,
            language: r.language,
            version: r.version,
            releaseOrder: r.release_order,
            value: r.value,
            comment: r.comment,
          }))
          .sort(
            (a, b) =>
              b.releaseOrder - a.releaseOrder ||
              a.language.localeCompare(b.language),
          ),
        custom: custom ?? null,
      };
    }),

  /** Write our string for a key; the current originals become its baseline. */
  saveCustom: translatorProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.value.includes('\n') || input.value.includes('"')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'El texto va en una sola línea y sin comillas dobles: usa \\n para saltar de línea.',
        });
      }
      const [en, es] = await Promise.all([
        latestFile(ctx.db, 'en'),
        latestFile(ctx.db, 'es'),
      ]);
      const current = async (fileId: string | undefined) => {
        if (!fileId) return null;
        const [row] = await ctx.db
          .select({ value: strEntry.value })
          .from(strEntry)
          .where(and(eq(strEntry.fileId, fileId), eq(strEntry.key, input.key)))
          .orderBy(desc(strEntry.seq))
          .limit(1);
        return row?.value ?? null;
      };
      const [baseEnValue, baseEsValue] = await Promise.all([
        current(en?.id),
        current(es?.id),
      ]);
      const values = {
        value: input.value,
        note: input.note || null,
        baseEnFileId: en?.id ?? null,
        baseEnValue,
        baseEsValue,
        status: 'ok' as const,
        updatedByUserId: ctx.session.user.id,
        updatedAt: new Date(),
      };
      await ctx.db
        .insert(customString)
        .values({
          key: input.key,
          createdByUserId: ctx.session.user.id,
          ...values,
        })
        .onConflictDoUpdate({ target: customString.key, set: values });
      return { ok: true };
    }),

  /** The original changed but our text still fits: move the baseline forward. */
  confirmCustom: translatorProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const en = await latestFile(ctx.db, 'en');
      const [row] = en
        ? await ctx.db
            .select({ value: strEntry.value })
            .from(strEntry)
            .where(and(eq(strEntry.fileId, en.id), eq(strEntry.key, input.key)))
            .orderBy(desc(strEntry.seq))
            .limit(1)
        : [];
      await ctx.db
        .update(customString)
        .set({
          status: 'ok',
          baseEnFileId: en?.id ?? null,
          baseEnValue: row?.value ?? null,
          updatedByUserId: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(customString.key, input.key));
      return { ok: true };
    }),

  deleteCustom: translatorProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(customString).where(eq(customString.key, input.key));
      return { ok: true };
    }),

  /** How two files differ, by kind, paged; `q` narrows by key or text. */
  compare: translatorProcedure
    .input(
      z.object({
        fromFileId: id,
        toFileId: id,
        kind: z.enum(['changed', 'added', 'removed', 'same']),
        q: z.string().trim().default(''),
        page: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const kindWhere = {
        changed: sql`f.key IS NOT NULL AND t.key IS NOT NULL AND f.value <> t.value`,
        added: sql`f.key IS NULL`,
        removed: sql`t.key IS NULL`,
        same: sql`f.value = t.value`,
      }[input.kind];
      const pattern = likePattern(input.q);
      const qWhere =
        input.q === ''
          ? sql``
          : sql`AND (coalesce(f.key, t.key) ILIKE ${pattern} OR f.value ILIKE ${pattern} OR t.value ILIKE ${pattern})`;
      const rows = (await ctx.db.execute(sql`
        WITH f AS (
          SELECT DISTINCT ON (key) key, value, seq
          FROM frikiparty_str_entry WHERE file_id = ${input.fromFileId}
          ORDER BY key, seq DESC
        ), t AS (
          SELECT DISTINCT ON (key) key, value, seq
          FROM frikiparty_str_entry WHERE file_id = ${input.toFileId}
          ORDER BY key, seq DESC
        )
        SELECT coalesce(t.key, f.key) AS key, f.value AS before, t.value AS after,
               count(*) OVER ()::int AS total
        FROM f FULL OUTER JOIN t ON t.key = f.key
        WHERE ${kindWhere} ${qWhere}
        ORDER BY coalesce(t.seq, f.seq)
        LIMIT ${PAGE} OFFSET ${input.page * PAGE}
      `)) as unknown as CompareRow[];
      return {
        rows: rows.map((r) => ({
          key: r.key,
          before: r.before,
          after: r.after,
        })),
        total: rows[0]?.total ?? 0,
        pageSize: PAGE,
      };
    }),

  /** Counts of each kind of difference between two files. */
  compareSummary: translatorProcedure
    .input(z.object({ fromFileId: id, toFileId: id }))
    .query(async ({ ctx, input }) => {
      const [row] = (await ctx.db.execute(sql`
        WITH f AS (
          SELECT DISTINCT ON (key) key, value
          FROM frikiparty_str_entry WHERE file_id = ${input.fromFileId}
          ORDER BY key, seq DESC
        ), t AS (
          SELECT DISTINCT ON (key) key, value
          FROM frikiparty_str_entry WHERE file_id = ${input.toFileId}
          ORDER BY key, seq DESC
        )
        SELECT count(*) FILTER (WHERE f.key IS NULL)::int AS added,
               count(*) FILTER (WHERE t.key IS NULL)::int AS removed,
               count(*) FILTER (WHERE f.key IS NOT NULL AND t.key IS NOT NULL AND f.value <> t.value)::int AS changed,
               count(*) FILTER (WHERE f.value = t.value)::int AS same
        FROM f FULL OUTER JOIN t ON t.key = f.key
      `)) as unknown as {
        added: number;
        removed: number;
        changed: number;
        same: number;
      }[];
      return row ?? { added: 0, removed: 0, changed: 0, same: 0 };
    }),

  exportSummary: translatorProcedure
    .input(z.object({ esFileId: id, enFileId: id.nullable() }))
    .query(({ ctx, input }) => exportSummary(ctx.db, input)),
});

export { translationsRouter };
