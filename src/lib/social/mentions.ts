/**
 * Mentions inside a comment body: `@[Nombre del jugador](slug)`. The token
 * carries the name so a comment renders without looking anything up, and
 * the slug so the name links to the player's page. Shared by the composer
 * (inserting), the server (validating) and the thread (rendering).
 */

const MENTION_PATTERN = /@\[([^\]\n]{1,80})\]\(([a-z0-9-]{1,80})\)/g;

type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; name: string; slug: string };

const mentionToken = (name: string, slug: string) => `@[${name}](${slug})`;

/** Splits a body into plain text and mention segments, in order. */
const parseBody = (body: string): BodySegment[] => {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: 'text', text: body.slice(last, index) });
    }
    segments.push({
      kind: 'mention',
      name: match[1] ?? '',
      slug: match[2] ?? '',
    });
    last = index + match[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: 'text', text: body.slice(last) });
  }
  return segments;
};

/** Every slug mentioned, without duplicates. */
const mentionedSlugs = (body: string) =>
  Array.from(
    new Set(
      parseBody(body).flatMap((s) => (s.kind === 'mention' ? [s.slug] : [])),
    ),
  );

/**
 * Rewrites the tokens whose slug isn't in `knownSlugs` as plain `@Nombre`
 * text, so a made-up or stale mention can't link anywhere.
 */
const dropUnknownMentions = (body: string, knownSlugs: ReadonlySet<string>) =>
  body.replace(MENTION_PATTERN, (token, name: string, slug: string) =>
    knownSlugs.has(slug) ? token : `@${name}`,
  );

/** The body as a person would read it aloud: tokens become `@Nombre`. */
const plainText = (body: string) =>
  body.replace(MENTION_PATTERN, (_token, name: string) => `@${name}`);

export {
  type BodySegment,
  dropUnknownMentions,
  mentionedSlugs,
  mentionToken,
  parseBody,
  plainText,
};
