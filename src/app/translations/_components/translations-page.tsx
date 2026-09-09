import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { TranslationsNav } from '@/components/translations/translations-nav';
import { canTranslate } from '@/lib/roles';
import { getSession } from '@/server/better-auth/server';

/**
 * Frame of every desk of the lotr.str module: translators and admins
 * only, the shared header and the tabs.
 */
const TranslationsPage = async ({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) => {
  const session = await getSession();
  if (!session || !canTranslate(session.user)) notFound();
  return (
    <SiteShell>
      <main>
        <Section id="translations">
          <SectionHeader eyebrowText="Traducciones" lead={lead} title={title} />
          <TranslationsNav />
          {children}
        </Section>
      </main>
    </SiteShell>
  );
};

export { TranslationsPage };
