import { panel } from '@/components/theme/primitives';
import { AbilityList, UpgradeList } from '@/components/wiki/ability-list';
import { CounterTags } from '@/components/wiki/counter-tags';
import { StatStrip } from '@/components/wiki/stat-strip';
import { WikiImage } from '@/components/wiki/wiki-image';
import { CATEGORY_LABELS } from '@/lib/wiki/labels';
import type { FactionPageData } from '@/server/wiki/queries';

type Unit = FactionPageData['units'][number];

/** A unit's full card: picture, cost/CP/health, where it comes from, counters, abilities and upgrades. */
const UnitCard = ({ unit }: { unit: Unit }) => (
  <li
    className={`${panel} flex flex-col gap-3 overflow-hidden`}
    id={`u-${unit.id}`}
  >
    {unit.imageUrl ? (
      <WikiImage
        alt={unit.name}
        className="h-40 w-full object-cover"
        src={unit.imageUrl}
      />
    ) : null}
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex items-start gap-3">
        {unit.portraitUrl ? (
          <WikiImage
            alt=""
            className="size-12 shrink-0 rounded-lg border border-(--hair) object-cover"
            src={unit.portraitUrl}
          />
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="d-display font-bold text-(--parchment) text-base uppercase leading-tight">
            {unit.name}
          </span>
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-wider">
            {CATEGORY_LABELS[unit.category]}
            {unit.isSummon ? ' · invocada' : ''}
            {unit.maxCount ? ` · máx. ${unit.maxCount}` : ''}
          </span>
          <span className="mt-1 text-(--faded) text-xs">
            {unit.recruitedAt ?? ''}
            {unit.requirements ? ` · ${unit.requirements}` : ''}
          </span>
        </div>
      </div>
      <StatStrip
        items={[
          { label: 'coste', value: unit.cost },
          { label: 'pm', value: unit.commandPoints },
          { label: 'vida', value: unit.health },
          {
            label: 'tiempo',
            value: unit.buildTimeSeconds ? `${unit.buildTimeSeconds} s` : null,
          },
          { label: 'ataque', value: unit.attackType },
          {
            label: 'dura',
            value: unit.stats.durationS ? `${unit.stats.durationS} s` : null,
          },
        ]}
      />
      <CounterTags strong={unit.strongAgainst} weak={unit.weakAgainst} />
      {unit.description ? (
        <p className="text-(--parchment)/90 text-sm">{unit.description}</p>
      ) : null}
      <AbilityList abilities={unit.abilities} />
      {unit.upgrades.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            Mejoras
          </span>
          <UpgradeList upgrades={unit.upgrades} />
        </div>
      ) : null}
    </div>
  </li>
);

export { UnitCard };
