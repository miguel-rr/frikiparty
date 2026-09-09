import { readFileSync } from 'node:fs';
import postgres from 'postgres';

/**
 * Carries the game versions and the lotr.str module's data from the dev
 * database to production: `game_version` rows of the official games
 * (matched by game name and version number, never by id), the uploaded
 * files with their blocks, and our custom strings. Idempotent: a second
 * run updates what changed and adds what's missing, nothing is duplicated.
 * The files themselves live in R2, shared by both environments, so the
 * `r2_key` values are valid as they are.
 *
 *   pnpm run db:sync:translations:prod            # applies
 *   pnpm run db:sync:translations:prod -- --dry-run   # only reports
 *
 * Source is DATABASE_URL (from .env via --env-file); destination is
 * DEST_DATABASE_URL, or the DATABASE_URL found in .env.prod.
 */

// Scripts read process.env directly: @/env would demand the full app env schema.
const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const destUrl =
  process.env.DEST_DATABASE_URL ??
  readFileSync('.env.prod', 'utf8').match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
const dryRun = process.argv.includes('--dry-run');

const host = (url: string) => new URL(url).host;
const CHUNK = 2000;

type Version = {
  id: string;
  game_name: string;
  version: string;
  release_order: number;
  released_at: string | null;
  notes: string | null;
  changelog_url: string | null;
};
type File = {
  id: string;
  game_version_id: string;
  language: string;
  source: string | null;
  uploaded_by_email: string | null;
  uploaded_at: Date;
  entry_count: number;
  sha256: string;
  r2_key: string;
  header: string | null;
  issues: unknown;
};
type Entry = {
  seq: number;
  key: string;
  value: string;
  comment: string | null;
};
type Custom = {
  key: string;
  value: string;
  note: string | null;
  base_en_file_id: string | null;
  base_en_value: string | null;
  base_es_value: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

const main = async () => {
  if (!sourceUrl || !destUrl) {
    throw new Error(
      'Faltan DATABASE_URL (origen) y .env.prod o DEST_DATABASE_URL (destino).',
    );
  }
  if (host(sourceUrl) === host(destUrl)) {
    throw new Error('Origen y destino son la misma base; no sigo.');
  }
  console.log(
    `${dryRun ? '[en seco] ' : ''}${host(sourceUrl)} → ${host(destUrl)}`,
  );
  const src = postgres(sourceUrl, { max: 1, prepare: false });
  const dst = postgres(destUrl, { max: 1, prepare: false });
  try {
    // --- versions of the official games, by game name ---
    const versions = (await src`
      SELECT v.id, g.name AS game_name, v.version, v.release_order,
             v.released_at::text AS released_at, v.notes, v.changelog_url
      FROM frikiparty_game_version v
      JOIN frikiparty_game g ON g.id = v.game_id
      WHERE g.is_official
      ORDER BY g.name, v.release_order
    `) as unknown as Version[];
    const destGames = await dst`SELECT id, name FROM frikiparty_game`;
    const destGameId = new Map(
      destGames.map((g) => [g.name as string, g.id as string]),
    );
    // Source version id → destination version id.
    const versionMap = new Map<string, string>();
    let versionsCreated = 0;
    let versionsUpdated = 0;
    for (const v of versions) {
      const gameId = destGameId.get(v.game_name);
      if (!gameId) {
        console.log(
          `  · el juego "${v.game_name}" no existe en destino; se salta ${v.version}`,
        );
        continue;
      }
      const [existing] = await dst`
        SELECT id FROM frikiparty_game_version
        WHERE game_id = ${gameId} AND version = ${v.version}
      `;
      if (existing) {
        versionMap.set(v.id, existing.id as string);
        versionsUpdated += 1;
        if (!dryRun) {
          await dst`
            UPDATE frikiparty_game_version
            SET release_order = ${v.release_order},
                released_at = ${v.released_at},
                notes = ${v.notes},
                changelog_url = ${v.changelog_url}
            WHERE id = ${existing.id as string}
          `;
        }
      } else {
        versionsCreated += 1;
        if (dryRun) {
          versionMap.set(v.id, `(nueva ${v.version})`);
        } else {
          const [created] = await dst`
            INSERT INTO frikiparty_game_version
              (game_id, version, release_order, released_at, notes, changelog_url)
            VALUES (${gameId}, ${v.version}, ${v.release_order}, ${v.released_at},
                    ${v.notes}, ${v.changelog_url})
            RETURNING id
          `;
          versionMap.set(v.id, created?.id as string);
        }
      }
      console.log(
        `  versión ${v.game_name} ${v.version}: ${existing ? 'actualizada' : 'creada'}`,
      );
    }
    console.log(
      `Versiones: ${versionsCreated} creadas, ${versionsUpdated} actualizadas.`,
    );

    // --- uploaded files and their blocks ---
    const files = (await src`
      SELECT f.id, f.game_version_id, f.language, f.source, u.email AS uploaded_by_email,
             f.uploaded_at, f.entry_count, f.sha256, f.r2_key, f.header, f.issues
      FROM frikiparty_str_file f
      LEFT JOIN "user" u ON u.id = f.uploaded_by_user_id
      ORDER BY f.uploaded_at
    `) as unknown as File[];
    const destUsers = await dst`SELECT id, email FROM "user"`;
    const destUserId = new Map(
      destUsers.map((u) => [u.email as string, u.id as string]),
    );
    // Source file id → destination file id.
    const fileMap = new Map<string, string>();
    for (const f of files) {
      const versionId = versionMap.get(f.game_version_id);
      if (!versionId) {
        console.log(
          `  · fichero ${f.language} sin versión en destino; se salta`,
        );
        continue;
      }
      const entries = (await src`
        SELECT seq, key, value, comment FROM frikiparty_str_entry
        WHERE file_id = ${f.id} ORDER BY seq
      `) as unknown as Entry[];
      const label = `fichero ${f.language} ${f.sha256.slice(0, 8)} (${entries.length} bloques)`;
      if (dryRun) {
        console.log(`  ${label}: se copiaría`);
        fileMap.set(f.id, `(nuevo ${f.language})`);
        continue;
      }
      const uploadedBy = f.uploaded_by_email
        ? (destUserId.get(f.uploaded_by_email) ?? null)
        : null;
      const destId = await dst.begin(async (tx) => {
        const [row] = await tx`
          INSERT INTO frikiparty_str_file
            (game_version_id, language, source, uploaded_by_user_id, uploaded_at,
             entry_count, sha256, r2_key, header, issues)
          VALUES (${versionId}, ${f.language}, ${f.source}, ${uploadedBy}, ${f.uploaded_at},
                  ${f.entry_count}, ${f.sha256}, ${f.r2_key}, ${f.header},
                  ${JSON.stringify(f.issues)}::jsonb)
          ON CONFLICT (game_version_id, language) DO UPDATE SET
            source = EXCLUDED.source,
            uploaded_by_user_id = EXCLUDED.uploaded_by_user_id,
            uploaded_at = EXCLUDED.uploaded_at,
            entry_count = EXCLUDED.entry_count,
            sha256 = EXCLUDED.sha256,
            r2_key = EXCLUDED.r2_key,
            header = EXCLUDED.header,
            issues = EXCLUDED.issues
          RETURNING id
        `;
        const id = row?.id as string;
        await tx`DELETE FROM frikiparty_str_entry WHERE file_id = ${id}`;
        for (let i = 0; i < entries.length; i += CHUNK) {
          const rows = entries
            .slice(i, i + CHUNK)
            .map((e) => ({ ...e, file_id: id }));
          await tx`INSERT INTO frikiparty_str_entry ${tx(rows, 'file_id', 'seq', 'key', 'value', 'comment')}`;
        }
        return id;
      });
      fileMap.set(f.id, destId);
      console.log(`  ${label}: copiado`);
    }
    console.log(`Ficheros: ${fileMap.size}.`);

    // --- our strings ---
    const customs = (await src`
      SELECT key, value, note, base_en_file_id, base_en_value, base_es_value,
             status, created_at, updated_at
      FROM frikiparty_custom_string ORDER BY key
    `) as unknown as Custom[];
    if (!dryRun) {
      for (const c of customs) {
        const baseFile = c.base_en_file_id
          ? (fileMap.get(c.base_en_file_id) ?? null)
          : null;
        await dst`
          INSERT INTO frikiparty_custom_string
            (key, value, note, base_en_file_id, base_en_value, base_es_value,
             status, created_at, updated_at)
          VALUES (${c.key}, ${c.value}, ${c.note}, ${baseFile}, ${c.base_en_value},
                  ${c.base_es_value}, ${c.status}, ${c.created_at}, ${c.updated_at})
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            note = EXCLUDED.note,
            base_en_file_id = EXCLUDED.base_en_file_id,
            base_en_value = EXCLUDED.base_en_value,
            base_es_value = EXCLUDED.base_es_value,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `;
      }
    }
    console.log(
      `Cadenas propias: ${customs.length}${dryRun ? ' (se copiarían)' : ''}.`,
    );
  } finally {
    await Promise.all([src.end(), dst.end()]);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
