'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { btn, input, label, panel } from '@/components/theme/primitives';
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

const GitHubMark = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
    <path
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
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

const LoginForm = () => {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: next,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? 'No se pudo iniciar sesión.');
      return;
    }

    router.push(next);
    router.refresh();
  };

  const handleSocialSignIn = (provider: 'google' | 'github') => {
    void authClient.signIn.social({ provider, callbackURL: next });
  };

  return (
    <div className={`${panel} flex w-full max-w-sm flex-col gap-6 p-6 sm:p-8`}>
      <form className="flex flex-col gap-4" onSubmit={handleEmailSignIn}>
        <div>
          <label className={label} htmlFor="login-email">
            Correo
          </label>
          <input
            autoComplete="email"
            className={input}
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className={label} htmlFor="login-password">
            Contraseña
          </label>
          <input
            autoComplete="current-password"
            className={input}
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </div>
        {error ? (
          <p className="text-(--ember) text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className={`${btn.primary} w-full`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-(--hair)" />
        <span className="text-(--faded) text-xs italic">o bien</span>
        <span aria-hidden className="h-px flex-1 bg-(--hair)" />
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          className={`${btn.secondary} w-full`}
          onClick={() => handleSocialSignIn('google')}
          type="button"
        >
          <GoogleMark /> Continuar con Google
        </button>
        <button
          className={`${btn.secondary} w-full`}
          onClick={() => handleSocialSignIn('github')}
          type="button"
        >
          <GitHubMark /> Continuar con GitHub
        </button>
      </div>
    </div>
  );
};

export { LoginForm };
