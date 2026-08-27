import { eq } from 'drizzle-orm';

import { slugify } from '@/lib/slug';
import { db } from '@/server/db';
import { player } from '@/server/db/schema';

/** One-off: fills in `player.slug` for rows that predate the column, deduping collisions with a numeric suffix. */
const main = async () => {
  const players = await db
    .select({ id: player.id, name: player.name, slug: player.slug })
    .from(player);

  const usedSlugs = new Set(
    players.map((p) => p.slug).filter((slug): slug is string => slug !== null),
  );

  for (const p of players) {
    if (p.slug) continue;
    const base = slugify(p.name);
    let candidate = base;
    let suffix = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(candidate);
    await db.update(player).set({ slug: candidate }).where(eq(player.id, p.id));
    console.log(`${p.name} -> ${candidate}`);
  }

  console.log('\nDone.');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
