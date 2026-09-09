import { eq } from 'drizzle-orm';

import {
  decodeStr,
  encodeStr,
  indexByKey,
  parseStr,
  serializeStr,
  unencodable,
} from '@/lib/translations/str';
import { customString, strFile } from '@/server/db/schema';
import { getObject } from '@/server/storage/r2';
import {
  type Database,
  listFiles,
  loadEntries,
} from '@/server/translations/files';

type ExportSelection = { esFileId: string; enFileId: string | null };

type ExportSummary = {
  es: { id: string; version: string; source: string | null };
  en: { id: string; version: string; source: string | null } | null;
  /** Custom strings that will replace a line of the base file. */
  overrides: number;
  /** Of those, the ones still waiting for review. */
  inReview: string[];
  /** Keys the English has and the Spanish lacks; appended at the end. */
  appended: string[];
  /** Custom strings whose key exists in neither file; left out. */
  orphans: string[];
  /** Custom values with characters Windows-1252 can't carry. */
  unencodable: { key: string; chars: string[] }[];
};

/** What the export will be made of, from the stored rows alone. */
const exportSummary = async (
  db: Database,
  { esFileId, enFileId }: ExportSelection,
): Promise<ExportSummary> => {
  const files = await listFiles(db);
  const es = files.find((f) => f.id === esFileId && f.language === 'es');
  if (!es) throw new Error('No existe ese fichero español.');
  const en = enFileId
    ? (files.find((f) => f.id === enFileId && f.language === 'en') ?? null)
    : null;
  const esEntries = await loadEntries(db, es.id);
  const enEntries = en ? await loadEntries(db, en.id) : new Map();
  const customs = await db.select().from(customString);
  const summary: ExportSummary = {
    es: { id: es.id, version: es.version, source: es.source },
    en: en ? { id: en.id, version: en.version, source: en.source } : null,
    overrides: 0,
    inReview: [],
    appended: [],
    orphans: [],
    unencodable: [],
  };
  for (const custom of customs) {
    const known = esEntries.has(custom.key) || enEntries.has(custom.key);
    if (!known) {
      summary.orphans.push(custom.key);
      continue;
    }
    summary.overrides += 1;
    if (custom.status === 'review') summary.inReview.push(custom.key);
    const bad = unencodable(custom.value);
    if (bad.length > 0)
      summary.unencodable.push({ key: custom.key, chars: bad });
  }
  summary.appended = [...enEntries.entries()]
    .filter(([key]) => !esEntries.has(key))
    .sort((a, b) => a[1].seq - b[1].seq)
    .map(([key]) => key);
  return summary;
};

const stamp = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/**
 * The file for the game: the Spanish base byte for byte, our strings in
 * place of its lines, and the keys only the English knows appended.
 */
const buildExport = async (db: Database, selection: ExportSelection) => {
  const summary = await exportSummary(db, selection);
  const [esRow] = await db
    .select({ r2Key: strFile.r2Key })
    .from(strFile)
    .where(eq(strFile.id, summary.es.id));
  if (!esRow) throw new Error('No existe ese fichero español.');
  const base = parseStr(decodeStr(await getObject(esRow.r2Key)));
  const baseKeys = indexByKey(base);
  const enEntries = summary.en
    ? await loadEntries(db, summary.en.id)
    : new Map<string, { value: string; seq: number }>();
  const customs = await db.select().from(customString);
  const overrides = new Map<string, string>();
  for (const custom of customs) {
    if (baseKeys.has(custom.key) || enEntries.has(custom.key))
      overrides.set(custom.key, custom.value);
  }
  const appended = summary.appended.map((key) => ({
    key,
    value: enEntries.get(key)?.value ?? '""',
  }));
  const header = [
    `Frikiparty · lotr.str generado el ${stamp()}`,
    `Base: traducción${summary.es.source ? ` de ${summary.es.source}` : ''} para Age of the Ring ${summary.es.version}`,
    `Cadenas propias aplicadas: ${overrides.size}`,
    ...(summary.en && appended.length > 0
      ? [
          `Claves rellenadas desde el original ${summary.en.version}: ${appended.length}`,
        ]
      : []),
  ];
  const text = serializeStr({
    base,
    overrides,
    appended,
    header,
    appendedHeader: summary.en
      ? `Frikiparty: claves del original ${summary.en.version} ausentes en esta traducción`
      : undefined,
  });
  return {
    bytes: encodeStr(text),
    filename: 'lotr.str',
    summary,
  };
};

export { buildExport, type ExportSelection, type ExportSummary, exportSummary };
