'use client';

import type { ReactNode } from 'react';

const FLASH = ['ring-2', 'ring-(--gold)', 'bg-(--gold)/10'];
const FLASH_MS = 3200;

/** Scrolls to an annex on the page and lights it up for a few seconds. */
const CHIP =
  'inline-flex items-center gap-1 rounded-full border border-(--hair-gold) px-2.5 py-0.5 font-mono text-(--gold) text-2xs uppercase tracking-xl transition-colors hover:border-(--gold) hover:text-(--gold-hi)';

const AnnexLink = ({
  target,
  children,
  className = CHIP,
  bare = false,
}: {
  target: string;
  children: ReactNode;
  /** Replaces the chip look (e.g. a button). */
  className?: string;
  /** Leaves out the § mark. */
  bare?: boolean;
}) => (
  <a
    className={className}
    href={`#${target}`}
    onClick={(event) => {
      const node = document.getElementById(target);
      if (!node) return;
      event.preventDefault();
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.classList.add(...FLASH);
      window.setTimeout(() => node.classList.remove(...FLASH), FLASH_MS);
    }}
  >
    {bare ? null : '§ '}
    {children}
  </a>
);

export { AnnexLink };
