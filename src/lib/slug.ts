/** Lowercase, strips accents, replaces anything non-alphanumeric with hyphens. */
const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** First slug for `name` not in `taken`: the base, then base-2, base-3… */
const firstFreeSlug = (name: string, taken: Iterable<string>): string => {
  const used = new Set(taken);
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

export { firstFreeSlug, slugify };
