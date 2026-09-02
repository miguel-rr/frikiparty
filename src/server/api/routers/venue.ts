import { TRPCError } from '@trpc/server';
import { eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { slugify } from '@/lib/slug';
import { listEditions } from '@/server/api/routers/edition';
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  type TRPCContext,
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

/**
 * One venue with every edition held there (newest first). Pure query (no
 * session) so the page can be built statically. Labels that aren't a real
 * place ("Madrid", a farewell party) have no page: null, like unknown slugs.
 */
const getVenue = async (db: TRPCContext['db'], slug: string) => {
  const [row] = await db.select().from(venue).where(eq(venue.slug, slug));
  if (!row?.isPlace) {
    return null;
  }
  // sceneIndex = position in the full newest-first timeline, so each card
  // wears the same painted scene it has on /editions.
  const editions = (await listEditions(db))
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
  };
};

/**
 * Every venue, most-used first, with the editions held there. Labels that
 * aren't a place are included (the index is where they get fixed) but
 * flagged so the UI doesn't link them. Pure query.
 */
const listVenues = async (db: TRPCContext['db']) => {
  const [venues, editions] = await Promise.all([
    db.select().from(venue),
    listEditions(db),
  ]);
  return (
    venues
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
      // Real venues first, then by usage; the non-places close the list.
      .sort(
        (a, b) =>
          Number(b.isPlace) - Number(a.isPlace) ||
          b.editions.length - a.editions.length ||
          a.name.localeCompare(b.name, 'es'),
      )
  );
};

const venueRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => listVenues(ctx.db)),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const found = await getVenue(ctx.db, input.slug);
      if (!found) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return found;
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
      // The venue pages are built statically: rebuild everything the name,
      // photo or flag can appear on. Few records — carpet revalidation is fine.
      revalidatePath(`/venues/${current.slug}`);
      if (updated.slug !== current.slug) {
        revalidatePath(`/venues/${updated.slug}`);
      }
      revalidatePath('/venues');
      revalidatePath('/editions');
      revalidatePath('/editions/[slug]', 'page');
      revalidatePath('/');
      revalidatePath('/council');
      revalidatePath('/champions');
      return updated;
    }),
});

export { getVenue, listVenues, venueRouter };
