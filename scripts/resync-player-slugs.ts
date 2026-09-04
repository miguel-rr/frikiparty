import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { firstFreeSlug, rememberSlug, slugify } from '@/lib/slug';
import {
  isPlayerId,
  mentionToken,
  rewriteMentions,
} from '@/lib/social/mentions';
import { comment, player } from '@/server/db/schema';

/**
 * Brings every player's slug back in line with their name — for rows
 * renamed before the slug learnt to follow the name — after pinning the
 * mentions in comments to player ids, so no rename can strand them. Dry
 * run by default: prints what would change; pass --apply to write it.
 *
 *   pnpm run db:resync:player-slugs            (dev, .env)
 *   pnpm run db:resync:player-slugs:prod       (production, .env.prod)
 *   … --apply                                  to write
 *
 * Connects straight from DATABASE_URL (like migrate-prod) so .env.prod
 * needs nothing else. Player pages are built statically: after applying
 * in production, redeploy so the moved pages get rebuilt.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida. ¿Existe el .env indicado?');
  process.exit(1);
}
const apply = process.argv.includes('--apply');
console.log(
  `${apply ? 'Actualizando' : 'Revisando (sin escribir)'} ${new URL(url).host}`,
);

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const players = await db
  .select({
    id: player.id,
    name: player.name,
    slug: player.slug,
    previousSlugs: player.previousSlugs,
  })
  .from(player)
  .orderBy(player.name);

// Mentions first: bodies written before mentions carried ids still name
// players by slug. Pin them to ids while those slugs are still current.
const bySlug = new Map(players.map((row) => [row.slug, row]));
const mentioning = await db
  .select({ id: comment.id, body: comment.body })
  .from(comment)
  .where(like(comment.body, '%@[%'));
const pinned = mentioning.flatMap((row) => {
  const body = rewriteMentions(row.body, (ref, name) => {
    if (isPlayerId(ref)) {
      return mentionToken(name, ref);
    }
    const found = bySlug.get(ref);
    return found ? mentionToken(name, found.id) : mentionToken(name, ref);
  });
  return body === row.body ? [] : [{ id: row.id, body }];
});
if (pinned.length > 0) {
  console.log(`Menciones por slug en ${pinned.length} comentario(s):`);
  for (const row of pinned) {
    console.log(`  ${row.id}: ${row.body.slice(0, 80)}`);
  }
  if (apply) {
    for (const row of pinned) {
      await db
        .update(comment)
        .set({ body: row.body })
        .where(eq(comment.id, row.id));
    }
    console.log('  → fijadas al id del jugador.');
  }
} else {
  console.log('Menciones: todas fijadas ya al id del jugador.');
}

/** Slugs as they will stand once every change is applied. */
const slugs = new Map(players.map((row) => [row.id, row.slug]));
const changes: { name: string; from: string; to: string }[] = [];

for (const row of players) {
  const base = slugify(row.name);
  // Every slug another player has or ever had: those addresses redirect.
  const others = players
    .filter((other) => other.id !== row.id)
    .flatMap((other) => [
      slugs.get(other.id) ?? other.slug,
      ...other.previousSlugs,
    ]);
  // Already the plain slug, or a suffixed one because another player owns
  // the plain form: nothing to do. Otherwise take the first free slug.
  const keeps =
    row.slug === base ||
    (others.includes(base) && new RegExp(`^${base}-\\d+$`).test(row.slug));
  if (keeps) {
    continue;
  }
  const next = firstFreeSlug(row.name, others);
  if (next !== row.slug) {
    slugs.set(row.id, next);
    changes.push({ name: row.name, from: row.slug, to: next });
  }
}

if (changes.length === 0) {
  console.log('Todos los slugs coinciden con su nombre. Nada que hacer.');
} else {
  console.table(changes);
  if (apply) {
    for (const row of players) {
      const next = slugs.get(row.id);
      if (next && next !== row.slug) {
        // The slug left behind keeps redirecting to the page.
        await db
          .update(player)
          .set({
            slug: next,
            previousSlugs: rememberSlug(row.previousSlugs, row.slug, next),
          })
          .where(eq(player.id, row.id));
      }
    }
    console.log(
      `${changes.length} slug(s) actualizados; los antiguos redirigen. Redespliega para reconstruir las páginas de jugador.`,
    );
  } else {
    console.log(
      `${changes.length} cambio(s) pendientes. Vuelve a lanzar con --apply para escribirlos.`,
    );
  }
}

await sql.end();
