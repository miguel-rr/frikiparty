'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '@/server/better-auth/client';

const LoginPage = () => {
  const router = useRouter();
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
      callbackURL: '/',
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? 'No se pudo iniciar sesión.');
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleSocialSignIn = (provider: 'google' | 'github') => {
    void authClient.signIn.social({ provider, callbackURL: '/' });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="font-bold text-2xl">Iniciar sesión</h1>

      <form
        className="flex w-full max-w-xs flex-col gap-3"
        onSubmit={handleEmailSignIn}
      >
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          type="email"
          value={email}
        />
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          required
          type="password"
          value={password}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          className="rounded-md border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50"
          onClick={() => handleSocialSignIn('google')}
          type="button"
        >
          Continuar con Google
        </button>
        <button
          className="rounded-md border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50"
          onClick={() => handleSocialSignIn('github')}
          type="button"
        >
          Continuar con GitHub
        </button>
      </div>
    </main>
  );
};

export default LoginPage;
