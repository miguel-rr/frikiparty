import { and, eq, isNull } from 'drizzle-orm';

import { FACTIONS, type FactionId } from '@/lib/tournament/factions';
import { db } from '@/server/db';
import {
  edition,
  faction,
  game,
  gameVersion,
  tournament,
} from '@/server/db/schema';

/**
 * The game catalogue the live module draws from: Age of the Ring with the
 * versions we have actually played, and its eleven factions keyed by the
 * presentation catalogue's ids (emblems live in src/lib/tournament/
 * factions.ts). Idempotent — safe to re-run on dev and prod
 * (`pnpm run db:seed:catalog` / `db:seed:catalog:prod`).
 *
 * Also links every official 2025 tournament still without a version to
 * 9.2.0, the version played that year.
 */

const AOTR = 'Age of the Ring';
const BFME2 = 'Battle for Middle-earth II';

/** Chronological; releaseOrder = index + 1. */
const AOTR_VERSIONS = ['9.2.0', '9.3.0'] as const;

/** The 2026 (and 2025) roster, unchanged between 9.2.0 and 9.3.0. */
const AOTR_FACTIONS: FactionId[] = [
  'gondor',
  'rohan',
  'rivendell',
  'lothlorien',
  'woodland',
  'erebor',
  'mordor',
  'isengard',
  'mistyMountains',
  'dolGuldur',
  'haradwaith',
];

const upsertGame = async (name: string) => {
  const [existing] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.name, name));
  if (existing) {
    await db
      .update(game)
      .set({ isOfficial: true })
      .where(eq(game.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(game)
    .values({ name, isOfficial: true })
    .returning({ id: game.id });
  if (!row) throw new Error(`No se pudo crear el juego ${name}`);
  console.log(`Juego creado: ${name}`);
  return row.id;
};

const upsertVersion = async (
  gameId: string,
  version: string,
  releaseOrder: number,
) => {
  const [existing] = await db
    .select({ id: gameVersion.id })
    .from(gameVersion)
    .where(
      and(eq(gameVersion.gameId, gameId), eq(gameVersion.version, version)),
    );
  if (existing) {
    await db
      .update(gameVersion)
      .set({ releaseOrder })
      .where(eq(gameVersion.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(gameVersion)
    .values({ gameId, version, releaseOrder })
    .returning({ id: gameVersion.id });
  if (!row) throw new Error(`No se pudo crear la versión ${version}`);
  console.log(`Versión creada: ${version}`);
  return row.id;
};

const upsertFaction = async (
  code: FactionId,
  introducedInVersionId: string,
  sortOrder: number,
) => {
  const { name } = FACTIONS[code];
  const [byCode] = await db
    .select({ id: faction.id })
    .from(faction)
    .where(eq(faction.code, code));
  if (byCode) {
    await db
      .update(faction)
      .set({ name, sortOrder })
      .where(eq(faction.id, byCode.id));
    return;
  }
  // A row seeded before codes existed (same name, no code) adopts it.
  const [byName] = await db
    .select({ id: faction.id })
    .from(faction)
    .where(and(eq(faction.name, name), isNull(faction.code)));
  if (byName) {
    await db
      .update(faction)
      .set({ code, sortOrder, introducedInVersionId })
      .where(eq(faction.id, byName.id));
    console.log(`Facción enlazada por nombre: ${name} → ${code}`);
    return;
  }
  await db
    .insert(faction)
    .values({ code, name, sortOrder, introducedInVersionId });
  console.log(`Facción creada: ${name}`);
};

const main = async () => {
  const aotrId = await upsertGame(AOTR);
  await upsertGame(BFME2);

  const versionIds: Record<string, string> = {};
  for (const [index, version] of AOTR_VERSIONS.entries()) {
    versionIds[version] = await upsertVersion(aotrId, version, index + 1);
  }
  const v920 = versionIds['9.2.0'];
  if (!v920) throw new Error('Falta la versión 9.2.0');

  for (const [index, code] of AOTR_FACTIONS.entries()) {
    await upsertFaction(code, v920, index);
  }

  // 2025 was played on 9.2.0.
  const linked = await db
    .update(tournament)
    .set({ gameVersionId: v920, gameId: aotrId })
    .where(
      and(
        eq(tournament.isOfficial, true),
        isNull(tournament.gameVersionId),
        eq(
          tournament.editionId,
          db
            .select({ id: edition.id })
            .from(edition)
            .where(and(eq(edition.year, 2025), eq(edition.order, 1)))
            .limit(1),
        ),
      ),
    )
    .returning({ id: tournament.id });
  if (linked.length > 0) {
    console.log(`Torneos de 2025 enlazados a 9.2.0: ${linked.length}`);
  }

  const factions = await db
    .select({ name: faction.name, code: faction.code })
    .from(faction)
    .orderBy(faction.sortOrder);
  console.log(
    `Catálogo listo: ${AOTR_VERSIONS.join(', ')} · ${factions.length} facciones: ${factions.map((row) => row.name).join(', ')}`,
  );
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
