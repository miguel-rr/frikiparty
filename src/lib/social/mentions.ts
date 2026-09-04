/**
 * Mentions inside a comment body: `@[Nombre del jugador](ref)`. The ref
 * is the player's id, so a rename never strands a mention: the server
 * swaps in the current name and page slug when it serves the thread (see
 * resolveMentions in the social router), and turns whatever the composer
 * sent — an id, or a slug from a body being edited — back into an id when
 * it saves. Older bodies still carry slugs as refs; they resolve the same
 * way as long as the slug is current. Shared by the composer (inserting),
 * the server (normalising and resolving) and the thread (rendering).
 */

const MENTION_PATTERN = /@\[([^\]\n]{1,80})\]\(([a-z0-9-]{1,80})\)/g;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; name: string; ref: string };

const mentionToken = (name: string, ref: string) => `@[${name}](${ref})`;

/** Whether a mention ref is a player id (else it's a slug, old style). */
const isPlayerId = (ref: string) => UUID_PATTERN.test(ref);

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
      ref: match[2] ?? '',
    });
    last = index + match[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: 'text', text: body.slice(last) });
  }
  return segments;
};

/** Every ref mentioned, without duplicates. */
const mentionedRefs = (body: string) =>
  Array.from(
    new Set(
      parseBody(body).flatMap((s) => (s.kind === 'mention' ? [s.ref] : [])),
    ),
  );

/**
 * Rewrites every token through `resolve`: the replacement token, or null
 * to demote the mention to plain `@Nombre` text (unknown or stale ref).
 */
const rewriteMentions = (
  body: string,
  resolve: (ref: string, name: string) => string | null,
) =>
  body.replace(
    MENTION_PATTERN,
    (_token, name: string, ref: string) => resolve(ref, name) ?? `@${name}`,
  );

/** The body as a person would read it aloud: tokens become `@Nombre`. */
const plainText = (body: string) =>
  body.replace(MENTION_PATTERN, (_token, name: string) => `@${name}`);

export {
  type BodySegment,
  isPlayerId,
  mentionedRefs,
  mentionToken,
  parseBody,
  plainText,
  rewriteMentions,
};
