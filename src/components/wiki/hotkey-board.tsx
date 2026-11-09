import { Fragment } from 'react';

import { panel } from '@/components/theme/primitives';
import type { HotkeyEntry, HotkeyGroup } from '@/lib/wiki/guides/types';

/** A key as a little raised cap: gold legend, darker lip at the bottom. */
const Keycap = ({ label }: { label: string }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center whitespace-nowrap rounded-md border border-(--hair-gold) border-b-[3px] bg-linear-to-b from-[#2b3027] to-[#161a14] px-1.5 font-bold font-mono text-(--gold-hi) text-[0.65rem] leading-none shadow-[inset_0_1px_0_#f0d48a26,0_2px_6px_#00000059]">
    {label}
  </kbd>
);

/** Alternatives side by side ("/"), each a chord of keys joined by "+". */
const Keys = ({ keys }: { keys: HotkeyEntry['keys'] }) => (
  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
    {keys.map((chord, i) => (
      <Fragment key={chord.join('+')}>
        {i > 0 ? (
          <span className="px-0.5 text-(--faded) text-xs">/</span>
        ) : null}
        {chord.map((key, j) => (
          <Fragment key={key}>
            {j > 0 ? (
              <span className="text-(--faded) text-[0.65rem]">+</span>
            ) : null}
            <Keycap label={key} />
          </Fragment>
        ))}
      </Fragment>
    ))}
  </span>
);

const EssentialMark = ({ on }: { on: boolean }) => (
  <span
    aria-hidden="true"
    className={`mt-[0.4rem] size-1.5 shrink-0 rounded-full ${on ? 'bg-(--gold) shadow-[0_0_6px_rgba(201,165,87,0.7)]' : 'bg-transparent'}`}
  />
);

const Group = ({ group }: { group: HotkeyGroup }) => (
  <section
    className={`${panel} mb-3 flex scroll-mt-32 break-inside-avoid flex-col gap-2.5 p-3.5`}
    id={group.id}
  >
    <h3 className="d-display border-(--hair-gold) border-b pb-1.5 font-bold text-(--gold) text-sm uppercase tracking-2xl">
      {group.title}
    </h3>
    <ul className="flex flex-col gap-2">
      {group.entries.map((entry) => (
        <li
          className="flex items-start justify-between gap-3"
          key={entry.action}
        >
          <span className="flex min-w-0 gap-2">
            <EssentialMark on={entry.essential === true} />
            <span className="flex flex-col">
              <span className="text-(--parchment) text-sm leading-snug">
                {entry.action}
                {entry.essential ? (
                  <span className="sr-only"> (imprescindible)</span>
                ) : null}
              </span>
              {entry.detail ? (
                <span className="text-(--faded) text-xs leading-snug">
                  {entry.detail}
                </span>
              ) : null}
            </span>
          </span>
          <Keys keys={entry.keys} />
        </li>
      ))}
    </ul>
    {group.note ? (
      <p className="text-(--faded) text-xs leading-snug">{group.note}</p>
    ) : null}
  </section>
);

/** Consecutive pairs: the data lists the groups two by two, by theme. */
const pairs = (groups: HotkeyGroup[]) =>
  Array.from({ length: Math.ceil(groups.length / 2) }, (_, i) =>
    groups.slice(i * 2, i * 2 + 2),
  );

/**
 * All the shortcuts at once, each row reading "what it does … which keys".
 * From xl up, five columns of two related groups each (mouse, selection,
 * orders, camera, chat and upgrades), so a laptop screen shows the whole
 * sheet. Below that the pairs dissolve (`contents`) and the groups flow
 * through two or three balanced columns, or one under another on phones.
 */
const HotkeyBoard = ({ groups }: { groups: HotkeyGroup[] }) => (
  <div className="gap-3 sm:columns-2 lg:columns-3 xl:grid xl:grid-cols-5 xl:items-start">
    {pairs(groups).map((pair) => (
      <div className="contents xl:flex xl:flex-col" key={pair[0]?.id}>
        {pair.map((group) => (
          <Group group={group} key={group.id} />
        ))}
      </div>
    ))}
  </div>
);

export { HotkeyBoard, Keycap };
