import Link from 'next/link';

import { panel } from '@/components/theme/primitives';
import { Keycap } from '@/components/wiki/hotkey-board';
import type { GuideSection, HotkeyGroup } from '@/lib/wiki/guides/types';

/** "Empieza aquí" in cards: one line per section, each opening it in the full guide. */
const StartSummary = ({
  sections,
  slug,
}: {
  sections: GuideSection[];
  slug: string;
}) => (
  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {sections.map((s, i) => (
      <li key={s.id}>
        <Link
          className={`${panel} group flex h-full gap-3 p-4 transition-colors hover:border-(--gold)`}
          href={`/games/${slug}/guide#${s.id}`}
        >
          <span className="d-display w-6 shrink-0 font-bold text-(--gold)/70 text-lg leading-tight">
            {i + 1}
          </span>
          <span className="flex flex-col gap-1">
            <span className="d-display font-bold text-(--gold-hi) uppercase leading-tight group-hover:text-(--gold-hi)">
              {s.title}
            </span>
            <span className="text-(--parchment)/85 text-sm leading-snug">
              {s.summary}
            </span>
          </span>
        </Link>
      </li>
    ))}
  </ul>
);

/** The shortcuts marked essential, as a compact grid of keycaps. */
const EssentialHotkeys = ({ groups }: { groups: HotkeyGroup[] }) => {
  const essentials = groups.flatMap((g) =>
    g.entries.filter((e) => e.essential),
  );
  return (
    <div className={`${panel} p-4 sm:p-5`}>
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {essentials.map((e) => (
          <li
            className="flex items-center justify-between gap-3"
            key={e.action}
          >
            <span className="text-(--parchment) text-sm leading-snug">
              {e.action}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {e.keys[0]?.map((key, j) => (
                <span className="flex items-center gap-1" key={key}>
                  {j > 0 ? (
                    <span className="text-(--faded) text-[0.65rem]">+</span>
                  ) : null}
                  <Keycap label={key} />
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { EssentialHotkeys, StartSummary };
