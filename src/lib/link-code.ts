/**
 * One-time codes that let a signed-in user claim a player (see
 * player.linkByCode). Eight characters from an alphabet without look-alikes
 * (no 0/O, 1/I/L), stored flat and shown as "XXXX-XXXX" so they're easy to
 * read aloud or type on a phone.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

const generateLinkCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
};

/** Uppercases and strips anything that isn't part of the alphabet (dashes, spaces). */
const normalizeLinkCode = (raw: string) =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

const formatLinkCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export { formatLinkCode, generateLinkCode, normalizeLinkCode };
