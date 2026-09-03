/**
 * One clock for every countdown to the next edition: the fire is lit at
 * noon of day one, and what remains is counted in whole days, hours,
 * minutes and seconds by the visitor's own clock. The Doors of Durin and
 * the home hero both read from here so they never disagree by a day. Pure
 * on purpose: server pages import it too; the ticking hook lives beside it
 * in use-countdown.ts.
 */

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** The instant the door opens: noon (local time) of the edition's first day. */
const openingInstant = (startsAt: string) => `${startsAt}T12:00:00`;

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

export type { Remaining };
export { openingInstant, remainingTo };
