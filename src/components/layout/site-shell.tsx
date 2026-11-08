import type { ReactNode } from 'react';

import { AuthSlot } from '@/components/layout/auth-slot';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';
import { TopNav } from '@/components/layout/top-nav';
import { ParallaxBackground } from '@/components/theme/parallax-bg';
import { BlazonDefs, Footer } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';

/**
 * Night-theme page shell: scoped theme wrapper, shared SVG defs, parallax
 * backdrop, top nav and footer. The auth corner resolves client-side (see
 * AuthSlot) so pages under the shell can be built statically.
 */

const NAV_LINKS = [
  { href: '/champions', text: 'Los Portadores' },
  { href: '/ranking', text: 'Ranking' },
  { href: '/editions', text: 'Ediciones' },
  { href: '/games', text: 'Juegos' },
  { href: '/council', text: 'El Concilio' },
];

const SiteShell = ({
  backdrop,
  children,
  footerNote,
}: {
  /** Page-wide backdrop; defaults to the mountain parallax. */
  backdrop?: ReactNode;
  children: ReactNode;
  footerNote?: ReactNode;
}) => (
  <div className="theme-night text-[1.0625rem] leading-relaxed">
    <BlazonDefs />
    {backdrop ?? <ParallaxBackground />}
    <TopNav
      authSlot={siteFlags.auth ? <AuthSlot /> : null}
      links={siteFlags.navigation ? NAV_LINKS : []}
    />
    {siteFlags.auth ? <ImpersonationBanner /> : null}
    {children}
    <Footer note={footerNote} />
  </div>
);

export { NAV_LINKS, SiteShell };
