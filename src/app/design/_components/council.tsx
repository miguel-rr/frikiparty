'use client';

import { NEXT_EVENT } from '@/app/design/fixtures';
import { DurinDoor, two, useCountdown } from '@/components/council/durin-door';
import {
  linkGold,
  RingGlyph,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';

/**
 * Waiting-state proposals for /council: no tournament running, so the page
 * announces the next event and counts down to noon of day one. Three art
 * directions on the same content — fire (the beacons), ithildin (Durin's
 * door) and parchment (the Red Book) — sharing one live countdown.
 */

/** Noon of the event's first day: the fire is lit at 12:00. */
const TARGET_ISO = '2026-11-12T12:00:00';

const ProposalLabel = ({
  caption,
  text,
}: {
  caption: string;
  text: string;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className={tag}>{text}</span>
    <span className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.15em]">
      {caption}
    </span>
  </div>
);

const HowToArrive = () => (
  <a
    className={linkGold}
    href={NEXT_EVENT.mapsUrl}
    rel="noreferrer"
    target="_blank"
  >
    Cómo llegar →
  </a>
);

/* ────────────────────────────── A · Las almenaras ───────────────────────── */

const Flame = ({ delay, size }: { delay: number; size: number }) => (
  <svg
    aria-hidden="true"
    className="d-flicker origin-bottom"
    height={size * 1.35}
    style={{ animationDelay: `${delay}s` }}
    viewBox="0 0 24 32"
    width={size}
  >
    <path
      d="M12 1 C13 8 19 10 19 18 A7 7 0 0 1 5 18 C5 12 9 10 9 6 C10.5 8 12 9.5 12.5 12 C14 9 12 4 12 1 Z"
      fill="url(#dsn-stat-ember)"
    />
    <path
      d="M12 12 C13 15 15.5 16 15.5 20 A3.5 3.5 0 0 1 8.5 20 C8.5 17 11 16 11.4 14 C11.7 15 12.2 15.6 12.3 16.4 C12.8 15 12 13.5 12 12 Z"
      fill="#f6e2a4"
      opacity="0.9"
    />
  </svg>
);

const BeaconsProposal = () => {
  const left = useCountdown(TARGET_ISO);
  const slots = [
    { label: 'días', value: left ? String(left.days) : '——' },
    { label: 'horas', value: left ? two(left.hours) : '——' },
    { label: 'min', value: left ? two(left.minutes) : '——' },
    { label: 'seg', value: left ? two(left.seconds) : '——' },
  ];
  return (
    <div className="flex flex-col items-center gap-8 py-6 text-center">
      {/* The beacon line: Amon Dîn answers Minas Tirith. */}
      <div className="flex items-end gap-5 sm:gap-8">
        {[14, 18, 24, 34, 24, 18, 14].map((size, index) => (
          <Flame
            delay={index * 0.45}
            key={`${size}-${String(index)}`}
            size={size}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <span className="font-bold font-mono text-(--ember) text-[0.66rem] uppercase tracking-[0.35em]">
          El Concilio · Edición 2026
        </span>
        <h3 className="d-display d-gold-text max-w-[22ch] font-black text-4xl uppercase tracking-wide sm:text-5xl">
          Las almenaras están encendidas
        </h3>
        <p className="max-w-[46ch] text-(--faded)">
          Gondor pide ayuda. El concilio acude a {NEXT_EVENT.venue} el{' '}
          {NEXT_EVENT.dates}; el fuego del torneo prende al mediodía.
        </p>
      </div>
      <div className="flex items-start gap-4 sm:gap-7">
        {slots.map((slot, index) => (
          <div className="flex items-start gap-4 sm:gap-7" key={slot.label}>
            {index > 0 ? (
              <span
                aria-hidden
                className="d-flicker pt-1 font-black font-mono text-(--ember) text-3xl sm:text-4xl"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                :
              </span>
            ) : null}
            <div className="flex flex-col items-center gap-1.5">
              <span className="d-display d-gold-text font-black text-5xl tabular-nums sm:text-6xl">
                {slot.value}
              </span>
              <span className="font-bold font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.3em]">
                {slot.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <HowToArrive />
    </div>
  );
};

/* ──────────────────────────── B · La Puerta de Durin ────────────────────── */

const DurinDoorProposal = () => (
  <div className="flex flex-col items-center gap-6 py-6">
    <DurinDoor target={TARGET_ISO} />
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="max-w-[46ch] text-(--faded)">
        La puerta se abre al mediodía del 12 de noviembre. Contraseña:{' '}
        <span className="font-bold text-(--silver) italic">mellon</span> — o
        presentarse en {NEXT_EVENT.venue}, {NEXT_EVENT.venueArea}.
      </p>
      <HowToArrive />
    </div>
  </div>
);

/* ───────────────────────────── C · El Libro Rojo ────────────────────────── */

const NOVEMBER_ORDINALS = 'el duodécimo día de noviembre';

const RedBookProposal = () => {
  const left = useCountdown(TARGET_ISO);
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div
        className="relative w-full max-w-xl rotate-[-0.6deg] rounded-[4px] px-8 py-9 text-[#2a2013] shadow-[0_18px_40px_rgba(0,0,0,0.55)] sm:px-12 sm:py-11"
        style={{
          backgroundImage:
            'radial-gradient(120% 90% at 50% 8%, #f6ecd2 0%, #ead9b0 58%, #d8c294 100%)',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[4px] opacity-40 mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='7'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex flex-col gap-5">
          <span className="text-center font-bold font-mono text-[#8f2f1f] text-[0.6rem] uppercase tracking-[0.35em]">
            De la cuenta de los días
          </span>
          <p className="text-justify font-serif text-[1.05rem] leading-relaxed">
            <span
              className="float-left mt-1 mr-3 border-2 border-[#8f2f1f] px-2.5 py-1 font-black text-5xl text-[#8f2f1f]"
              style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              F
            </span>
            altan{' '}
            <span className="font-bold text-[#8f2f1f] tabular-nums">
              {left ? left.days : '——'} días
            </span>{' '}
            para que el concilio vuelva a reunirse, esta vez bajo el techo de{' '}
            <span className="font-bold">{NEXT_EVENT.venue}</span>. La primera
            partida quedará escrita {NOVEMBER_ORDINALS}, al dar el mediodía, y
            que los Valar repartan suerte — aunque, como quedó anotado en
            crónicas anteriores, la suerte suele repartirla Richar.
          </p>
          <div className="flex items-end justify-between gap-4 border-[#8f2f1f]/30 border-t pt-4">
            <div className="flex flex-col">
              <span className="font-mono text-[#6b5335] text-[0.58rem] uppercase tracking-[0.22em]">
                Continuación del Libro Rojo · T.C. 2026
              </span>
              <span className="font-bold font-mono text-[#8f2f1f] text-sm tabular-nums">
                {left
                  ? `${left.days}d ${two(left.hours)}:${two(left.minutes)}:${two(left.seconds)}`
                  : '—'}
              </span>
            </div>
            {/* Wax seal with the ring pressed in */}
            <span
              className="relative grid size-14 shrink-0 place-items-center rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.35)]"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #b8452c 0%, #8f2f1f 55%, #5e1d12 100%)',
              }}
            >
              <RingGlyph size={22} />
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="max-w-[44ch] text-(--faded) text-sm">
          {NEXT_EVENT.dates} · {NEXT_EVENT.venue}
        </p>
        <HowToArrive />
      </div>
    </div>
  );
};

/* ────────────────────────────────── Section ─────────────────────────────── */

const Council = () => (
  <Section id="council">
    <SectionHeader
      eyebrowText="El Concilio · En espera"
      lead="La página del torneo cuando aún no se juega: anuncia la próxima cita y cuenta atrás hasta el mediodía del primer día. Tres direcciones sobre el mismo contenido."
      title="La Víspera"
    />
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="Fuego de guardia: la llamada a la que se acude"
          text="Propuesta A · Las almenaras"
        />
        <BeaconsProposal />
      </div>
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="Ithildin a la luz de la luna: solo se abre con la palabra justa"
          text="Propuesta B · La Puerta de Durin"
        />
        <DurinDoorProposal />
      </div>
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="La crónica anotada a pluma, con lacre y tinta roja"
          text="Propuesta C · El Libro Rojo"
        />
        <RedBookProposal />
      </div>
    </div>
  </Section>
);

export { Council };
