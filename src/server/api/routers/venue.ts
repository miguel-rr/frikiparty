import { TRPCError } from '@trpc/server';
import { eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { slugify } from '@/lib/slug';
import { listEditions } from '@/server/api/routers/edition';
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/api/trpc';
import { venue } from '@/server/db/schema';

/** First free slug for `name`, suffixing on collision (ignoring `keepId`). */
const uniqueSlug = async (
  db: Parameters<typeof listEditions>[0],
  name: string,
  keepId: string,
) => {
  const taken = new Set(
    (
      await db
        .select({ slug: venue.slug })
        .from(venue)
        .where(ne(venue.id, keepId))
    ).map((row) => row.slug),
  );
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const venueRouter = createTRPCRouter({
  /**
   * Every venue, most-used first, with the editions held there. Labels
   * that aren't a place are included (the index is where they get fixed)
   * but flagged so the UI doesn't link them.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const [venues, editions] = await Promise.all([
      ctx.db.select().from(venue),
      listEditions(ctx.db),
    ]);
    return venues
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        isPlace: row.isPlace,
        photoUrl: row.photoUrl,
        mapsUrl: row.mapsUrl,
        description: row.description,
        editions: editions
          .filter((edition) => edition.venueSlug === row.slug)
          .map((edition) => ({
            id: edition.id,
            label: edition.label,
            slug: edition.slug,
          })),
      }))
      .sort(
        (a, b) =>
          b.editions.length - a.editions.length ||
          a.name.localeCompare(b.name, 'es'),
      );
  }),

  /**
   * One venue with every edition held there (newest first). Labels that
   * aren't a real place ("Madrid", a farewell party) have no page: 404.
   */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(venue)
        .where(eq(venue.slug, input.slug));
      if (!row?.isPlace) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      // sceneIndex = position in the full newest-first timeline, so each
      // card wears the same painted scene it has on /editions.
      const editions = (await listEditions(ctx.db))
        .map((edition, sceneIndex) => ({ ...edition, sceneIndex }))
        .filter((edition) => edition.venueSlug === row.slug);
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        mapsUrl: row.mapsUrl,
        mapsEmbedQuery: row.mapsEmbedQuery,
        photoUrl: row.photoUrl,
        editions,
        canEdit: ctx.session?.user.role === 'admin',
      };
    }),

  /**
   * Admin-only venue edit. Renaming regenerates the slug (the page URL),
   * and isPlace=false takes the page down — the client redirects
   * accordingly using the returned values. The web is the source of truth
   * from here on: the import script only fills blanks (see its venue pass).
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(4000).nullable(),
        mapsUrl: z.string().trim().url().nullable(),
        mapsEmbedQuery: z.string().trim().max(300).nullable(),
        photoUrl: z.string().trim().url().nullable(),
        isPlace: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(venue)
        .where(eq(venue.id, input.id));
      if (!current) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const slug =
        input.name === current.name
          ? current.slug
          : await uniqueSlug(ctx.db, input.name, current.id);
      const { id, ...changes } = input;
      const [updated] = await ctx.db
        .update(venue)
        .set({ ...changes, slug })
        .where(eq(venue.id, id))
        .returning({ slug: venue.slug, isPlace: venue.isPlace });
      if (!updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      }
      return updated;
    }),
});

export { venueRouter };
