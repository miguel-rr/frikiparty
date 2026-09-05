import { panel, panelGold } from '@/components/theme/primitives';
import { AbilityList } from '@/components/wiki/ability-list';
import { StatStrip } from '@/components/wiki/stat-strip';
import { WikiImage } from '@/components/wiki/wiki-image';
import type { FactionPageData } from '@/server/wiki/queries';

type Hero = FactionPageData['heroes'][number];

/** A hero as its in-game card: portrait, numbers, what it does, abilities by level. */
const HeroCard = ({ hero, ringHero }: { hero: Hero; ringHero: boolean }) => (
  <li
    className={`${ringHero ? panelGold : panel} flex flex-col gap-3 overflow-hidden`}
  >
    {hero.imageUrl ? (
      <WikiImage
        alt={hero.name}
        className="h-44 w-full object-cover object-top"
        src={hero.imageUrl}
      />
    ) : null}
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex items-start gap-3">
        {hero.portraitUrl ? (
          <WikiImage
            alt=""
            className="size-14 shrink-0 rounded-lg border border-(--hair-gold) object-cover"
            src={hero.portraitUrl}
          />
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="d-display font-bold text-(--gold-hi) text-lg uppercase leading-tight">
            {hero.name}
          </span>
          {hero.title ? (
            <span className="font-mono text-(--faded) text-2xs uppercase tracking-wider">
              {hero.title}
            </span>
          ) : null}
          <span className="mt-1 text-(--faded) text-xs">
            {hero.isSummon ? 'Invocado · ' : ''}
            {hero.recruitedAt ?? ''}
          </span>
        </div>
      </div>
      <StatStrip
        items={[
          { label: 'coste', value: hero.cost },
          { label: 'vida', value: hero.health },
          {
            label: 'tiempo',
            value: hero.buildTimeSeconds ? `${hero.buildTimeSeconds} s` : null,
          },
          { label: 'ataque', value: hero.attackType },
          {
            label: 'dura',
            value: hero.stats.durationS ? `${hero.stats.durationS} s` : null,
          },
        ]}
      />
      {hero.description ? (
        <p className="text-(--parchment)/90 text-sm">{hero.description}</p>
      ) : null}
      <AbilityList abilities={hero.abilities} />
    </div>
  </li>
);

export { HeroCard };
