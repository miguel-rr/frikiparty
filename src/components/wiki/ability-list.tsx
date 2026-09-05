import { ABILITY_KIND_LABELS } from '@/lib/wiki/labels';
import type { Ability, Upgrade } from '@/lib/wiki/types';

/** Hotkey chip as the game shows it. */
const Key = ({ hotkey }: { hotkey: string | null }) =>
  hotkey ? (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-(--hair-gold) px-1 font-mono text-(--gold) text-3xs">
      {hotkey}
    </kbd>
  ) : null;

/** Abilities as the in-game card reads them: level, key, name, what it does. */
const AbilityList = ({ abilities }: { abilities: Ability[] }) => {
  if (abilities.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {abilities.map((a) => (
        <li className="flex gap-2" key={`${a.name}-${a.level ?? 0}`}>
          <span className="w-9 shrink-0 pt-px text-right font-mono text-(--faded) text-3xs uppercase">
            {a.level ? `Nv ${a.level}` : ''}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <strong className="text-(--parchment)">{a.name}</strong>
              <Key hotkey={a.hotkey} />
              <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                {ABILITY_KIND_LABELS[a.kind]}
              </span>
            </span>
            <span className="block text-(--parchment)/75">{a.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Purchasable upgrades with their price; `level` shows as the structure level they need. */
const UpgradeList = ({ upgrades }: { upgrades: Upgrade[] }) => {
  if (upgrades.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {upgrades.map((u) => (
        <li className="flex gap-2" key={u.name}>
          <span className="w-9 shrink-0 pt-px text-right font-mono text-(--gold) text-3xs">
            {u.cost ?? ''}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <strong className="text-(--parchment)">{u.name}</strong>
              <Key hotkey={u.hotkey} />
              {u.level ? (
                <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                  nivel {u.level}
                </span>
              ) : null}
            </span>
            <span className="block text-(--parchment)/75">{u.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

export { AbilityList, UpgradeList };
