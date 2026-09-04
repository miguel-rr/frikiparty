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

/**
 * A player's previous-slug list after moving from `leaving` to `arriving`:
 * the slug left behind is kept (once), the one now current is dropped, so
 * a player renamed back and forth never redirects to themselves.
 */
const rememberSlug = (previous: string[], leaving: string, arriving: string) =>
  Array.from(new Set([...previous, leaving])).filter(
    (slug) => slug !== arriving,
  );

export { firstFreeSlug, rememberSlug, slugify };
