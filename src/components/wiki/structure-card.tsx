import { panel } from '@/components/theme/primitives';
import { AbilityList, UpgradeList } from '@/components/wiki/ability-list';
import { StatStrip } from '@/components/wiki/stat-strip';
import { WikiImage } from '@/components/wiki/wiki-image';
import { STRUCTURE_KIND_LABELS } from '@/lib/wiki/labels';
import type { FactionPageData } from '@/server/wiki/queries';

type Structure = FactionPageData['structures'][number];

/** A building: its game icon, cost and health per level, what it recruits, what it sells, what it casts. */
const StructureCard = ({ structure: s }: { structure: Structure }) => (
  <li className={`${panel} relative flex flex-col gap-3 overflow-hidden`}>
    {/* Wood-plank background, gold fillet and square portrait set buildings apart from the round-portrait unit cards. */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_39px,rgba(0,0,0,0.35)_39px_41px),repeating-linear-gradient(0deg,transparent_0_6px,rgba(255,220,170,0.025)_6px_7px,transparent_7px_11px,rgba(0,0,0,0.06)_11px_12px),linear-gradient(160deg,rgba(150,105,60,0.24),rgba(110,72,40,0.2)_50%,rgba(60,38,20,0.32))]"
    />
    <span
      aria-hidden
      className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-(--gold)/80 to-transparent"
    />
    <div className="relative flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        {s.imageUrl ? (
          <WikiImage
            alt=""
            className="m-1 size-14 shrink-0 rounded-sm border border-(--hair-gold) object-cover shadow-[0_0_0_3px_rgba(0,0,0,0.45),0_0_0_4px_rgba(201,165,87,0.4)]"
            src={s.imageUrl}
          />
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="d-display font-bold text-(--parchment) text-base uppercase leading-tight">
            {s.name}
          </span>
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-wider">
            {s.kind ? STRUCTURE_KIND_LABELS[s.kind] : ''}
            {s.maxCount ? ` · máx. ${s.maxCount}` : ''}
          </span>
        </div>
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
