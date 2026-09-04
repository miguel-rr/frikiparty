/**
 * The facts every proposal on /design/home lays out: the next edition's
 * dates, venue, game and confirmed players, read once by the page and
 * shaped here so the proposals only differ in presentation.
 */

const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

type EventDay = {
  iso: string;
  day: number;
  weekday: (typeof WEEKDAYS_ES)[number];
  /** "jue", "vie"… */
  weekdayShort: string;
  month: (typeof MONTHS_ES)[number];
};

const dayOf = (iso: string): EventDay => {
  const [year = 1970, month = 1, day = 1] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAYS_ES[date.getUTCDay()] ?? 'lunes';
  return {
    iso,
    day,
    weekday,
    weekdayShort: weekday.slice(0, 3),
    month: MONTHS_ES[month - 1] ?? 'enero',
  };
};

/** Every day from startsAt to endsAt, inclusive. */
const daysBetween = (startsAt: string, endsAt: string): EventDay[] => {
  const days: EventDay[] = [];
  const cursor = new Date(`${startsAt}T00:00:00Z`);
  const end = new Date(`${endsAt}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime() && days.length < 14) {
    days.push(dayOf(cursor.toISOString().slice(0, 10)));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

type Avatar = {
  name: string;
  slug: string;
  portrait: string;
};

type EventFacts = {
  year: number;
  editionSlug: string;
  startsAt: string;
  endsAt: string;
  days: EventDay[];
  venueName: string;
  venueArea: string;
  venueSlug: string | null;
  venueIsPlace: boolean;
  venuePhotoUrl: string | null;
  mapsUrl: string | null;
  mapEmbedSrc: string | null;
  confirmed: Avatar[];
};

const mapEmbedFor = (query: string | null) =>
  query
    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`
    : null;

export type { Avatar, EventDay, EventFacts };
export { daysBetween, mapEmbedFor };
