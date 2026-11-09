/**
 * Presentation for the faction cards on the game page: a one-line motto
 * per core faction, and which factions have their own scene picture (a
 * loading screen from the game) at `wiki/aotr/<code>/scene.webp`. The
 * alternates without one borrow the scene of the faction they replace.
 */
const FACTION_MOTTOS: Record<string, string> = {
  gondor: 'La ciudad blanca y sus feudos',
  rohan: 'Los jinetes de la Marca',
  rivendell: 'La última morada',
  lothlorien: 'El bosque dorado',
  woodland: 'Los elfos del Bosque Negro',
  erebor: 'La Montaña Solitaria',
  mordor: 'El Ojo que todo lo ve',
  isengard: 'La Mano Blanca de Saruman',
  mistyMountains: 'Trasgos bajo las montañas',
  dolGuldur: 'La fortaleza del Nigromante',
  haradwaith: 'Los señores del sur',
};

const FACTIONS_WITH_SCENE = new Set([
  ...Object.keys(FACTION_MOTTOS),
  'angmar',
  'arnor',
  'battleOfFiveArmies',
  'dolAmroth',
  'dunharrow',
  'greyCompany',
  'hostOfTheWest',
  'ithilien',
  'morgul',
  'ruffians',
  'shadowAndFlame',
  'shire',
  'whiteHand',
]);

const sceneKey = (code: string) => `wiki/aotr/${code}/scene.webp`;

/**
 * R2 serves the scenes as immutable for a year, so replacing a picture
 * under the same key changes nothing for anyone who has seen it. Bump this
 * after re-uploading scenes so their URLs change.
 */
const SCENE_VERSION = 2;

const hasScene = (code: string | null): code is string =>
  code !== null && FACTIONS_WITH_SCENE.has(code);

const mottoOf = (code: string | null) =>
  (code ? FACTION_MOTTOS[code] : undefined) ?? null;

export { hasScene, mottoOf, SCENE_VERSION, sceneKey };
