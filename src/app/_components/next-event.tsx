import Image from 'next/image';
import Link from 'next/link';

type NextEventProps = {
  edition: string;
  dates: string;
  venue: string;
  teams: number;
  players: number;
  href: string;
};

const NextEvent = ({
  edition,
  dates,
  venue,
  teams,
  players,
  href,
}: NextEventProps) => {
  const stats = [
    { key: 'Fecha', value: dates },
    { key: 'Lugar', value: venue },
    { key: 'Participantes', value: `${teams} equipos · ${players} jugadores` },
  ];

  return (
    <article className="relative flex min-h-[clamp(320px,46vw,460px)] items-end overflow-hidden rounded-2xl border border-hair">
      <Image
        alt=""
        className="object-cover object-[center_78%]"
        fill
        priority
        sizes="(max-width: 1180px) 100vw, 1100px"
        src="/images/quiraing.jpg"
      />

      <div className="relative w-full bg-gradient-to-t from-[rgba(10,12,24,0.94)] via-[rgba(10,12,24,0.72)] to-transparent p-5 sm:p-10">
        <h1 className="mb-5 font-display text-4xl uppercase leading-none tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] sm:text-[3.4rem]">
          {edition}
        </h1>

        <dl className="mb-6 flex flex-wrap gap-5 sm:gap-11">
          {stats.map(({ key, value }) => (
            <div key={key}>
              <dt className="mb-1 font-mono text-[0.64rem] text-muted uppercase tracking-widest">
                {key}
              </dt>
              <dd className="font-extrabold text-base">{value}</dd>
            </div>
          ))}
        </dl>

        <Link
          className="inline-block rounded-full bg-amber px-5 py-2.5 font-extrabold text-ground text-sm transition-opacity hover:opacity-90"
          href={href}
        >
          Ver detalles →
        </Link>
      </div>
    </article>
  );
};

export { NextEvent };
