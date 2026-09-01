import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  RingGlyph,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';

const NotFound = () => (
  <SiteShell>
    <main>
      <Section>
        <SectionHeader
          eyebrowText="Error 404"
          lead="Ni en los anales ni en la Cuenta Larga: esta página no existe. Puede que la edición que buscas aún no esté escrita."
          title="No todos los que vagan están perdidos"
        />
        <div className="flex flex-col items-center gap-6">
          <RingGlyph size={44} tone="solitaire" />
          <div className="flex flex-wrap justify-center gap-3">
            <Link className={btn.primary} href="/">
              Volver al principio
            </Link>
            {/* Only offered where the chronicle is actually published. */}
            {siteFlags.editionsPage ? (
              <Link className={btn.secondary} href="/editions">
                Ver las ediciones
              </Link>
            ) : null}
          </div>
        </div>
      </Section>
    </main>
  </SiteShell>
);

export default NotFound;
