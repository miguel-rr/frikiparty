/**
 * The SAGE `.str` string file (Age of the Ring's `lotr.str`): plain
 * Windows-1252 text, CRLF, one block per string:
 *
 *   CATEGORY:Name
 *   // context: optional comment, may sit inside the block
 *   "the text, with \n as a literal escape and &X marking a hotkey"
 *   END
 *
 * Pure functions, no I/O: the upload route decodes the bytes, the export
 * route re-encodes. Everything keeps the original lines so an export is
 * byte-identical except for the values we replace.
 */

/** One `KEY … END` block, by line index into the decoded file. */
type StrBlock = {
  key: string;
  /** Line index of the key line. */
  keyLine: number;
  /** Line index of the END line. */
  endLine: number;
  /** Line indexes of the value lines (everything inside that isn't a comment). */
  valueLines: number[];
  /** Comment lines found inside the block, `//` stripped and trimmed. */
  comments: string[];
};

type StrIssueKind =
  | 'unterminated' // key line with no END before the file ends
  | 'stray-end' // END with no open block
  | 'no-colon' // key without a CATEGORY: prefix
  | 'odd-key' // key with characters no real key uses (a corrupted line)
  | 'no-value' // block with no value line at all
  | 'unquoted' // value line that doesn't start with a quote
  | 'trailing'; // text after the closing quote

type StrIssue = { kind: StrIssueKind; line: number; key?: string };

type ParsedStr = {
  lines: string[];
  eol: '\r\n' | '\n';
  blocks: StrBlock[];
  issues: StrIssue[];
  /** Index of a trailing bare END after the last block, if the file has one. */
  trailingEnd: number | null;
};

const END = /^end$/i;
const COMMENT = /^\s*\/\//;
/** Characters real keys use; anything else marks a broken key line. */
const KEY_CHARS = /^[\w:\-. '()/&+!,?%#$]+$/;

const isEnd = (line: string) => END.test(line.trim());
const isComment = (line: string) => COMMENT.test(line);

const parseStr = (text: string): ParsedStr => {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const blocks: StrBlock[] = [];
  const issues: StrIssue[] = [];
  let open: StrBlock | null = null;
  let trailingEnd: number | null = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!open) {
      if (trimmed === '' || isComment(line)) return;
      if (isEnd(line)) {
        trailingEnd = index;
        issues.push({ kind: 'stray-end', line: index });
        return;
      }
      trailingEnd = null;
      open = {
        key: trimmed,
        keyLine: index,
        endLine: -1,
        valueLines: [],
        comments: [],
      };
      if (!trimmed.includes(':'))
        issues.push({ kind: 'no-colon', line: index, key: trimmed });
      else if (!KEY_CHARS.test(trimmed))
        issues.push({ kind: 'odd-key', line: index, key: trimmed });
      return;
    }
    if (isEnd(line)) {
      open.endLine = index;
      if (open.valueLines.length === 0)
        issues.push({ kind: 'no-value', line: index, key: open.key });
      blocks.push(open);
      open = null;
      return;
    }
    if (isComment(line)) {
      open.comments.push(trimmed.replace(/^\/\/\s?/, ''));
      return;
    }
    if (trimmed === '') return;
    open.valueLines.push(index);
    if (!trimmed.startsWith('"'))
      issues.push({ kind: 'unquoted', line: index, key: open.key });
    else if (!trimmed.endsWith('"'))
      issues.push({ kind: 'trailing', line: index, key: open.key });
  });
  if (open) {
    const last = open as StrBlock;
    issues.push({ kind: 'unterminated', line: last.keyLine, key: last.key });
  }
  // A bare END only counts as trailing when nothing opened after it.
  return { lines, eol, blocks, issues, trailingEnd };
};

/** The value lines of a block, verbatim, joined with `\n`. */
const blockValue = (parsed: ParsedStr, block: StrBlock) =>
  block.valueLines.map((i) => parsed.lines[i] ?? '').join('\n');

/**
 * The text between the first and the last quote of a raw value; what the
 * game shows (escapes such as `\n` kept literal). Null when unquoted.
 */
const valueText = (value: string): string | null => {
  const first = value.indexOf('"');
  const last = value.lastIndexOf('"');
  if (first < 0 || last <= first) return null;
  return value.slice(first + 1, last);
};

/** A raw value line for a text: quoted, single line. */
const quoteText = (text: string) => `"${text}"`;

/** Key → raw value, last occurrence wins (what the game does with repeats). */
const indexByKey = (parsed: ParsedStr) => {
  const map = new Map<string, string>();
  for (const block of parsed.blocks)
    map.set(block.key, blockValue(parsed, block));
  return map;
};

/** Keys that appear more than once, with each distinct raw value they carry. */
const duplicateKeys = (parsed: ParsedStr) => {
  const seen = new Map<string, string[]>();
  for (const block of parsed.blocks) {
    const list = seen.get(block.key) ?? [];
    list.push(blockValue(parsed, block));
    seen.set(block.key, list);
  }
  return [...seen.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({
      key,
      count: values.length,
      distinct: [...new Set(values)],
    }));
};

/** Category prefix of a key (`CONTROLBAR:Foo` → `CONTROLBAR`). */
const keyCategory = (key: string) => {
  const colon = key.indexOf(':');
  return colon < 0 ? '' : key.slice(0, colon);
};

type StrDiff = {
  added: string[];
  removed: string[];
  changed: { key: string; before: string; after: string }[];
};

/** Keys added, removed and changed from `before` to `after` (last-wins values). */
const diffStr = (
  before: Map<string, string>,
  after: Map<string, string>,
): StrDiff => {
  const diff: StrDiff = { added: [], removed: [], changed: [] };
  for (const [key, value] of after) {
    const old = before.get(key);
    if (old === undefined) diff.added.push(key);
    else if (old !== value)
      diff.changed.push({ key, before: old, after: value });
  }
  for (const key of before.keys()) if (!after.has(key)) diff.removed.push(key);
  return diff;
};

type ExportInput = {
  /** The parsed base file (the community Spanish one). */
  base: ParsedStr;
  /** Key → our text (unquoted); replaces every block with that key. */
  overrides: Map<string, string>;
  /** Blocks to append (keys the base lacks), in order, with their raw value. */
  appended: { key: string; value: string }[];
  /** Comment lines for the top of the file, without the `//`. */
  header: string[];
  /** Comment placed before the appended blocks, without the `//`. */
  appendedHeader?: string;
};

/**
 * The base file with our overrides substituted line for line, a header on
 * top and the missing keys appended before the trailing END, if any.
 * Every other line is emitted untouched.
 */
const serializeStr = ({
  base,
  overrides,
  appended,
  header,
  appendedHeader,
}: ExportInput): string => {
  const { lines, eol } = base;
  const skip = new Set<number>();
  const replaceAt = new Map<number, string>();
  for (const block of base.blocks) {
    const text = overrides.get(block.key);
    if (text === undefined || block.valueLines.length === 0) continue;
    const [first, ...rest] = block.valueLines;
    if (first === undefined) continue;
    replaceAt.set(first, quoteText(text));
    for (const line of rest) skip.add(line);
  }
  const out: string[] = header.map((line) => `// ${line}`.trimEnd());
  if (header.length > 0) out.push('');
  const cutoff = base.trailingEnd ?? lines.length;
  for (let i = 0; i < cutoff; i += 1) {
    if (skip.has(i)) continue;
    const replaced = replaceAt.get(i);
    out.push(replaced ?? lines[i] ?? '');
  }
  if (appended.length > 0) {
    if (appendedHeader) out.push(`// ${appendedHeader}`, '');
    for (const { key, value } of appended) {
      const text = overrides.get(key);
      out.push(key, text === undefined ? value : quoteText(text), 'END', '');
    }
  }
  for (let i = cutoff; i < lines.length; i += 1) out.push(lines[i] ?? '');
  return out.join(eol);
};

/* ---------- Windows-1252 ---------- */

const decoder = new TextDecoder('windows-1252');

/** Bytes of a `.str` file → text. */
const decodeStr = (bytes: Uint8Array) => decoder.decode(bytes);

let encodeTable: Map<string, number> | null = null;
/** Reverse of the decoder: every byte the game can read, by character. */
const cp1252Table = () => {
  if (encodeTable) return encodeTable;
  encodeTable = new Map<string, number>();
  for (let byte = 0; byte < 256; byte += 1) {
    const char = decoder.decode(new Uint8Array([byte]));
    if (!encodeTable.has(char)) encodeTable.set(char, byte);
  }
  return encodeTable;
};

/** Characters in `text` that Windows-1252 can't carry (deduplicated). */
const unencodable = (text: string) => {
  const table = cp1252Table();
  const bad = new Set<string>();
  for (const char of text) if (!table.has(char)) bad.add(char);
  return [...bad];
};

/** Text → bytes for the game; unencodable characters become `?`. */
const encodeStr = (text: string) => {
  const table = cp1252Table();
  const bytes = new Uint8Array(text.length);
  let n = 0;
  for (const char of text) {
    bytes[n] = table.get(char) ?? 0x3f;
    n += 1;
  }
  return bytes.subarray(0, n);
};

/* ---------- Editing helpers ---------- */

/** The hotkey letter a text declares with `&`, if any. */
const hotkeyOf = (text: string) => {
  const match = /&([^\s&])/.exec(text);
  return match?.[1] ?? null;
};

/** printf-style placeholders the game fills in (`%d`, `%s`, `%1`…). */
const placeholdersOf = (text: string) =>
  (text.match(/%[\d.]*[a-zA-Z%]|%\d/g) ?? []).sort();

export {
  blockValue,
  decodeStr,
  diffStr,
  duplicateKeys,
  type ExportInput,
  encodeStr,
  hotkeyOf,
  indexByKey,
  keyCategory,
  type ParsedStr,
  parseStr,
  placeholdersOf,
  quoteText,
  type StrBlock,
  type StrDiff,
  type StrIssue,
  type StrIssueKind,
  serializeStr,
  unencodable,
  valueText,
};
