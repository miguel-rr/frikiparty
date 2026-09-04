'use client';

import { type ReactNode, useEffect, useState } from 'react';

/**
 * Tabs over the hero: the ring, tag and headline stay put while the block
 * under the headline swaps between proposals. The choice rides in the URL
 * hash (#a … #d) so a link opens straight on one proposal.
 */

type ProposalItem = {
  key: string;
  name: string;
  caption: string;
  node: ReactNode;
};

const ProposalSwitcher = ({
  head,
  items,
}: {
  /** Everything above the swapped block: ring, tag, headline. */
  head: ReactNode;
  items: ProposalItem[];
}) => {
  const [active, setActive] = useState(items[0]?.key ?? '');
  useEffect(() => {
    const fromHash = window.location.hash.slice(1).toLowerCase();
    if (items.some((item) => item.key === fromHash)) {
      setActive(fromHash);
    }
  }, [items]);
  const select = (key: string) => {
    setActive(key);
    window.history.replaceState(null, '', `#${key}`);
  };
  const current = items.find((item) => item.key === active) ?? items[0];
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-3">
        <div
          aria-label="Propuestas"
          className="flex flex-wrap justify-center gap-2"
          role="tablist"
        >
          {items.map((item) => {
            const selected = item.key === current?.key;
            return (
              <button
                aria-selected={selected}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 font-bold font-mono text-2xs uppercase tracking-2xl transition-colors ${
                  selected
                    ? 'border-(--gold) bg-(--gold)/12 text-(--gold-hi)'
                    : 'border-(--hair-gold) text-(--gold) hover:border-(--gold)/65 hover:text-(--gold-hi)'
                }`}
                key={item.key}
                onClick={() => select(item.key)}
                role="tab"
                type="button"
              >
                <span className="text-(--faded)">{item.key.toUpperCase()}</span>
                {item.name}
              </button>
            );
          })}
        </div>
        {current ? (
          <p className="max-w-[60ch] text-center font-mono text-(--faded) text-2xs uppercase tracking-xl">
            {current.caption}
          </p>
        ) : null}
      </div>
      <section className="relative overflow-hidden" id="top">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 pt-6 pb-12 sm:px-6 lg:gap-7 lg:pb-14">
          {head}
          {current?.node}
        </div>
      </section>
    </div>
  );
};

export { ProposalSwitcher };
