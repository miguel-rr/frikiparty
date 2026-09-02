import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { player } from '@/server/db/schema';

/**
 * Curates a player's public identity from the terminal:
 *
 *   pnpm exec tsx --env-file=.env scripts/set-player-card.ts <slug> \
 *     [--bio "..."] [--ability "Nombre"] [--text "Definición."]
 *
 * Only the flags you pass are written; pass an empty string to clear a
 * field. Ability and text always travel together on the card, so set both.
 */
const [slug, ...rest] = process.argv.slice(2);
if (!slug) {
  console.error(
    'Usage: set-player-card.ts <slug> [--bio ...] [--ability ...] [--text ...] [--portrait ...]',
  );
  process.exit(1);
}

const flags: Record<string, string> = {};
for (let i = 0; i < rest.length; i += 2) {
  const key = rest[i];
  const value = rest[i + 1];
  if (!key?.startsWith('--') || value === undefined) {
    console.error(`Malformed flag pair at "${key}"`);
    process.exit(1);
  }
  flags[key.slice(2)] = value;
}

const patch: Partial<typeof player.$inferInsert> = {};
if ('bio' in flags) {
  patch.bio = flags.bio === '' ? null : flags.bio;
}
if ('ability' in flags) {
  patch.cardAbility = flags.ability === '' ? null : flags.ability;
}
if ('text' in flags) {
  patch.cardAbilityText = flags.text === '' ? null : flags.text;
}
if ('portrait' in flags) {
  patch.cardPortrait = flags.portrait === '' ? null : flags.portrait;
}
if (Object.keys(patch).length === 0) {
  console.error('Nothing to write: pass --bio, --ability or --text.');
  process.exit(1);
}

const run = async () => {
  const [updated] = await db
    .update(player)
    .set(patch)
    .where(eq(player.slug, slug))
    .returning({
      name: player.name,
      slug: player.slug,
      bio: player.bio,
      cardPortrait: player.cardPortrait,
      cardAbility: player.cardAbility,
      cardAbilityText: player.cardAbilityText,
    });
  if (!updated) {
    console.error(`No player with slug "${slug}"`);
    process.exit(1);
  }
  // Mirror the curated identity into the repo so it lives in git too,
  // not only in the database.
  const jsonPath = join(process.cwd(), 'scripts/data/player-cards.json');
  let records: Record<string, unknown> = {};
  try {
    records = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch {
    // First run: start a fresh file.
  }
  records[updated.slug] = {
    name: updated.name,
    bio: updated.bio,
    portrait: updated.cardPortrait,
    ability: updated.cardAbility,
    abilityText: updated.cardAbilityText,
  };
  writeFileSync(jsonPath, `${JSON.stringify(records, null, 2)}\n`);
  console.log(JSON.stringify(updated, null, 2));
  console.log(`mirrored to ${jsonPath}`);
  process.exit(0);
};

void run();
