import type { Player } from '@/lib/simulator/types';

/**
 * ~20 fictional players. Deliberately shaped to force every tiebreak level
 * of the historical ranking rule (rings -> individual rings -> editions
 * played), including a full three-way tie with no rule left to break it.
 */
const MOCK_PLAYERS: Player[] = [
  // Tied on rings=5, broken by individualRings.
  {
    id: 'centella',
    name: 'Centella',
    rings: 5,
    individualRings: 3,
    editionsPlayed: 12,
  },
  {
    id: 'yunque',
    name: 'Yunque',
    rings: 5,
    individualRings: 2,
    editionsPlayed: 14,
  },
  {
    id: 'el-cuervo',
    name: 'El Cuervo',
    rings: 5,
    individualRings: 1,
    editionsPlayed: 9,
  },

  // Tied on rings=3 & individualRings=2, broken by editionsPlayed.
  {
    id: 'trasgo-errante',
    name: 'Trasgo Errante',
    rings: 3,
    individualRings: 2,
    editionsPlayed: 10,
  },
  {
    id: 'doble-filo',
    name: 'Doble Filo',
    rings: 3,
    individualRings: 2,
    editionsPlayed: 8,
  },
  {
    id: 'brasa',
    name: 'Brasa',
    rings: 3,
    individualRings: 2,
    editionsPlayed: 6,
  },

  // Tied on all three fields: no rule left, falls back to alphabetical order.
  {
    id: 'espino',
    name: 'Espino',
    rings: 1,
    individualRings: 0,
    editionsPlayed: 4,
  },
  {
    id: 'forastero',
    name: 'Forastero',
    rings: 1,
    individualRings: 0,
    editionsPlayed: 4,
  },
  {
    id: 'grisaceo',
    name: 'Grisáceo',
    rings: 1,
    individualRings: 0,
    editionsPlayed: 4,
  },

  // Unique standings filling out the field.
  {
    id: 'trueno',
    name: 'Trueno',
    rings: 6,
    individualRings: 5,
    editionsPlayed: 15,
  },
  {
    id: 'cazador-gris',
    name: 'Cazador Gris',
    rings: 4,
    individualRings: 4,
    editionsPlayed: 11,
  },
  {
    id: 'marisco',
    name: 'Marisco',
    rings: 3,
    individualRings: 1,
    editionsPlayed: 9,
  },
  {
    id: 'piedra-lunar',
    name: 'Piedra Lunar',
    rings: 2,
    individualRings: 3,
    editionsPlayed: 7,
  },
  {
    id: 'vendaval',
    name: 'Vendaval',
    rings: 2,
    individualRings: 1,
    editionsPlayed: 5,
  },
  {
    id: 'filo-frio',
    name: 'Filo Frío',
    rings: 1,
    individualRings: 3,
    editionsPlayed: 4,
  },
  {
    id: 'errante-del-norte',
    name: 'Errante del Norte',
    rings: 1,
    individualRings: 0,
    editionsPlayed: 1,
  },
  {
    id: 'sombra-larga',
    name: 'Sombra Larga',
    rings: 0,
    individualRings: 2,
    editionsPlayed: 6,
  },
  {
    id: 'puno-de-roble',
    name: 'Puño de Roble',
    rings: 0,
    individualRings: 1,
    editionsPlayed: 3,
  },
  { id: 'alba', name: 'Alba', rings: 0, individualRings: 0, editionsPlayed: 2 },
  {
    id: 'custodio',
    name: 'Custodio',
    rings: 0,
    individualRings: 0,
    editionsPlayed: 1,
  },
];

/** Seed list for the growable unofficial-tournament game dropdown. */
const MOCK_UNOFFICIAL_GAMES: string[] = [
  'Catan',
  'Carcassonne',
  'Twilight Imperium',
  'Root',
  '7 Wonders',
  'Gloomhaven',
];

export { MOCK_PLAYERS, MOCK_UNOFFICIAL_GAMES };
