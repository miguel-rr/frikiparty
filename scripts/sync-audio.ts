import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { slugify } from '@/lib/slug';
import { headObject, publicUrl, putObject } from '@/server/storage/r2';

/**
 * Mirrors the local `.audio/` folder (git-ignored) into the shared R2 bucket
 * under `music/`. Each file is checked one by one: already-uploaded keys are
 * left alone, missing ones are uploaded. Re-run it any time you drop a new
 * track in the folder.
 */
const LOCAL_DIR = path.resolve('.audio');
const REMOTE_PREFIX = 'music';

const CONTENT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
};

/** `Concerning Hobbits (Cover).mp3` -> `music/concerning-hobbits-cover.mp3`. */
const remoteKey = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();
  const base = slugify(path.basename(fileName, path.extname(fileName)));
  return `${REMOTE_PREFIX}/${base}${extension}`;
};

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const main = async () => {
  const entries = await readdir(LOCAL_DIR).catch(() => {
    throw new Error(
      `Folder not found: ${LOCAL_DIR}. Create it and drop your audio files inside.`,
    );
  });
  const files = entries
    .filter((name) => !name.startsWith('.') && name !== 'README.md')
    .sort();

  if (files.length === 0) {
    console.log(`Nothing to sync: ${LOCAL_DIR} is empty.`);
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  for (const fileName of files) {
    const extension = path.extname(fileName).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      console.log(`✗ ${fileName}: unsupported format, convert it to MP3 first`);
      continue;
    }

    const localPath = path.join(LOCAL_DIR, fileName);
    const key = remoteKey(fileName);
    const { size } = await stat(localPath);
    const existing = await headObject(key);

    if (existing) {
      const note =
        existing.size === size
          ? ''
          : ` (remote is ${formatSize(existing.size)}, local is ${formatSize(size)}; rename the file to upload the new one)`;
      console.log(`= ${fileName} -> ${key} already there${note}`);
      skipped += 1;
      continue;
    }

    process.stdout.write(`↑ ${fileName} -> ${key} (${formatSize(size)})... `);
    await putObject(key, await readFile(localPath), contentType);
    console.log(`done\n    ${publicUrl(key)}`);
    uploaded += 1;
  }

  console.log(`\nUploaded ${uploaded}, skipped ${skipped}.`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
