import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { headObject, publicUrl, putObject } from '@/server/storage/r2';

import { gondor } from './wiki-data/aotr-gondor';
import { misty } from './wiki-data/aotr-misty';
import { CRESTS } from './wiki-data/crests';
import type { FactionData } from './wiki-data/types';

/**
 * Wiki pictures live in the shared R2 bucket under `wiki/`, mirrored from
 * the git-ignored `.wiki-images/` folder (same idea as `.audio/`). Keys are
 * the file's path inside the folder, so `.wiki-images/aotr/gondor/units/
 * boromir.webp` becomes `wiki/aotr/gondor/units/boromir.webp`; the seed
 * builds the same keys from each entry's slug (see scripts/seed-wiki.ts).
 *
 *   pnpm run wiki:images             upload whatever is missing
 *   pnpm run wiki:images -- force    upload everything, replacing what is there
 *   pnpm run wiki:images -- manifest print, as JSON, every key the seed
 *                                    expects with its source file on the
 *                                    community wiki (for the image pipeline)
 */
const LOCAL_DIR = path.resolve('.wiki-images');
const REMOTE_PREFIX = 'wiki';

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const FACTIONS: FactionData[] = [gondor, misty];

type ManifestEntry = {
  key: string;
  /** File name on aotr.fandom.com, or `spellbook:<tier>:<position>` for a power icon. */
  source: string;
};

const manifest = (): ManifestEntry[] => {
  const out: ManifestEntry[] = [];
  for (const [code, file] of Object.entries(CRESTS))
    out.push({ key: `aotr/${code}/logo.webp`, source: file });
  for (const f of FACTIONS) {
    const base = `aotr/${f.code}`;
    for (const u of f.units) {
      if (u.images?.ingame)
        out.push({
          key: `${base}/units/${u.slug}.webp`,
          source: u.images.ingame,
        });
      if (u.images?.portrait)
        out.push({
          key: `${base}/units/${u.slug}-portrait.webp`,
          source: u.images.portrait,
        });
    }
    for (const h of f.heroes) {
      if (h.images?.ingame)
        out.push({
          key: `${base}/heroes/${h.slug}.webp`,
          source: h.images.ingame,
        });
      if (h.images?.portrait)
        out.push({
          key: `${base}/heroes/${h.slug}-portrait.webp`,
          source: h.images.portrait,
        });
    }
    for (const s of f.structures) {
      if (s.images?.ingame)
        out.push({
          key: `${base}/structures/${s.slug}.webp`,
          source: s.images.ingame,
        });
    }
    for (const p of f.powers) {
      out.push({
        key: `${base}/powers/${p.slug}.webp`,
        source: `spellbook:${p.tier}:${p.position}`,
      });
    }
  }
  return out;
};

const walk = async (dir: string, prefix = ''): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      files.push(...(await walk(path.join(dir, entry.name), rel)));
    else files.push(rel);
  }
  return files.sort();
};

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

const sync = async (force: boolean) => {
  const files = await walk(LOCAL_DIR).catch(() => {
    throw new Error(
      `Folder not found: ${LOCAL_DIR}. See .wiki-images/README.md for how to fill it.`,
    );
  });
  if (files.length === 0) {
    console.log(`Nothing to sync: ${LOCAL_DIR} is empty.`);
    return;
  }
  const expected = new Set(manifest().map((m) => m.key));
  let uploaded = 0;
  let skipped = 0;
  for (const rel of files) {
    const contentType = CONTENT_TYPES[path.extname(rel).toLowerCase()];
    if (!contentType) {
      console.log(`✗ ${rel}: unsupported format`);
      continue;
    }
    const key = `${REMOTE_PREFIX}/${rel}`;
    const localPath = path.join(LOCAL_DIR, rel);
    const { size } = await stat(localPath);
    if (!force && (await headObject(key))) {
      skipped += 1;
      continue;
    }
    process.stdout.write(`↑ ${key} (${formatSize(size)})... `);
    await putObject(key, await readFile(localPath), contentType);
    console.log('done');
    uploaded += 1;
    expected.delete(rel);
  }
  const missing = [...expected].filter((k) => !files.includes(k));
  console.log(`\nUploaded ${uploaded}, already there ${skipped}.`);
  if (missing.length)
    console.log(
      `Missing locally (the seed will point at them anyway):\n  ${missing.join('\n  ')}`,
    );
  console.log(`Public base: ${publicUrl(REMOTE_PREFIX)}/…`);
};

const main = async () => {
  if (process.argv.includes('manifest')) {
    console.log(JSON.stringify(manifest(), null, 1));
    return;
  }
  await sync(process.argv.includes('force'));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
