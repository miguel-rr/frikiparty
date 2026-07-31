'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { authClient } from '@/server/better-auth/client';

const Header = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between border-gray-200 border-b px-6 py-4">
      <Link className="font-bold text-lg" href="/">
        Frikiparty
      </Link>
      {!isPending && (
        <>
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {session.user.name || session.user.email}
              </span>
              <button
                className="rounded-full bg-gray-900 px-4 py-2 font-semibold text-sm text-white hover:bg-gray-700"
                onClick={handleSignOut}
                type="button"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              className="rounded-full bg-gray-900 px-4 py-2 font-semibold text-sm text-white hover:bg-gray-700"
              href="/login"
            >
              Login
            </Link>
          )}
        </>
      )}
    </header>
  );
};

export { Header };
