import { Almendra_Display, IM_Fell_English } from 'next/font/google';

import { tag } from '@/components/theme/primitives';

/**
 * Shared pieces for the parchment-edge proposals: the sample chronicle,
 * the rubricated ink and the surface textures — all identical to the live
 * component, so only the edge changes between proposals.
 */

const imFell = IM_Fell_English({ subsets: ['latin'], weight: '400' });
const almendraDisplay = Almendra_Display({ subsets: ['latin'], weight: '400' });

const SAMPLE = [
  'Cuando el concilio no era aún concilio sino un puñado de caminantes, él ya estaba allí, alzando la primera hoguera. Los elfos lo llaman Ruifindel, y en él no brilla la estrella del favorito: los augures nunca pronuncian su nombre, y sin embargo todos los caminos terminan en su corona.',
  'Pues tal es su don — no acaudilla a los grandes, sino que hace grandes a cuantos marchan bajo su estandarte, y el pastor que cabalga a su lado carga como un caballero de la Marca. Se cuenta que una vez los días se le negaron, y le bastó uno solo: entre el alba y el ocaso cupo entera su victoria.',
  'Habla poco, como hablan los sabios, y su silencio pesa más en el consejo que muchas voces juntas. Dos hermanos salieron de la misma casa: a él lo siguió la gloria, y al otro lo sigue una sombra que aún no tiene fin.',
] as const;

/** Fine paper grain. */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23p)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Broad vellum mottling (the hide's uneven translucency). */
const MOTTLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='4' seed='19'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='420' height='420' filter='url(%23m)' opacity='0.75'/%3E%3C/svg%3E\")";

/** Rubricated IM Fell prose, unfiltered so it stays razor sharp. */
const Ink = ({ className = '' }: { className?: string }) => (
  <div className={`relative flex flex-col gap-4 ${className}`}>
    {SAMPLE.map((paragraph, index) => (
      <p
        className={`${imFell.className} hyphens-auto text-[#2b2113] text-base leading-relaxed sm:text-justify`}
        key={paragraph.slice(0, 16)}
      >
        {index === 0 ? (
          <span
            className={`${almendraDisplay.className} -mr-2 inline-block align-baseline text-[#8f2f1f] text-[4rem] leading-[0.72] [text-shadow:0_0_1px_rgba(143,47,31,0.55)]`}
          >
            {paragraph.charAt(0)}
          </span>
        ) : (
          <span className="-mr-[0.04rem] text-[#8f2f1f] text-[1.35em] leading-none [text-shadow:0_0_1px_rgba(143,47,31,0.45)]">
            {paragraph.charAt(0)}
          </span>
        )}
        {paragraph.slice(1)}
      </p>
    ))}
  </div>
);

const ProposalLabel = ({
  caption,
  text,
}: {
  caption: string;
  text: string;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className={tag}>{text}</span>
    <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
      {caption}
    </span>
  </div>
);

export { Ink, MOTTLE, NOISE, ProposalLabel, SAMPLE };
