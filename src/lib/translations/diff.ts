type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

/** Words and the whitespace between them, so a join gives the text back. */
const tokens = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];

/**
 * Word-level diff of two short texts (tooltips, names) by longest common
 * subsequence: what to underline when a version changes an original.
 */
const diffWords = (before: string, after: string): DiffPart[] => {
  const a = tokens(before);
  const b = tokens(after);
  const n = a.length;
  const m = b.length;
  // lcs[i][j]: length of the LCS of a[i..] and b[j..].
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i -= 1) {
    const row = lcs[i];
    const below = lcs[i + 1];
    if (!row || !below) continue;
    for (let j = m - 1; j >= 0; j -= 1) {
      row[j] =
        a[i] === b[j]
          ? (below[j + 1] ?? 0) + 1
          : Math.max(below[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i] ?? '');
      i += 1;
      j += 1;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) {
      push('del', a[i] ?? '');
      i += 1;
    } else {
      push('add', b[j] ?? '');
      j += 1;
    }
  }
  while (i < n) push('del', a[i++] ?? '');
  while (j < m) push('add', b[j++] ?? '');
  return parts;
};

export { type DiffPart, diffWords };
