import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/server/db';
import { player, user } from '@/server/db/schema';

/**
 * Rehearsal accounts for the live module (dev only, never production):
 * every player without an account gets one with a made-up address that
 * nobody can sign into — its only way in is "Entrar como" from
 * /admin/players. Idempotent. `pnpm run db:seed:live-test`.
 */
const TEST_ACCOUNT_DOMAIN = 'frikiparty.test';

const main = async () => {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Las cuentas de pruebas no existen en producción.');
  }
  const unlinked = await db
    .select({ id: player.id, name: player.name, slug: player.slug })
    .from(player)
    .where(isNull(player.userId));
  for (const row of unlinked) {
    const userId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: row.name,
        email: `${row.slug}@${TEST_ACCOUNT_DOMAIN}`,
        emailVerified: true,
        role: 'user',
      });
      await tx
        .update(player)
        .set({ userId, linkCode: null })
        .where(and(eq(player.id, row.id), isNull(player.userId)));
    });
    console.log(`Cuenta de pruebas: ${row.name}`);
  }
  console.log(
    unlinked.length === 0
      ? 'Todos los jugadores tienen ya cuenta.'
      : `${unlinked.length} cuentas de pruebas creadas.`,
  );
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
