'use client';

import { useEffect, useRef, useState } from 'react';

type NavItem = { id: string; label: string };

/** A section counts once it is in the page and has something inside. */
const present = (id: string) => {
  const el = document.getElementById(id);
  return el !== null && el.childElementCount > 0;
};

/**
 * The game page's table of contents: a bar that sticks under the site nav,
 * scrolls sideways on phones and lights up the section being read.
 * Sections that render nothing for this visitor (the members-only files)
 * drop out of the bar.
 */
const SectionNav = ({ items }: { items: NavItem[] }) => {
  const [visible, setVisible] = useState(items);
  const [active, setActive] = useState(items[0]?.id ?? '');
  const bar = useRef<HTMLDivElement>(null);

  // Keep the bar in step with sections that appear later (files load in the browser).
  useEffect(() => {
    const refresh = () => setVisible(items.filter((i) => present(i.id)));
    refresh();
    const observer = new MutationObserver(refresh);
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el, { childList: true });
    }
    return () => observer.disconnect();
  }, [items]);

  // The active section is the last one whose top has passed under the bar.
  useEffect(() => {
    const onScroll = () => {
      let current = visible[0]?.id ?? '';
      for (const item of visible) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top < 160) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visible]);

  // On phones, keep the active chip in view inside the sideways-scrolling bar.
  useEffect(() => {
    const chip = bar.current?.querySelector<HTMLElement>(
      `[data-section="${active}"]`,
    );
    const row = bar.current;
    if (!chip || !row) return;
    row.scrollTo({
      left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <div className="sticky top-14 z-30 -mx-4 border-(--hair) border-y bg-(--night)/88 backdrop-blur-md sm:-mx-6">
      <div
        className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:justify-center sm:px-6"
        ref={bar}
      >
        {visible.map((item) => (
          <a
            aria-current={item.id === active ? 'location' : undefined}
            className={`shrink-0 rounded-full border px-3 py-1 font-mono text-2xs uppercase tracking-2xl transition-colors ${
              item.id === active
                ? 'border-(--gold) bg-(--gold)/12 text-(--gold-hi)'
                : 'border-transparent text-(--faded) hover:text-(--parchment)'
            }`}
            data-section={item.id}
            href={`#${item.id}`}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export { SectionNav };
