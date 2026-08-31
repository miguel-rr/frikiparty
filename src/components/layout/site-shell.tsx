import Link from 'next/link';
import type { ReactNode } from 'react';

import { UserMenu } from '@/app/_components/user-menu';
import { TopNav } from '@/components/layout/top-nav';
import { ParallaxBackground } from '@/components/theme/parallax-bg';
import { BlazonDefs, btn, Footer } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { getSession } from '@/server/better-auth/server';

/**
 * Night-theme page shell: scoped theme wrapper (also hides the legacy
 * header via body:has(.theme-night)), shared SVG defs, parallax backdrop,
 * top nav with the session-aware auth slot, and the footer. Every themed
 * route renders inside this.
 */

const NAV_LINKS = [
  { href: '/ranking', text: 'Ranking' },
  { href: '/editions', text: 'Ediciones' },
  { href: '/pifouds', text: 'El Pifouds' },
];

const SiteShell = async ({
  children,
  footerNote,
}: {
  children: ReactNode;
  footerNote?: ReactNode;
}) => {
  const session = await getSession();
  return (
    <div className="theme-night text-[1.0625rem] leading-relaxed">
      <BlazonDefs />
      <ParallaxBackground />
      <TopNav
        authSlot={
          siteFlags.auth ? (
            session ? (
              <UserMenu label={session.user.name || session.user.email} />
            ) : (
              <Link
                className={`${btn.primary} px-4 py-1.5 text-sm`}
                href="/login"
              >
                Entrar
              </Link>
            )
          ) : null
        }
        links={siteFlags.navigation ? NAV_LINKS : []}
      />
      {children}
      <Footer note={footerNote} />
    </div>
  );
};

export { NAV_LINKS, SiteShell };
