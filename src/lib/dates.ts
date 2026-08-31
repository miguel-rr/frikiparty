/** Spanish date-range formatting for edition dates (ISO yyyy-mm-dd inputs). */

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

const parts = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return { year, month, day };
};

/** "12–15 de noviembre de 2026" (or cross-month "30 de octubre – 2 de noviembre de 2026"). */
const formatDateRange = (startsAt: string, endsAt: string) => {
  const a = parts(startsAt);
  const b = parts(endsAt);
  const month = (m: number) => MONTHS_ES[m - 1] ?? '';
  if (a.month === b.month) {
    return `${a.day}–${b.day} de ${month(a.month)} de ${b.year}`;
  }
  return `${a.day} de ${month(a.month)} – ${b.day} de ${month(b.month)} de ${b.year}`;
};

/** "12–15 NOV 2026" for compact spots like the ring center. */
const formatShortDateRange = (startsAt: string, endsAt: string) => {
  const a = parts(startsAt);
  const b = parts(endsAt);
  const month = (m: number) =>
    (MONTHS_ES[m - 1] ?? '').slice(0, 3).toUpperCase();
  if (a.month === b.month) {
    return `${a.day}–${b.day} ${month(a.month)} ${b.year}`;
  }
  return `${a.day} ${month(a.month)} – ${b.day} ${month(b.month)} ${b.year}`;
};

export { formatDateRange, formatShortDateRange };
