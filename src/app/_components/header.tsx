import Image from 'next/image';
import Link from 'next/link';

import { UserMenu } from '@/app/_components/user-menu';
import { getSession } from '@/server/better-auth/server';

const NAV_LINKS = [
  { href: '/ranking', label: 'Ranking' },
  { href: '/ediciones', label: 'Ediciones' },
  { href: '/pifouds', label: 'El Pifouds' },
] as const;

/**
 * Server component on purpose: reading the session here means the markup is
 * identical on server and client. Resolving it client-side instead produced a
 * hydration mismatch, because the server rendered nothing while the session
 * was pending and the client rendered the button straight away.
 */
const Header = async () => {
  const session = await getSession();

  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-hair border-b bg-panel px-4 py-3 sm:px-8">
      <Link aria-label="Frikiparty — inicio" href="/">
        <Image
          alt="Frikiparty"
          className="h-[26px] w-auto"
          height={35}
          priority
          src="/frikiparty-wordmark.svg"
          width={190}
        />
      </Link>

      <nav className="flex flex-1 gap-4 sm:gap-7">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            className="border-transparent border-b-2 py-1.5 font-bold text-muted text-sm tracking-wide transition-colors hover:text-ink"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>

      {session ? (
        <UserMenu label={session.user.name || session.user.email} />
      ) : (
        <Link
          className="rounded-full bg-amber px-4 py-2 font-bold text-ground text-sm transition-opacity hover:opacity-90"
          href="/login"
        >
          Entrar
        </Link>
      )}
    </header>
  );
};

export { Header };
