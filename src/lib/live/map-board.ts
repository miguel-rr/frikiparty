/**
 * The illustrated map sheets the captains place their players on: a ring
 * per start position, measured in pixels of the art, with the lobby slot
 * ("Jugador 3") it stands for.
 */
type BoardRing = { x: number; y: number; r: number; slot: number };

/** Ring indexes of each side of the map, as the art splits it by default. */
type BoardHalves = [number[], number[]];

/** Which rings each team of a game may use (ring indexes into the board). */
type RingSides = { A: number[]; B: number[] };

/** Who made the map, as the booklet tells it: the mod, a fan, or an AI. */
type MapOrigin = 'official' | 'custom' | 'ai';

/** The booklet's size band, from the playable area in cells. */
type MapSizeBand = 'small' | 'medium' | 'large';

/** The booklet's data line of a map; null where a map lacks it. */
type MapFacts = {
  origin: MapOrigin | null;
  sizeBand: MapSizeBand | null;
  cells: { width: number; height: number } | null;
};

type MapBoard = {
  imageUrl: string;
  width: number;
  height: number;
  rings: BoardRing[];
  halves: BoardHalves;
  facts: MapFacts;
};

const ORIGIN_LABEL: Record<MapOrigin, string> = {
  official: 'Oficial',
  custom: 'Custom',
  ai: 'IA',
};

const SIZE_BAND_LABEL: Record<MapSizeBand, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
};

/** Halves handed to the teams; `swap` gives team A the second half. */
const sidesFromHalves = (halves: BoardHalves, swap: boolean): RingSides =>
  swap ? { A: halves[1], B: halves[0] } : { A: halves[0], B: halves[1] };

/**
 * Why a split of the rings is not usable, or null when it is: every ring
 * belongs to the board, none to both teams, and each team has a ring per
 * player.
 */
const ringSidesProblem = (
  sides: RingSides,
  ringCount: number,
  teamSizes: { A: number; B: number },
): string | null => {
  const all = [...sides.A, ...sides.B];
  if (all.some((i) => !Number.isInteger(i) || i < 0 || i >= ringCount))
    return 'Ese anillo no está en el mapa.';
  if (new Set(all).size !== all.length)
    return 'Un anillo no puede ser de los dos equipos.';
  if (sides.A.length < teamSizes.A || sides.B.length < teamSizes.B)
    return 'Cada equipo necesita un anillo por jugador.';
  return null;
};

/** Same rings, whatever the order they were listed in. */
const sameRings = (a: number[], b: number[]) =>
  a.length === b.length && a.every((i) => b.includes(i));

export {
  type BoardHalves,
  type BoardRing,
  type MapBoard,
  type MapFacts,
  type MapOrigin,
  type MapSizeBand,
  ORIGIN_LABEL,
  type RingSides,
  ringSidesProblem,
  SIZE_BAND_LABEL,
  sameRings,
  sidesFromHalves,
};
