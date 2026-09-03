/**
 * Council wording shared by server and client components — kept out of
 * the roster (a client module) so static pages can call it at build time.
 */

const NUMBER_WORDS = [
  '',
  'Un',
  'Dos',
  'Tres',
  'Cuatro',
  'Cinco',
  'Seis',
  'Siete',
  'Ocho',
  'Nueve',
  'Diez',
  'Once',
  'Doce',
  'Trece',
  'Catorce',
  'Quince',
  'Dieciséis',
  'Diecisiete',
  'Dieciocho',
  'Diecinueve',
  'Veinte',
] as const;

/** "Un jugador ha confirmado", "Doce jugadores han confirmado", "23 jugadores…". */
const confirmedCountSentence = (count: number, tail: string) => {
  const number = NUMBER_WORDS[count] ?? String(count);
  return count === 1
    ? `${number} jugador ha confirmado ${tail}`
    : `${number} jugadores han confirmado ${tail}`;
};

export { confirmedCountSentence };
