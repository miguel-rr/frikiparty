import {
  CHAMPION_CARDS,
  INDIVIDUAL_CARD,
  LAST_EDITION,
} from '@/app/design/fixtures';
import {
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';

const Champions = () => (
  <Section id="champions">
    <SectionHeader
      eyebrowText={LAST_EDITION.edition}
      lead="Los nombres quedan grabados aquí; los anillos, en el escalafón."
      title="Salón de los Campeones"
    />
    <div className="flex flex-col gap-10">
      <div className={`${panelGold} d-corners flex flex-col gap-7 p-6 sm:p-8`}>
        <div className="d-corner-b" />
        <div className="flex flex-col items-center gap-3 text-center">
          <span className={tag}>Campeones por equipos</span>
          <p className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
            Sede: {LAST_EDITION.venue}
          </p>
        </div>
        {/* Never an uneven 3+1: one column, 2+2, or (from lg) a single
            centered row via flex. An odd trailing card centers itself. */}
        <ul className="mx-auto grid max-w-117.5 grid-cols-1 place-items-center gap-5 sm:grid-cols-2 lg:flex lg:max-w-none lg:flex-wrap lg:justify-center sm:[&>li:last-child:nth-child(odd)]:col-span-2">
          {CHAMPION_CARDS.map((card) => (
            <li key={card.name}>
              <PortraitCard card={card} className="w-58.75 sm:w-48.75" />
            </li>
          ))}
        </ul>
        <p className="text-center text-(--faded) text-sm italic">
          El equipo no tenía nombre; nadie olvidará a sus jugadores. Un anillo
          más para cada uno.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className={tag}>Campeón individual</span>
        <PortraitCard card={INDIVIDUAL_CARD} className="w-57.5" />
      </div>
    </div>
  </Section>
);

export { Champions };
