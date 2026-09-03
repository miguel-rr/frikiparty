import { readFile } from 'node:fs/promises';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Applies the pending migrations in `drizzle/` to the database named by
 * DATABASE_URL — run through `pnpm run db:migrate:prod`, which loads
 * `.env.prod` (gitignored, holds only the production connection string).
 * Same journal table drizzle-kit uses, so it applies exactly what
 * `pnpm run db:migrate` would, against the other database.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida. ¿Existe .env.prod?');
  process.exit(1);
}
const host = new URL(url).host;
console.log(`Migrando ${host}`);

const journal = JSON.parse(
  await readFile('drizzle/meta/_journal.json', 'utf8'),
) as { entries: { tag: string; when: number }[] };

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const applied = async () =>
  (
    await sql`
      SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
    `.catch(() => [])
  ).map((row) => Number(row.created_at));

const before = await applied();
const pending = journal.entries.filter((entry) => !before.includes(entry.when));
if (pending.length === 0) {
  console.log('Nada pendiente: producción ya está al día.');
} else {
  console.log(`Pendientes: ${pending.map((entry) => entry.tag).join(', ')}`);
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log(`Aplicadas. Producción va por ${pending.at(-1)?.tag}.`);
}
await sql.end();
