import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { env } from '@/env';
import { db } from '@/server/db';

const baseURL = env.BETTER_AUTH_URL ?? 'http://localhost:3000';

const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: 'pg', // or "pg" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
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
  },
  // Cookie session, persistent for 30 days with a 1-day sliding renewal on activity.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

type Session = typeof auth.$Infer.Session;

export { auth, type Session };
