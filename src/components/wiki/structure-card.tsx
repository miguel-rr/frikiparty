import { panel } from '@/components/theme/primitives';
import { AbilityList, UpgradeList } from '@/components/wiki/ability-list';
import { StatStrip } from '@/components/wiki/stat-strip';
import { WikiImage } from '@/components/wiki/wiki-image';
import { STRUCTURE_KIND_LABELS } from '@/lib/wiki/labels';
import type { FactionPageData } from '@/server/wiki/queries';

type Structure = FactionPageData['structures'][number];

/** A building: picture, cost and health per level, what it recruits, what it sells, what it casts. */
const StructureCard = ({ structure: s }: { structure: Structure }) => (
  <li className={`${panel} flex flex-col gap-3 overflow-hidden`}>
    {s.imageUrl ? (
      <WikiImage
        alt={s.name}
        className="h-36 w-full object-cover"
        src={s.imageUrl}
      />
    ) : null}
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex flex-col">
        <span className="d-display font-bold text-(--parchment) text-base uppercase leading-tight">
          {s.name}
        </span>
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-wider">
          {s.kind ? STRUCTURE_KIND_LABELS[s.kind] : ''}
          {s.maxCount ? ` · máx. ${s.maxCount}` : ''}
        </span>
      </div>
      <StatStrip
        items={[
          { label: 'coste', value: s.cost },
          {
            label: 'vida',
            value:
              s.healthByLevel.length > 1
                ? s.healthByLevel.join(' / ')
                : s.health,
          },
          {
            label: 'tiempo',
            value: s.buildTimeSeconds ? `${s.buildTimeSeconds} s` : null,
          },
        ]}
      />
      {s.description ? (
        <p className="text-(--parchment)/90 text-sm">{s.description}</p>
      ) : null}
      {s.bonus ? (
        <p className="text-(--moss) text-xs">
          <span className="font-mono text-3xs uppercase tracking-wider">
            bonus{' '}
          </span>
          {s.bonus}
        </p>
      ) : null}
      {s.produces.length > 0 ? (
        <p className="text-xs">
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            recluta{' '}
          </span>
          <span className="text-(--parchment)/85">{s.produces.join(', ')}</span>
        </p>
      ) : null}
      {s.upgrades.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            Mejoras y niveles
          </span>
          <UpgradeList upgrades={s.upgrades} />
        </div>
      ) : null}
      <AbilityList abilities={s.abilities} />
    </div>
  </li>
);

export { StructureCard };
