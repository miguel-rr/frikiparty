import {
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { cardSpecFor } from '@/lib/tournament/card-lore';

type Champions = {
  year: number;
  venueName: string | null;
  teamChampions: string[];
  individualChampion: string | null;
};

/** Hall of champions of the latest recorded edition, straight from the DB. */
const HomeChampions = ({
  champions,
  ringsByName,
}: {
  champions: Champions;
  ringsByName: Record<string, number>;
}) => (
  <Section id="champions">
    <SectionHeader
      eyebrowText={`Edición ${champions.year}`}
      lead="Los nombres quedan grabados aquí; los anillos, en el escalafón."
      title="Salón de los Campeones"
    />
    <div className="flex flex-col gap-10">
      <div className={`${panelGold} d-corners flex flex-col gap-7 p-6 sm:p-8`}>
        <div className="d-corner-b" />
        <div className="flex flex-col items-center gap-3 text-center">
          <span className={tag}>Campeones por equipos</span>
          {champions.venueName ? (
            <p className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
              Sede: {champions.venueName}
            </p>
          ) : null}
        </div>
        {/* Never an uneven 3+1: one column, 2+2, or (from lg) a centered row. */}
        <ul className="mx-auto grid max-w-[470px] grid-cols-1 place-items-center gap-5 sm:grid-cols-2 lg:flex lg:max-w-none lg:flex-wrap lg:justify-center sm:[&>li:last-child:nth-child(odd)]:col-span-2">
          {champions.teamChampions.map((name) => (
            <li key={name}>
              <PortraitCard
                card={cardSpecFor(name, ringsByName[name] ?? 0)}
                className="w-[235px] sm:w-[195px]"
              />
            </li>
          ))}
        </ul>
        <p className="text-center text-(--faded) text-sm italic">
          El equipo no tenía nombre; nadie olvidará a sus jugadores. Un anillo
          más para cada uno.
        </p>
      </div>
      {champions.individualChampion ? (
        <div className="flex flex-col items-center gap-4">
          <span className={tag}>Campeón individual</span>
          <PortraitCard
            card={cardSpecFor(
              champions.individualChampion,
              ringsByName[champions.individualChampion] ?? 0,
            )}
            className="w-[230px]"
          />
        </div>
      ) : null}
    </div>
  </Section>
);

export { HomeChampions };
