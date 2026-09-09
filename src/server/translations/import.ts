import { createHash } from 'node:crypto';
import { and, eq, isNotNull } from 'drizzle-orm';

import {
  decodeStr,
  diffStr,
  duplicateKeys,
  indexByKey,
  keyCategory,
  parseStr,
  type StrIssue,
} from '@/lib/translations/str';
import {
  customString,
  gameVersion,
  strEntry,
  strFile,
} from '@/server/db/schema';
import type { StrLanguage } from '@/server/db/schema/translations';
import { deleteObjects, putObject } from '@/server/storage/r2';
import {
  type Database,
  latestFile,
  listFiles,
  loadEntries,
} from '@/server/translations/files';

type ImportInput = {
  bytes: Buffer;
  gameVersionId: string;
  language: StrLanguage;
  source: string | null;
  userId: string;
  /** Overwrite the file already uploaded for this version and language. */
  replace: boolean;
};

type ImportReport = {
  fileId: string;
  language: StrLanguage;
  version: string;
  replaced: boolean;
  blocks: number;
  uniqueKeys: number;
  categories: { name: string; count: number }[];
  /** Repeated keys carrying different values (the game keeps the last). */
  duplicates: { key: string; count: number; distinct: string[] }[];
  issues: StrIssue[];
  /** Against the file this one replaces, or the previous version's. */
  previous: {
    fileId: string;
    version: string;
    addedCount: number;
    removedCount: number;
    changedCount: number;
    /** Samples of each, capped; the counts above are the full totals. */
    added: string[];
    removed: string[];
    changed: { key: string; before: string; after: string }[];
  } | null;
  /** Custom strings whose English baseline no longer matches. */
  review: string[];
};

type ImportResult =
  | { ok: true; report: ImportReport }
  | {
      ok: false;
      conflict: {
        fileId: string;
        uploadedAt: Date;
        source: string | null;
        entryCount: number;
      };
    };

const CHUNK = 2000;
const SAMPLE = 300;

const stripComment = (line: string) => line.trim().replace(/^\/\/\s?/, '');

/**
 * Parse an uploaded `lotr.str`, keep the bytes in R2, store its blocks and
 * report what changed. Replacing keeps the file's id so the custom strings
 * that point at it stay attached.
 */
const importStrFile = async (
  db: Database,
  input: ImportInput,
): Promise<ImportResult> => {
  const parsed = parseStr(decodeStr(input.bytes));
  if (parsed.blocks.length < 100) {
    throw new Error(
      'El fichero no parece un lotr.str: apenas tiene bloques KEY … END.',
    );
  }
  const [version] = await db
    .select({
      id: gameVersion.id,
      version: gameVersion.version,
      releaseOrder: gameVersion.releaseOrder,
    })
    .from(gameVersion)
    .where(eq(gameVersion.id, input.gameVersionId));
  if (!version) throw new Error('Esa versión del juego no existe.');

  const [existing] = await db
    .select()
    .from(strFile)
    .where(
      and(
        eq(strFile.gameVersionId, input.gameVersionId),
        eq(strFile.language, input.language),
      ),
    );
  if (existing && !input.replace) {
    return {
      ok: false,
      conflict: {
        fileId: existing.id,
        uploadedAt: existing.uploadedAt,
        source: existing.source,
        entryCount: existing.entryCount,
      },
    };
  }

  // What we compare against: the file being replaced, else the newest
  // earlier version in the same language.
  const previousRow = existing
    ? { id: existing.id, version: version.version }
    : ((await listFiles(db)).find(
        (row) =>
          row.language === input.language &&
          row.releaseOrder < version.releaseOrder,
      ) ?? null);
  const previousEntries = previousRow
    ? await loadEntries(db, previousRow.id)
    : null;

  const sha256 = createHash('sha256').update(input.bytes).digest('hex');
  const r2Key = `translations/${version.version}/${input.language}-${sha256.slice(0, 12)}.str`;
  await putObject(r2Key, input.bytes, 'text/plain; charset=windows-1252');

  const firstBlock = parsed.blocks[0];
  const header = firstBlock
    ? parsed.lines
        .slice(0, firstBlock.keyLine)
        .filter((line) => line.trim().startsWith('//'))
        .map(stripComment)
        .filter((line) => line !== '' && !/^\/+$/.test(line))
        .join('\n') || null
    : null;

  const fileValues = {
    source: input.source,
    uploadedByUserId: input.userId,
    uploadedAt: new Date(),
    entryCount: parsed.blocks.length,
    sha256,
    r2Key,
    header,
    issues: parsed.issues,
  };
  const rows = parsed.blocks.map((block, seq) => ({
    seq,
    key: block.key,
    value: block.valueLines.map((i) => parsed.lines[i] ?? '').join('\n'),
    comment: block.comments.length > 0 ? block.comments.join('\n') : null,
  }));

  const fileId = await db.transaction(async (tx) => {
    let id: string;
    if (existing) {
      await tx.delete(strEntry).where(eq(strEntry.fileId, existing.id));
      await tx
        .update(strFile)
        .set(fileValues)
        .where(eq(strFile.id, existing.id));
      id = existing.id;
    } else {
      const [inserted] = await tx
        .insert(strFile)
        .values({
          gameVersionId: input.gameVersionId,
          language: input.language,
          ...fileValues,
        })
        .returning({ id: strFile.id });
      if (!inserted) throw new Error('No se pudo guardar el fichero.');
      id = inserted.id;
    }
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx
        .insert(strEntry)
        .values(
          rows.slice(i, i + CHUNK).map((row) => ({ ...row, fileId: id })),
        );
    }
    return id;
  });
  if (existing && existing.r2Key !== r2Key) {
    await deleteObjects([existing.r2Key]).catch(() => undefined);
  }

  const byKey = indexByKey(parsed);

  // Custom strings written against an older English: when this file is
  // now the newest English and carries a different original, flag them.
  const review: string[] = [];
  if (input.language === 'en') {
    const newest = await latestFile(db, 'en');
    if (newest?.id === fileId) {
      const customs = await db
        .select({
          id: customString.id,
          key: customString.key,
          baseEnValue: customString.baseEnValue,
          status: customString.status,
        })
        .from(customString)
        .where(isNotNull(customString.baseEnValue));
      for (const custom of customs) {
        const current = byKey.get(custom.key);
        if (current === custom.baseEnValue) continue;
        review.push(custom.key);
        if (custom.status !== 'review') {
          await db
            .update(customString)
            .set({ status: 'review' })
            .where(eq(customString.id, custom.id));
        }
      }
    }
  }

  const categories = new Map<string, number>();
  for (const key of byKey.keys()) {
    const name = keyCategory(key);
    categories.set(name, (categories.get(name) ?? 0) + 1);
  }
  let previous: ImportReport['previous'] = null;
  if (previousRow && previousEntries) {
    const before = new Map(
      [...previousEntries].map(([key, { value }]) => [key, value]),
    );
    const diff = diffStr(before, byKey);
    previous = {
      fileId: previousRow.id,
      version: previousRow.version,
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      changedCount: diff.changed.length,
      added: diff.added.slice(0, SAMPLE),
      removed: diff.removed.slice(0, SAMPLE),
      changed: diff.changed.slice(0, SAMPLE),
    };
  }

  return {
    ok: true,
    report: {
      fileId,
      language: input.language,
      version: version.version,
      replaced: Boolean(existing),
      blocks: parsed.blocks.length,
      uniqueKeys: byKey.size,
      categories: [...categories]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      duplicates: duplicateKeys(parsed).filter((d) => d.distinct.length > 1),
      issues: parsed.issues,
      previous,
      review,
    },
  };
};

export {
  type ImportInput,
  type ImportReport,
  type ImportResult,
  importStrFile,
};
