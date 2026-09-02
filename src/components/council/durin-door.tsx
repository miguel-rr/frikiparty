'use client';

import { useEffect, useState } from 'react';

/**
 * The Doors of Durin, traced in ithildin: the /council waiting state. A
 * live countdown to noon of the event's first day is carved inside the
 * arch; when the hour arrives the door "opens" (MELLON), and with no
 * edition announced the tracing dims and the stars keep quiet.
 */

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const remainingTo = (target: Date): Remaining => {
  const ms = Math.max(0, target.getTime() - Date.now());
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

/**
 * Ticks once per second, client-only: null until mounted so the static
 * markup (dashes) never mismatches a moving clock.
 */
const useCountdown = (targetIso: string | null): Remaining | null => {
  const [left, setLeft] = useState<Remaining | null>(null);
  useEffect(() => {
    if (!targetIso) {
      return;
    }
    const target = new Date(targetIso);
    setLeft(remainingTo(target));
    const timer = setInterval(() => setLeft(remainingTo(target)), 1000);
    return () => clearInterval(timer);
  }, [targetIso]);
  return left;
};

const two = (value: number) => String(value).padStart(2, '0');

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
  const open =
    left !== null &&
    left.days === 0 &&
    left.hours === 0 &&
    left.minutes === 0 &&
    left.seconds === 0;
  if (open) {
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
  return (
    <g fontFamily={mono} textAnchor="middle">
      <text fill="#dce6ee" fontSize="16" letterSpacing="6" x="230" y="238">
        FALTAN
      </text>
      <text
        className="d-ithildin-glow"
        fill="#eef4fa"
        fontFamily={cinzel}
        fontSize="104"
        fontWeight="900"
        x="230"
        y="350"
      >
        {left ? left.days : '——'}
      </text>
      <text fill="#aeb9c2" fontSize="15" letterSpacing="5" x="230" y="384">
        DÍAS
      </text>
      <text fill="#8b99a6" fontSize="20" letterSpacing="3" x="230" y="440">
        {left
          ? `${two(left.hours)}:${two(left.minutes)}:${two(left.seconds)}`
          : '——:——:——'}
      </text>
    </g>
  );
};

const DurinDoor = ({ target }: { target: string | null }) => {
  const left = useCountdown(target);
  return (
    <div
      className={`relative w-[min(88vw,460px)] lg:w-[540px] xl:w-[568px] ${target ? '' : 'opacity-60 saturate-50'}`}
    >
      <svg className="block w-full" role="img" viewBox="0 18 460 492">
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
      </svg>
    </div>
  );
};

export { DurinDoor, two, useCountdown };
