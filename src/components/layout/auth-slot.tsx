'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from '@/app/_components/user-menu';
import { btn } from '@/components/theme/primitives';
import { authClient } from '@/server/better-auth/client';

/**
 * The session resolves client-side on purpose: pages stay statically
 * built (no headers() on the server) and the auth corner hydrates in.
 * `role` is a better-auth additional field the client types don't carry.
 */
const useSessionUser = () => {
  const { data, isPending } = authClient.useSession();
  const user = data?.user as
    | { id: string; name: string | null; email: string; role?: string }
    | undefined;
  return { user, isPending };
};

const AuthSlot = () => {
  const { user, isPending } = useSessionUser();
  // Entrar remembers where you were: /login sends you back there afterwards.
  const pathname = usePathname();
  const loginHref =
    pathname && pathname !== '/login'
      ? `/login?next=${encodeURIComponent(pathname)}`
      : '/login';
  if (isPending) {
    // Placeholder with the button's height so the nav doesn't jump.
    return <span aria-hidden className="h-8.5" />;
  }
  if (user) {
    return (
      <UserMenu label={user.name || user.email} role={user.role ?? 'user'} />
    );
  }
  return (
    <Link className={btn.outline} href={loginHref}>
      Entrar
    </Link>
  );
};

export { AuthSlot, useSessionUser };
