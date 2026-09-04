'use client';

import { type Remaining, two, unitLabel } from '@/lib/countdown';
import { useCountdown } from '@/lib/use-countdown';

/**
 * The Doors of Durin, traced in ithildin: the /council waiting state. A
 * live countdown to 14:00 (Madrid) of the event's first day is carved inside the
 * arch; when the hour arrives the door "opens" (MELLON), and with no
 * edition announced the tracing dims and the stars keep quiet.
 */

const Star = ({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) => {
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 4) * i;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${cx + radius * Math.sin(angle)},${cy - radius * Math.cos(angle)}`;
  }).join(' ');
  return <polygon className="d-ithildin-glow" fill="#dce6ee" points={points} />;
};

const mono = 'var(--font-jetbrains), monospace';
const cinzel = 'var(--font-cinzel), Georgia, serif';

/** The last week: the drums are heard and the door beats. */
const DRUMS_WITHIN_DAYS = 7;

const isDrumming = (left: Remaining) =>
  !isOpen(left) && left.days <= DRUMS_WITHIN_DAYS;

/** The hour has come: nothing left on the clock. */
const isOpen = ({ days, hours, minutes, seconds }: Remaining) =>
  days === 0 && hours === 0 && minutes === 0 && seconds === 0;

/** What the arch shows: counting down, wide open, or waiting for a date. */
const ArchContent = ({
  left,
  target,
}: {
  left: Remaining | null;
  target: string | null;
}) => {
  if (!target) {
    return (
      <g fontFamily={mono} textAnchor="middle">
        <text
          fill="#dce6ee"
          fontFamily={cinzel}
          fontSize="34"
          fontWeight="700"
          letterSpacing="3"
          x="230"
          y="305"
        >
          AÚN SIN FECHA
        </text>
        <text fill="#8b99a6" fontSize="14" letterSpacing="5" x="230" y="353">
          LAS ESTRELLAS CALLAN
        </text>
      </g>
    );
  }
  if (left !== null && isOpen(left)) {
    return (
      <g fontFamily={mono} textAnchor="middle">
        <text fill="#dce6ee" fontSize="15" letterSpacing="6" x="230" y="265">
          LA PUERTA ESTÁ ABIERTA
        </text>
        <text
          className="d-ithildin-glow"
          fill="#eef4fa"
          fontFamily={cinzel}
          fontSize="64"
          fontWeight="900"
          letterSpacing="6"
          x="230"
          y="361"
        >
          MELLON
        </text>
        <text fill="#8b99a6" fontSize="14" letterSpacing="5" x="230" y="409">
          EL CONCILIO ESTÁ REUNIDO
        </text>
      </g>
    );
  }
  if (left !== null && isDrumming(left)) {
    return (
      <g fontFamily={mono} textAnchor="middle">
        {/* Smaller than it could be: it heaves to 110% on each beat and
            must stay clear of the inner arch at its widest. */}
        <text
          className="d-ithildin-glow d-drums-beat"
          fill="#eef4fa"
          fontFamily={cinzel}
          fontSize="32"
          fontWeight="900"
          letterSpacing="2"
          x="230"
          y="326"
        >
          TAMBORES.
        </text>
        <text
          className="d-drums-beat-soft"
          fill="#dce6ee"
          fontSize="11.5"
          letterSpacing="3"
          x="230"
          y="360"
        >
          TAMBORES EN LO PROFUNDO
        </text>
      </g>
    );
  }
  return (
    <g fontFamily={mono} textAnchor="middle">
      <text fill="#dce6ee" fontSize="16" letterSpacing="6" x="230" y="252">
        FALTAN
      </text>
      <text
        className="d-ithildin-glow"
        fill="#eef4fa"
        fontFamily={cinzel}
        fontSize="104"
        fontWeight="900"
        x="230"
        y="364"
      >
        {left ? left.days : '——'}
      </text>
      <text fill="#aeb9c2" fontSize="15" letterSpacing="5" x="230" y="398">
        {unitLabel('days', left?.days ?? null).toUpperCase()}
      </text>
    </g>
  );
};

/**
 * Under the threshold: days, hours, minutes and seconds, each
 * centred on a fixed x so the row never shifts as the digits change, with
 * a hair-thin label under each so "00" reads as hours, not as a stopwatch
 * stuck at zero.
 */
const CLOCK_SEGMENTS = [152, 204, 256, 308] as const;

const Clock = ({ left }: { left: Remaining | null }) => {
  if (left && isOpen(left)) {
    return null;
  }
  // In the last week it beats along with the inscription's caption.
  const beat = left && isDrumming(left) ? 'd-drums-beat-soft' : undefined;
  const mask = (value: number) => (left ? two(value) : '——');
  const values = [
    { unit: 'days', value: left ? String(left.days) : '——' },
    { unit: 'hours', value: mask(left?.hours ?? 0) },
    { unit: 'minutes', value: mask(left?.minutes ?? 0) },
    { unit: 'seconds', value: mask(left?.seconds ?? 0) },
  ] as const;
  return (
    <g className={beat} fontFamily={mono} textAnchor="middle">
      {values.map(({ unit, value }, index) => {
        const x = CLOCK_SEGMENTS[index] ?? 230;
        const previous = CLOCK_SEGMENTS[index - 1];
        const label = unitLabel(unit, left ? left[unit] : null).toUpperCase();
        return (
          <g key={unit}>
            {previous !== undefined ? (
              <text
                fill="#8b99a6"
                fontSize="20"
                opacity="0.6"
                x={(previous + x) / 2}
                y="508"
              >
                :
              </text>
            ) : null}
            <text fill="#8b99a6" fontSize="20" x={x} y="508">
              {value}
            </text>
            <text fill="#6b7883" fontSize="8" letterSpacing="2" x={x} y="526">
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const DurinDoor = ({ target }: { target: string | null }) => {
  const left = useCountdown(target);
  const drums = left !== null && isDrumming(left);
  return (
    <div
      className={`relative w-[min(88vw,460px)] lg:w-135 xl:w-142 ${target ? '' : 'opacity-60 saturate-50'}`}
    >
      <svg
        className={`block w-full ${drums ? 'd-ithildin-drums' : ''}`}
        role="img"
        viewBox="0 18 460 528"
      >
        <title>La Puerta de Durin</title>
        <defs>
          <path
            d="M74 470 V236 C74 116 156 62 230 62 C304 62 386 116 386 236 V470"
            id="dsn-door-arch-path"
          />
          {/* Parallel rail ~18px outside the arch, so the inscription floats clear of the stroke. */}
          <path
            d="M56 470 V232 C56 104 150 44 230 44 C310 44 404 104 404 232 V470"
            id="dsn-door-text-path"
          />
        </defs>
        <g
          className="d-ithildin"
          fill="none"
          stroke="#aeb9c2"
          strokeLinecap="round"
          strokeWidth="2"
        >
          {/* Arch, threshold, inner arch and the seam of the two doors */}
          <use href="#dsn-door-arch-path" />
          <path
            d="M96 470 V240 C96 132 168 84 230 84 C292 84 364 132 364 240 V470"
            opacity="0.55"
          />
          <path d="M60 470 H400" />
          <path
            className="d-ithildin-glow"
            d="M230 106 V470"
            opacity="0.4"
            strokeDasharray="2 7"
            strokeWidth="1.5"
          />
          {/* The two holly trees, stylised */}
          <path
            d="M74 442 C52 406 46 364 58 322 M58 322 C40 328 34 340 30 354 M58 322 C64 304 60 284 52 268 M52 268 C38 272 30 282 26 294 M52 268 C58 250 70 238 84 230"
            opacity="0.8"
          />
          <path
            d="M386 442 C408 406 414 364 402 322 M402 322 C420 328 426 340 430 354 M402 322 C396 304 400 284 408 268 M408 268 C422 272 430 282 434 294 M408 268 C402 250 390 238 376 230"
            opacity="0.8"
          />
          {/* Crown over the anvil-star */}
          <path
            d="M196 132 L204 116 L216 128 L230 110 L244 128 L256 116 L264 132 Z"
            opacity="0.9"
          />
        </g>
        {/* The star of the House of Fëanor and the crown's seven */}
        <Star cx={230} cy={168} r={13} />
        <Star cx={130} cy={192} r={6} />
        <Star cx={330} cy={192} r={6} />
        <Star cx={110} cy={252} r={5} />
        <Star cx={350} cy={252} r={5} />
        <Star cx={165} cy={150} r={5} />
        <Star cx={295} cy={150} r={5} />
        <text
          className="d-ithildin-glow"
          fill="#dce6ee"
          fontFamily={cinzel}
          fontSize="15"
          fontWeight="700"
          letterSpacing="4"
        >
          <textPath
            href="#dsn-door-text-path"
            startOffset="50%"
            textAnchor="middle"
          >
            · HABLA · AMIGO · Y · ENTRA ·
          </textPath>
        </text>
        <ArchContent left={left} target={target} />
        {target ? <Clock left={left} /> : null}
      </svg>
    </div>
  );
};

export { DurinDoor };
