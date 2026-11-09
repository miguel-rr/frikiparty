/**
 * How each core faction shows on the game page's banners: a one-line motto
 * and two colours, the accent (top edge, alternate links) and the field
 * the banner fades down from.
 */
type Heraldry = { motto: string; accent: string; field: string };

const FACTION_HERALDRY: Record<string, Heraldry> = {
  gondor: {
    motto: 'La ciudad blanca y sus feudos',
    accent: '#c9ced6',
    field: '#1b2027',
  },
  rohan: {
    motto: 'Los jinetes de la Marca',
    accent: '#9ccf8a',
    field: '#16301c',
  },
  rivendell: {
    motto: 'La última morada',
    accent: '#a9c6e8',
    field: '#17263a',
  },
  lothlorien: {
    motto: 'El bosque dorado',
    accent: '#e4c66a',
    field: '#2b2a12',
  },
  woodland: {
    motto: 'Los elfos del Bosque Negro',
    accent: '#8fc48a',
    field: '#132a17',
  },
  erebor: {
    motto: 'La Montaña Solitaria',
    accent: '#e0b65a',
    field: '#2a1f0d',
  },
  mordor: {
    motto: 'El Ojo que todo lo ve',
    accent: '#ef5a3c',
    field: '#2a0c08',
  },
  isengard: {
    motto: 'La Mano Blanca de Saruman',
    accent: '#e6e6e6',
    field: '#1a1a1c',
  },
  mistyMountains: {
    motto: 'Trasgos bajo las montañas',
    accent: '#c79a6a',
    field: '#24180f',
  },
  dolGuldur: {
    motto: 'La fortaleza del Nigromante',
    accent: '#9fb7a4',
    field: '#141c17',
  },
  haradwaith: {
    motto: 'Los señores del sur',
    accent: '#e0784a',
    field: '#2c120a',
  },
};

const NEUTRAL_HERALDRY: Heraldry = {
  motto: '',
  accent: '#c9a557',
  field: '#19231b',
};

const heraldryOf = (code: string | null): Heraldry =>
  (code ? FACTION_HERALDRY[code] : undefined) ?? NEUTRAL_HERALDRY;

export type { Heraldry };
export { heraldryOf };
