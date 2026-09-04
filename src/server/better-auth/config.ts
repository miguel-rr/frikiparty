import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin } from 'better-auth/plugins';

import { env } from '@/env';
import { db } from '@/server/db';

const baseURL = env.BETTER_AUTH_URL ?? 'http://localhost:3000';

/** Outlook/Hotmail/Live sign-in, only once the Azure app is registered. */
const microsoftEnabled = Boolean(
  env.BETTER_AUTH_MICROSOFT_CLIENT_ID &&
    env.BETTER_AUTH_MICROSOFT_CLIENT_SECRET,
);

/** Admin-plugin endpoints that only make sense for test accounts. */
const PRODUCTION_BLOCKED_PATHS = new Set([
  '/admin/create-user',
  '/admin/impersonate-user',
  '/admin/set-user-password',
]);

const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: 'pg', // or "pg" or "mysql"
  }),
  // Social sign-in only: nobody ever used a password, and one fewer
  // secret to keep. GitHub stays configured but its button is hidden.
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      // One email, one user: whichever of these you sign in with links to
      // the same account. Both providers verify emails at sign-up.
      trustedProviders: ['google', 'microsoft'],
    },
  },
  user: {
    additionalFields: {
      // The admin plugin declares `role` optional; re-declared required so
      // the session type carries a plain string (and input: false keeps
      // signup/update from setting it).
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  plugins: [
    // Brings `role` (input: false, so signup/update can't set it), plus
    // "Entrar como": an admin opens a session as another user. Only for
    // test accounts outside production (see hooks below); it lets one
    // person drive a whole draft or auction from several browsers.
    admin({
      adminRoles: ['admin'],
      defaultRole: 'user',
      impersonationSessionDuration: 60 * 60 * 12,
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        env.VERCEL_ENV === 'production' &&
        PRODUCTION_BLOCKED_PATHS.has(ctx.path)
      ) {
        throw new APIError('FORBIDDEN', {
          message: 'Las cuentas de pruebas no existen en producción.',
        });
      }
    }),
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${baseURL}/api/auth/callback/github`,
    },
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      redirectURI: `${baseURL}/api/auth/callback/google`,
    },
    ...(microsoftEnabled
      ? {
          microsoft: {
            clientId: env.BETTER_AUTH_MICROSOFT_CLIENT_ID ?? '',
            clientSecret: env.BETTER_AUTH_MICROSOFT_CLIENT_SECRET ?? '',
            // "common": personal accounts (Outlook, Hotmail, Live) and
            // work/school accounts alike.
            tenantId: 'common',
            redirectURI: `${baseURL}/api/auth/callback/microsoft`,
          },
        }
      : {}),
  },
  // Cookie session, persistent for 30 days with a 1-day sliding renewal on activity.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

type Session = typeof auth.$Infer.Session;

export { auth, microsoftEnabled, type Session };
