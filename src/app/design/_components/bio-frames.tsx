import { Almendra_Display, IM_Fell_English } from 'next/font/google';

import { BioParchment } from '@/components/players/bio-parchment';

import { Section, SectionHeader, tag } from '@/components/theme/primitives';

/**
 * Proposals for framing the player bio (the Red Book chronicle) so it
 * reads like an artifact rather than loose text. Three directions on the
 * same content; the raised cap on the first line's baseline stays.
 */

/* IM Fell ink; Almendra Display for the grand opening versal. */
const imFell = IM_Fell_English({ subsets: ['latin'], weight: '400' });
const almendraDisplay = Almendra_Display({ subsets: ['latin'], weight: '400' });

const SAMPLE = [
  'Cuando el concilio no era aún concilio sino un puñado de caminantes, él ya estaba allí, alzando la primera hoguera. Los elfos lo llaman Ruifindel, y en él no brilla la estrella del favorito: los augures nunca pronuncian su nombre, y sin embargo todos los caminos terminan en su corona.',
  'Pues tal es su don — no acaudilla a los grandes, sino que hace grandes a cuantos marchan bajo su estandarte, y el pastor que cabalga a su lado carga como un caballero de la Marca. Se cuenta que una vez los días se le negaron, y le bastó uno solo: entre el alba y el ocaso cupo entera su victoria.',
  'Habla poco, como hablan los sabios, y su silencio pesa más en el consejo que muchas voces juntas. Dos hermanos salieron de la misma casa: a él lo siguió la gloria, y al otro lo sigue una sombra que aún no tiene fin.',
] as const;

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

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23p)' opacity='0.55'/%3E%3C/svg%3E\")";

/**
 * Sepia IM Fell prose. The opening gets a grand rubricated versal (no box,
 * pure red ink); every following paragraph opens with a smaller red versal,
 * the way rubricators marked new sections.
 */
const InkProse = () => (
  <div className="flex flex-col gap-4">
    {SAMPLE.map((paragraph, index) => (
      <p
        className={`${imFell.className} hyphens-auto text-[#2b2113] text-base leading-relaxed sm:text-justify`}
        key={paragraph.slice(0, 16)}
      >
        {index === 0 ? (
          <span
            className={`${almendraDisplay.className} mr-1 inline-block align-baseline text-[#8f2f1f] text-[4rem] leading-[0.72] [text-shadow:0_0_1px_rgba(143,47,31,0.55)]`}
          >
            {paragraph.charAt(0)}
          </span>
        ) : (
          <span className="mr-0.5 text-[#8f2f1f] text-[1.35em] leading-none [text-shadow:0_0_1px_rgba(143,47,31,0.45)]">
            {paragraph.charAt(0)}
          </span>
        )}
        {paragraph.slice(1)}
      </p>
    ))}
  </div>
);

/** Night-palette prose (proposal B keeps it). */
const Prose = () => (
  <div className="flex flex-col gap-4">
    {SAMPLE.map((paragraph, index) => (
      <p
        className="hyphens-auto font-serif text-(--parchment) leading-relaxed sm:text-justify"
        key={paragraph.slice(0, 16)}
      >
        {index === 0 ? (
          <>
            <span className="d-display mr-2.5 inline-block border-(--hair-gold) border-2 bg-(--gold)/6 px-2 pt-1.5 pb-1 align-baseline font-black text-(--gold) text-5xl leading-[0.75]">
              {paragraph.charAt(0)}
            </span>
            {paragraph.slice(1)}
          </>
        ) : (
          paragraph
        )}
      </p>
    ))}
  </div>
);

/** Grain + foxing stains + vignette, layered over any parchment ground. */
const ParchmentSkin = () => (
  <>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
      style={{ backgroundImage: NOISE }}
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(38% 30% at 12% 88%, rgba(122,90,44,0.14) 0%, transparent 70%), radial-gradient(30% 24% at 88% 8%, rgba(122,90,44,0.1) 0%, transparent 70%), radial-gradient(20% 16% at 78% 82%, rgba(101,72,34,0.08) 0%, transparent 70%)',
      }}
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 shadow-[inset_0_0_46px_rgba(94,66,28,0.32)]"
    />
  </>
);

/* ─────────────────────── A · El folio del Libro Rojo ───────────────────── */

const FolioProposal = () => (
  <div className="mx-auto w-full max-w-2xl">
    <div
      className="relative rotate-[-0.5deg] rounded-sm px-8 py-9 shadow-[0_2px_3px_rgba(0,0,0,0.35),0_18px_44px_rgba(0,0,0,0.55)] sm:px-12 sm:py-10"
      style={{
        backgroundImage:
          'radial-gradient(115% 90% at 50% 6%, #f4ead0 0%, #e7d6ac 55%, #d3bc8d 100%)',
      }}
    >
      <ParchmentSkin />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-baseline justify-between border-[#8f2f1f]/35 border-b pb-2">
          <span className="font-bold font-mono text-2xs text-[#8f2f1f] uppercase tracking-4xl">
            De los grandes del concilio
          </span>
          <span className="font-mono text-2xs text-[#7a5c33] tracking-2xl">
            · fol. 121 ·
          </span>
        </div>
        <InkProse />
      </div>
    </div>
  </div>
);

/* ─────────────────────── B · Marginalia iluminada ──────────────────────── */

const VineBorder = () => (
  <svg
    aria-hidden="true"
    className="h-full w-6 text-(--gold) opacity-80"
    fill="none"
    preserveAspectRatio="none"
    role="presentation"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="1.3"
    viewBox="0 0 24 300"
  >
    <path d="M12 0 V300" opacity="0.55" />
    <path d="M12 30 Q2 40 12 50 Q22 60 12 70" />
    <path d="M12 120 Q22 130 12 140 Q2 150 12 160" />
    <path d="M12 210 Q2 220 12 230 Q22 240 12 250" />
    <circle cx="12" cy="15" fill="currentColor" r="2" stroke="none" />
    <circle cx="12" cy="95" fill="currentColor" r="1.5" stroke="none" />
    <circle cx="12" cy="185" fill="currentColor" r="1.5" stroke="none" />
    <circle cx="12" cy="285" fill="currentColor" r="2" stroke="none" />
  </svg>
);

const MarginaliaProposal = () => (
  <div className="mx-auto w-full max-w-2xl">
    <div className="flex gap-5 sm:gap-7">
      <div className="flex shrink-0 flex-col items-center self-stretch">
        <VineBorder />
      </div>
      <div className="flex flex-col gap-4">
        <Prose />
        {/* End-of-chapter flourish */}
        <svg
          aria-hidden="true"
          className="mx-auto mt-1 text-(--gold) opacity-70"
          fill="none"
          height="14"
          role="presentation"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.3"
          viewBox="0 0 120 14"
          width="120"
        >
          <path d="M0 7 H44 M76 7 H120" />
          <path d="M52 7 Q56 1 60 7 Q64 13 68 7" />
          <circle cx="60" cy="7" fill="currentColor" r="1.6" stroke="none" />
        </svg>
      </div>
    </div>
  </div>
);

/* ──────────────────────── C · La hoja de pergamino ─────────────────────── */

/**
 * One ancient sheet at photographic quality. The silhouette is carved by
 * an SVG displacement filter (two turbulence scales: broad undulation +
 * fine deckle), so the edge is organic, never a polygon. The scorched rim,
 * mottling and creases live on the filtered layer; the ink sits on an
 * unfiltered layer above so the text stays sharp.
 */
const ParchmentSheetProposal = () => (
  <div className="mx-auto w-full max-w-2xl">
    <BioParchment text={SAMPLE.join('\n\n')} />
  </div>
);

/* ────────────────────────────── Section ────────────────────────────────── */

const BioFrames = () => (
  <Section id="bio-frames">
    <SectionHeader
      eyebrowText="Ficha de jugador · La crónica"
      lead="Tres marcos para la biografía: mismo texto, misma capital alzada, tres artefactos distintos."
      title="El marco del Libro Rojo"
    />
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="Página suelta de vitela: grano, manchas de tiempo y tinta roja"
          text="Propuesta A · El folio del Libro Rojo"
        />
        <FolioProposal />
      </div>
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="Borde de vid iluminado y remate de capítulo, sin caja"
          text="Propuesta B · Marginalia iluminada"
        />
        <MarginaliaProposal />
      </div>
      <div className="flex flex-col gap-4">
        <ProposalLabel
          caption="Una sola hoja: borde tallado por ruido, cerco quemado, vitela moteada"
          text="Propuesta C · La hoja de pergamino"
        />
        <ParchmentSheetProposal />
      </div>
    </div>
  </Section>
);

export { BioFrames };
