import type { ReactNode } from 'react';

import { panel, panelGold, tag } from '@/components/theme/primitives';

/**
 * Titled panel for a wizard step — same header/body split as the panels on
 * the rest of the site (see /design). `gold` marks the celebratory ones.
 */
const StepPanel = ({
  children,
  gold = false,
  tagText,
  title,
}: {
  children: ReactNode;
  gold?: boolean;
  tagText?: string;
  title: string;
}) => (
  <section className={`${gold ? panelGold : panel} flex flex-col`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair) border-b px-5 py-4">
      <h2 className="d-display font-bold text-lg uppercase tracking-wide">
        {title}
      </h2>
      {tagText ? <span className={tag}>{tagText}</span> : null}
    </div>
    <div className="flex flex-col gap-4 p-5 sm:p-6">{children}</div>
  </section>
);

export { StepPanel };
