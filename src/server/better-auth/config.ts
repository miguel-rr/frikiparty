import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { env } from '@/env';
import { db } from '@/server/db';

const baseURL = env.BETTER_AUTH_URL ?? 'http://localhost:3000';

/** Outlook/Hotmail/Live sign-in, only once the Azure app is registered. */
const microsoftEnabled = Boolean(
  env.BETTER_AUTH_MICROSOFT_CLIENT_ID &&
    env.BETTER_AUTH_MICROSOFT_CLIENT_SECRET,
);

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
      // input: false stops signup/update requests from setting their own role.
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
    },
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
