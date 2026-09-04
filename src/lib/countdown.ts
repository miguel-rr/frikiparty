/**
 * One clock for every countdown to the next edition: the fire is lit at
 * 14:00 Madrid time on day one, and what remains is counted in whole days,
 * hours, minutes and seconds by the visitor's own clock. The Doors of Durin
 * and the home hero both read from here so they never disagree by a second.
 * Pure on purpose: server pages import it too; the ticking hook lives beside
 * it in use-countdown.ts.
 */

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const OPENING_TIME_ZONE = 'Europe/Madrid';
const OPENING_HOUR = 14;

const madridClock = new Intl.DateTimeFormat('en-US', {
  timeZone: OPENING_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Madrid's UTC offset (ms) at a given instant: +1h in winter, +2h in summer. */
const madridOffsetAt = (instant: number) => {
  const wall: Record<string, number> = {};
  for (const { type, value } of madridClock.formatToParts(new Date(instant))) {
    wall[type] = Number(value);
  }
  const asUtc = Date.UTC(
    wall.year ?? 1970,
    (wall.month ?? 1) - 1,
    wall.day ?? 1,
    wall.hour ?? 0,
    wall.minute ?? 0,
    wall.second ?? 0,
  );
  return asUtc - instant;
};

/**
 * The instant the door opens: 14:00 in Madrid on the edition's first day,
 * as an absolute (UTC) ISO string so every visitor counts to the same
 * moment. DST is resolved for that very day, and since the Madrid switch
 * happens at 01:00 UTC the offset read at 14:00 UTC is the right one.
 */
const openingInstant = (startsAt: string) => {
  const guess = Date.parse(
    `${startsAt}T${String(OPENING_HOUR).padStart(2, '0')}:00:00Z`,
  );
  return new Date(guess - madridOffsetAt(guess)).toISOString();
};

/** Today's date (yyyy-mm-dd) as Madrid's calendar reads it. */
const todayInMadrid = (now = Date.now()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: OPENING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));

const remainingTo = (target: Date, now = Date.now()): Remaining => {
  const ms = Math.max(0, target.getTime() - now);
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

const two = (value: number) => String(value).padStart(2, '0');

/**
 * Spanish unit labels for a countdown segment, singular when the value is
 * exactly one ("1 día", "1 hora"); the abbreviations don't inflect. A null
 * value (clock not yet running) reads as plural.
 */
const UNIT_LABELS = {
  days: ['día', 'días'],
  hours: ['hora', 'horas'],
  minutes: ['min', 'min'],
  seconds: ['seg', 'seg'],
} as const;

type CountdownUnit = keyof typeof UNIT_LABELS;

const unitLabel = (unit: CountdownUnit, value: number | null) =>
  UNIT_LABELS[unit][value === 1 ? 0 : 1];

/** "HH:MM:SS" of what remains within the day. */
const formatClock = ({ hours, minutes, seconds }: Remaining) =>
  `${two(hours)}:${two(minutes)}:${two(seconds)}`;

export type { CountdownUnit, Remaining };
export {
  formatClock,
  openingInstant,
  remainingTo,
  todayInMadrid,
  two,
  unitLabel,
};
