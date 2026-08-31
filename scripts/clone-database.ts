import postgres from 'postgres';

/**
 * Clones every public-schema table's data from one database to another.
 * Built for promoting the Neon dev branch's data to the production branch
 * when the dashboard's cross-branch restore isn't available.
 *
 * Usage (dest schema must already exist — run db:migrate against it first):
 *   DEST_DATABASE_URL="postgres://..." pnpm exec tsx --env-file=.env scripts/clone-database.ts
 *
 * Source is DATABASE_URL (from .env) unless SOURCE_DATABASE_URL overrides it.
 * DANGER: truncates every table in the destination before copying.
 */

// Scripts read process.env directly: @/env would demand the full app env schema.
const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const destUrl = process.env.DEST_DATABASE_URL;

const endpoint = (url: string) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

const CHUNK_SIZE = 200;

const main = async () => {
  if (!sourceUrl || !destUrl) {
    throw new Error(
      'Both DATABASE_URL (source) and DEST_DATABASE_URL are required',
    );
  }
  if (endpoint(sourceUrl) === endpoint(destUrl)) {
    throw new Error(
      'Source and destination are the same database; refusing to run',
    );
  }
  console.log(`Cloning ${endpoint(sourceUrl)} -> ${endpoint(destUrl)}`);

  const src = postgres(sourceUrl, { max: 1, prepare: false });
  const dst = postgres(destUrl, { max: 1, prepare: false });

  try {
    const tableRows = await src`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`;
    const tables = tableRows.map((row) => row.table_name as string);

    const destRows = await dst`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`;
    const destTables = new Set(destRows.map((row) => row.table_name as string));
    const missing = tables.filter((table) => !destTables.has(table));
    if (missing.length > 0) {
      throw new Error(
        `Destination is missing tables (run db:migrate against it first): ${missing.join(', ')}`,
      );
    }

    // Foreign-key edges parent -> child, for a FK-safe insert order.
    const fkRows = await src`
      select rel.relname as child, frel.relname as parent
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_class frel on frel.oid = con.confrelid
      where con.contype = 'f' and rel.relnamespace = 'public'::regnamespace`;
    const dependsOn = new Map<string, Set<string>>(
      tables.map((table) => [table, new Set<string>()]),
    );
    for (const { child, parent } of fkRows) {
      if (child !== parent) {
        dependsOn.get(child as string)?.add(parent as string);
      }
    }
    const ordered: string[] = [];
    const placed = new Set<string>();
    while (ordered.length < tables.length) {
      const ready = tables.filter(
        (table) =>
          !placed.has(table) &&
          [...(dependsOn.get(table) ?? [])].every((dep) => placed.has(dep)),
      );
      if (ready.length === 0) {
        throw new Error('Foreign-key cycle detected; cannot order tables');
      }
      for (const table of ready) {
        ordered.push(table);
        placed.add(table);
      }
    }

    const quoted = ordered.map((table) => `"${table}"`).join(', ');
    await dst.unsafe(`truncate table ${quoted} restart identity cascade`);

    for (const table of ordered) {
      const rows = await src`select * from ${src(table)}`;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await dst`insert into ${dst(table)} ${dst(chunk)}`;
      }
      const [count] = await dst`select count(*)::int as n from ${dst(table)}`;
      const status = count?.n === rows.length ? 'ok' : 'MISMATCH';
      console.log(`${table}: ${rows.length} rows -> ${count?.n} (${status})`);
      if (status === 'MISMATCH') {
        throw new Error(`Row count mismatch on ${table}`);
      }
    }

    // Bump any sequences past the copied ids so future inserts don't collide.
    const seqRows = await dst`
      select table_name, column_name,
        pg_get_serial_sequence(quote_ident(table_name), column_name) as seq
      from information_schema.columns
      where table_schema = 'public' and column_default like 'nextval%'`;
    for (const { table_name, column_name, seq } of seqRows) {
      if (seq) {
        await dst.unsafe(
          `select setval('${seq}', coalesce((select max("${column_name}") from "${table_name}"), 0) + 1, false)`,
        );
      }
    }

    console.log('Clone complete.');
  } finally {
    await src.end();
    await dst.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
