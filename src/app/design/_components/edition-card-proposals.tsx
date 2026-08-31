import {
  PlayerBlazon,
  panel,
  RingGlyph,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';

/**
 * Three live proposals for the champions composition inside the /editions
 * cards, rendered over real scene art so legibility can be judged fairly.
 * A: blazons with the name beneath (heraldic, no boxes).
 * B: solid bottom band (art stays clean, names on their own strip).
 * C: flat names with a strong text shadow (no boxes at all).
 */

const CHAMPIONS = ['Cañete', 'Pingus', 'Richar', 'Yura'];
const INDIVIDUAL = 'Cordente';

type SceneSpec = { file: string; position: string };

const sceneStyle = ({ file, position }: SceneSpec) => ({
  backgroundImage: `linear-gradient(180deg, rgba(10,15,12,0.78) 0%, rgba(10,15,12,0.58) 45%, rgba(10,15,12,0.84) 100%), url(/design/scenes/${file}.jpg)`,
  backgroundPosition: position,
  backgroundSize: 'cover',
});

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

const CardHeader = () => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="d-display d-gold-text font-black text-2xl tracking-wide">
      2025
    </span>
    <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
      Sede: El huertar de Valentín
    </span>
  </div>
);

const nameShadow =
  '[text-shadow:0_1px_8px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]';

/**
 * A — heraldic composition: tall blazons with the name beneath. From md
 * the team group sits left and the individual champion right; below md
 * everything centers so wrapped rows never pile up ragged.
 */
const VariantA = () => (
  <div
    className={`${panel} flex flex-col gap-4 p-5 sm:p-6`}
    style={sceneStyle({ file: 'black-dragon', position: 'center 35%' })}
  >
    <CardHeader />
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="flex flex-col items-center gap-3">
        <span className={label}>
          <RingGlyph size={13} /> Campeones
        </span>
        {/* 2-per-row below sm (odd last one centered) — never a ragged 3+1. */}
        <ul className="grid grid-cols-2 justify-items-center gap-x-7 gap-y-4 sm:flex sm:flex-wrap sm:justify-center [&>li:last-child:nth-child(odd)]:col-span-2">
          {CHAMPIONS.map((name) => (
            <li
              className="flex w-[70px] flex-col items-center gap-2"
              key={name}
            >
              <PlayerBlazon name={name} size="lg" />
              <span className={`font-bold text-sm ${nameShadow}`}>{name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-center gap-3">
        <span className={label}>
          <RingGlyph size={11} tone="solitaire" /> Campeón individual
        </span>
        <div className="flex w-[70px] flex-col items-center gap-2">
          <PlayerBlazon champion name={INDIVIDUAL} size="lg" />
          <span className={`font-bold text-(--gold-hi) text-sm ${nameShadow}`}>
            {INDIVIDUAL}
          </span>
        </div>
      </div>
    </div>
  </div>
);

/** B — solid nameplate band at the card's foot; art stays untouched above. */
const VariantB = () => (
  <div
    className={`${panel} flex flex-col overflow-hidden p-0`}
    style={sceneStyle({ file: 'soria-moria', position: 'center 30%' })}
  >
    <div className="flex min-h-36 flex-col justify-start p-5 sm:p-6">
      <CardHeader />
    </div>
    <div className="flex flex-col gap-2.5 border-(--hair-gold) border-t bg-(--panel) px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className={label}>
          <RingGlyph size={13} /> Campeones
        </span>
        {CHAMPIONS.map((name) => (
          <span
            className="flex items-center gap-2 font-bold text-sm"
            key={name}
          >
            <PlayerBlazon name={name} size="sm" />
            {name}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className={label}>
          <RingGlyph size={11} tone="solitaire" /> Campeón individual
        </span>
        <span className="flex items-center gap-2 font-bold text-(--gold-hi) text-sm">
          <PlayerBlazon name={INDIVIDUAL} size="sm" />
          {INDIVIDUAL}
        </span>
      </div>
    </div>
  </div>
);

/** C — flat names over the art, strong shadow, zero boxes. */
const VariantC = () => (
  <div
    className={`${panel} flex flex-col gap-4 p-5 sm:p-6`}
    style={sceneStyle({ file: 'excalibur', position: 'center 55%' })}
  >
    <CardHeader />
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className={label}>
          <RingGlyph size={13} /> Campeones
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {CHAMPIONS.map((name) => (
            <span
              className="flex items-center gap-2 font-bold text-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]"
              key={name}
            >
              <PlayerBlazon name={name} size="sm" />
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>
          <RingGlyph size={11} tone="solitaire" /> Campeón individual
        </span>
        <span className="flex items-center gap-2 self-start font-bold text-(--gold-hi) text-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]">
          <PlayerBlazon name={INDIVIDUAL} size="sm" />
          {INDIVIDUAL}
        </span>
      </div>
    </div>
  </div>
);

const EditionCardProposals = () => (
  <Section id="edition-cards">
    <SectionHeader
      eyebrowText="Ediciones · Composición de campeones"
      lead="Tres formas de asentar a los campeones sobre el arte de las tarjetas. Misma edición, tres tratamientos."
      title="Tres Propuestas"
    />
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className={tag}>A · Blasones con nombre debajo</span>
        <VariantA />
      </div>
      <div className="flex flex-col gap-3">
        <span className={tag}>B · Banda inferior sólida</span>
        <VariantB />
      </div>
      <div className="flex flex-col gap-3">
        <span className={tag}>C · Nombres planos con sombra</span>
        <VariantC />
      </div>
    </div>
  </Section>
);

export { EditionCardProposals };
