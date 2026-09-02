'use client';

import { useSearchParams } from 'next/navigation';

import { btn, panel } from '@/components/theme/primitives';
import { authClient } from '@/server/better-auth/client';

/** Brand marks for the social buttons — currentColor so they follow the theme. */
const GoogleMark = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
    <path
      d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.65 4.1-5.35 4.1a5.9 5.9 0 0 1 0-11.8c1.68 0 2.81.72 3.46 1.33l2.36-2.27C16.3 3.9 14.35 3 12 3a9 9 0 1 0 0 18c5.2 0 8.63-3.65 8.63-8.8 0-.6-.06-1.05-.15-1.5Z"
      fill="currentColor"
    />
  </svg>
);

/** The four-tile Microsoft mark, single colour. */
const MicrosoftMark = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
    <path
      d="M3 3h8.5v8.5H3zm9.5 0H21v8.5h-8.5zM3 12.5h8.5V21H3zm9.5 0H21V21h-8.5z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Where to land after signing in: the `next` query param when it's a
 * local path (never another host, never /login itself), else the home.
 */
const safeNext = (raw: string | null) =>
  raw?.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/login')
    ? raw
    : '/';

/**
 * Social sign-in only. Google always; Microsoft (Outlook, Hotmail, Live)
 * once its Azure app is configured. GitHub stays wired server-side for
 * old sessions but has no button.
 */
const LoginForm = ({ microsoft }: { microsoft: boolean }) => {
  const next = safeNext(useSearchParams().get('next'));

  const signIn = (provider: 'google' | 'microsoft') => {
    void authClient.signIn.social({ provider, callbackURL: next });
  };

  return (
    <div
      className={`${panel} flex w-full max-w-sm flex-col gap-2.5 p-6 sm:p-8`}
    >
      <button
        className={`${btn.primary} w-full`}
        onClick={() => signIn('google')}
        type="button"
      >
        <GoogleMark /> Continuar con Google
      </button>
      {microsoft ? (
        <button
          className={`${btn.secondary} w-full`}
          onClick={() => signIn('microsoft')}
          type="button"
        >
          <MicrosoftMark /> Continuar con Microsoft
        </button>
      ) : null}
      <p className="mt-2 text-center text-(--faded) text-xs">
        {microsoft
          ? 'Vale cualquier cuenta de Outlook, Hotmail o Live.'
          : 'Solo con Google por ahora.'}
      </p>
    </div>
  );
};

export { LoginForm };
