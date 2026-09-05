import type { ReactNode } from 'react';

/**
 * Rendered on request, never at build time: this section is parked (out of
 * the site's navigation) and must not weigh on the build.
 */
export const dynamic = 'force-dynamic';

const Layout = ({ children }: { children: ReactNode }) => children;

export default Layout;
