import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  PlayerBlazon,
  panel,
  panelGold,
  RingGlyph,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { formatDateRange } from '@/lib/dates';
import { siteFlags } from '@/lib/site-flags';
import { api } from '@/trpc/server';

export const metadata: Metadata = { title: 'Ediciones — Frikiparty' };

const STATUS_TEXT = {
  live: 'En juego',
  upcoming: 'Próxima edición',
} as const;

/**
 * Card backdrops: public-domain art from Wikimedia Commons in Middle-earth
 * spirit, all naturally dark. Two families, interleaved for variety:
 * romantic paintings (John Martin, Böcklin, Joseph Wright, C. D.
 * Friedrich, Luca Giordano) and the illustrators behind Tolkien's visual
 * tradition — Arthur Rackham (the Ring of the Nibelung, Nibelheim's
 * dwarves), Ferdinand Leeke and A. P. Ryder (Wagner scenes), N. C. Wyeth
 * (The Boy's King Arthur), Viktor Vasnetsov (dragons and bogatyrs) and
 * the Nordic troll painters Kittelsen and Bauer. A scene never repeats
 * within 32 consecutive cards.
 */
/**
 * `position` frames the image's important area (CSS background-position);
 * `zoom` widens the image beyond the card (percentage of card width) to
 * crop away scanned paper margins on engravings and book plates.
 */
type Scene = { file: string; alt: string; position?: string; zoom?: number };

const SCENES: Scene[] = [
  {
    file: 'crossroads',
    alt: 'El caballero en la encrucijada',
    position: 'center 45%',
  },
  {
    file: 'black-dragon',
    alt: 'El dragón negro sobre el héroe',
    position: 'center 35%',
  },
  {
    file: 'soria-moria',
    alt: 'El palacio dorado a lo lejos',
    position: 'center 30%',
  },
  {
    file: 'excalibur',
    alt: 'La espada surgiendo del lago',
    position: 'center 55%',
  },
  {
    file: 'forest-troll',
    alt: 'El troll del bosque bajo la luna',
    position: 'center 55%',
  },
  {
    file: 'hero-forge',
    alt: 'La espada reforjada en la caverna',
    position: 'center 32%',
  },
  {
    file: 'watcher-water',
    alt: 'El vigilante del agua',
    position: 'center 42%',
  },
  { file: 'wrath', alt: 'Paisaje de fuego y ruina', position: 'center 45%' },
  {
    file: 'dwarf-hoard',
    alt: 'El tesoro de los enanos en la caverna',
    position: 'center 60%',
    zoom: 106,
  },
  { file: 'dragon', alt: 'El dragón en su guarida', position: 'center 35%' },
  {
    file: 'echo',
    alt: 'La barca en el lago entre montañas',
    position: 'center 72%',
  },
  {
    file: 'last-battle',
    alt: 'La última batalla al ocaso',
    position: 'center 62%',
  },
  {
    file: 'nibelheim',
    alt: 'Los enanos bajo el árbol retorcido',
    position: 'center 65%',
    zoom: 106,
  },
  {
    file: 'deep-forest',
    alt: 'El corazón verde del bosque',
    position: 'center 60%',
  },
  {
    file: 'trolls-hall',
    alt: 'La princesa entre trolls',
    position: 'center 76%',
    zoom: 106,
  },
  {
    file: 'forge-volcano',
    alt: 'La fragua en el corazón del volcán',
    position: 'center 45%',
  },
  {
    file: 'night-rider',
    alt: 'El jinete junto al río a la luz de la luna',
    position: 'center 55%',
  },
  {
    file: 'giants-quarrel',
    alt: 'La pelea de los gigantes',
    position: 'center 30%',
    zoom: 108,
  },
  {
    file: 'sword-hall',
    alt: 'La espada en el salón oscuro',
    position: 'center 40%',
  },
  { file: 'marshes', alt: 'La isla de los muertos', position: 'center 45%' },
  {
    file: 'three-riders',
    alt: 'Los tres jinetes oteando la frontera',
    position: 'center 45%',
  },
  {
    file: 'ash-troll',
    alt: 'El troll asomando sobre el bosque',
    position: 'center 40%',
  },
  {
    file: 'pandemonium',
    alt: 'La fortaleza del enemigo',
    position: 'center 45%',
  },
  {
    file: 'norns',
    alt: 'Las hilanderas del destino',
    position: 'center 45%',
    zoom: 106,
  },
  {
    file: 'knights-parley',
    alt: 'Parlamento de caballeros ante el castillo',
    position: 'center 45%',
  },
  {
    file: 'dark-tarn',
    alt: 'El estanque oscuro del bosque',
    position: 'center 58%',
  },
  { file: 'grotto', alt: 'Una gruta en penumbra', position: 'center 55%' },
  {
    file: 'sword-forged',
    alt: 'La espada recién forjada',
    position: 'center 30%',
    zoom: 106,
  },
  {
    file: 'oakwood',
    alt: 'Bosque de robles en la niebla',
    position: 'center 52%',
  },
  {
    file: 'wild-wood',
    alt: 'El corazón del bosque salvaje',
    position: 'center 35%',
    zoom: 106,
  },
  { file: 'volcano', alt: 'La montaña en erupción', position: 'center 40%' },
  {
    file: 'troll-lurking',
    alt: 'El troll acechando en la costa',
    position: 'center 45%',
    zoom: 112,
  },
];

const sceneStyle = (scene: Scene) => ({
  backgroundImage: `linear-gradient(180deg, rgba(10,15,12,0.78) 0%, rgba(10,15,12,0.58) 45%, rgba(10,15,12,0.84) 100%), url(/design/scenes/${scene.file}.jpg)`,
  backgroundPosition: scene.position ?? 'center',
  backgroundSize: scene.zoom ? `${scene.zoom}% auto` : 'cover',
});

type EditionItem =
  Awaited<ReturnType<typeof api.edition.list>> extends (infer T)[] ? T : never;

const championsLabel =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

const nameShadow =
  '[text-shadow:0_1px_8px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]';

/** Heraldic champion mark: tall blazon with the name beneath, no boxes. */
const ChampionMark = ({
  champion,
  gold = false,
}: {
  champion: { name: string; slug: string };
  gold?: boolean;
}) => (
  <Link
    className="group flex w-[70px] flex-col items-center gap-2"
    href={`/players/${champion.slug}`}
  >
    <PlayerBlazon champion={gold} name={champion.name} size="lg" />
    <span
      className={`font-bold text-sm ${gold ? 'text-(--gold-hi)' : ''} ${nameShadow} transition-colors group-hover:text-(--gold)`}
    >
      {champion.name}
    </span>
  </Link>
);

const EditionCard = ({
  edition,
  scene,
}: {
  edition: EditionItem;
  scene: Scene;
}) => {
  const running = edition.status !== 'past';
  return (
    <div
      className={`${running ? panelGold : panel} flex flex-col gap-4 p-5 sm:p-6`}
      style={sceneStyle(scene)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="d-display d-gold-text font-black text-2xl tracking-wide">
          {edition.label}
        </span>
        {running ? (
          <span className={tag}>
            {STATUS_TEXT[edition.status as 'live' | 'upcoming']}
          </span>
        ) : null}
        {edition.venueName ? (
          <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
            Sede: {edition.venueName}
          </span>
        ) : null}
      </div>
      {running ? (
        <p className="text-(--faded)">
          {edition.startsAt && edition.endsAt
            ? `${formatDateRange(edition.startsAt, edition.endsAt)}. `
            : null}
          La próxima cita del concilio. Los campeones aún están por forjar.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
          {edition.teamChampions.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <span className={championsLabel}>
                <RingGlyph size={13} /> Campeones
              </span>
              {/* 2-per-row below sm (odd last one centered) — never a ragged 3+1. */}
              <ul className="grid grid-cols-2 justify-items-center gap-x-7 gap-y-4 sm:flex sm:flex-wrap sm:justify-center [&>li:last-child:nth-child(odd)]:col-span-2">
                {edition.teamChampions.map((champion) => (
                  <li key={champion.slug}>
                    <ChampionMark champion={champion} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-(--faded) text-sm italic">
              Los anales de esta edición se perdieron en la Cuenta Larga.
            </p>
          )}
          {edition.individualChampion ? (
            <div className="flex flex-col items-center gap-3">
              <span className={championsLabel}>
                <RingGlyph size={11} tone="solitaire" /> Campeón individual
              </span>
              <ChampionMark champion={edition.individualChampion} gold />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const EditionsPage = async () => {
  if (!siteFlags.editionsPage) {
    notFound();
  }
  const editions = await api.edition.list();

  return (
    <SiteShell>
      <main>
        <Section id="editions">
          <SectionHeader
            eyebrowText="Crónica · Desde 2005"
            lead="Cada año, una casa rural, un torneo y un puñado de anillos. Esta es la cuenta de todas las ediciones del concilio."
            title="Las Ediciones"
          />
          {editions.length > 0 ? (
            <ol className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 border-(--hair-gold) border-l pl-6 sm:pl-10">
              {editions.map((edition, index) => (
                <li className="relative" key={edition.id}>
                  <span
                    aria-hidden
                    className="absolute top-6 -left-[34px] grid size-4 place-items-center bg-(--night) sm:-left-[50px]"
                  >
                    <RingGlyph
                      size={16}
                      tone={edition.individualChampion ? 'solitaire' : 'gold'}
                    />
                  </span>
                  <EditionCard
                    edition={edition}
                    scene={SCENES[index % SCENES.length] as Scene}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center text-(--faded)">
              Todavía no hay ediciones registradas.
            </p>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default EditionsPage;
