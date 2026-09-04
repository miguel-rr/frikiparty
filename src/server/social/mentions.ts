import { inArray, or, sql } from 'drizzle-orm';

import {
  isPlayerId,
  mentionedRefs,
  mentionToken,
  rewriteMentions,
} from '@/lib/social/mentions';
import type { TRPCContext } from '@/server/api/trpc';
import { player } from '@/server/db/schema';

/**
 * Server side of mentions, shared by every text that can carry them
 * (comments, player bios): what gets stored pins each mention to the
 * player's id; what gets served carries the player's current name and
 * page slug.
 */

type Mentioned = { id: string; name: string; slug: string };

/**
 * The players behind a set of mention refs (ids, or slugs from older
 * bodies and from bodies being edited), keyed by whichever ref named them.
 */
const loadMentioned = async (db: TRPCContext['db'], refs: string[]) => {
  const found = new Map<string, Mentioned>();
  if (refs.length === 0) {
    return found;
  }
  const ids = refs.filter(isPlayerId);
  const slugs = refs.filter((ref) => !isPlayerId(ref));
  const conditions = [
    ...(ids.length > 0 ? [inArray(player.id, ids)] : []),
    ...(slugs.length > 0
      ? [
          inArray(player.slug, slugs),
          // Slugs the player had before a rename still name them.
          sql`${player.previousSlugs} && ${sql.raw(`ARRAY[${slugs.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')}]::text[]`)}`,
        ]
      : []),
  ];
  const rows = await db
    .select({
      id: player.id,
      name: player.name,
      slug: player.slug,
      previousSlugs: player.previousSlugs,
    })
    .from(player)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions));
  for (const row of rows) {
    const known = { id: row.id, name: row.name, slug: row.slug };
    found.set(row.id, known);
    found.set(row.slug, known);
    for (const old of row.previousSlugs) {
      found.set(old, known);
    }
  }
  return found;
};

/**
 * What gets stored: every mention pinned to the player's id, so renames
 * can't strand it; mentions of nobody become plain `@Nombre` text.
 */
const sanitizeBody = async (db: TRPCContext['db'], body: string) => {
  const known = await loadMentioned(db, mentionedRefs(body));
  return rewriteMentions(body, (ref) => {
    const found = known.get(ref);
    return found ? mentionToken(found.name, found.id) : null;
  });
};

/**
 * What gets shown: every mention carrying the player's current name and
 * page slug, whatever the body was saved with.
 */
const resolveMentions = async (db: TRPCContext['db'], bodies: string[]) => {
  const known = await loadMentioned(
    db,
    Array.from(new Set(bodies.flatMap(mentionedRefs))),
  );
  return bodies.map((body) =>
    rewriteMentions(body, (ref) => {
      const found = known.get(ref);
      return found ? mentionToken(found.name, found.slug) : null;
    }),
  );
};

export { resolveMentions, sanitizeBody };
