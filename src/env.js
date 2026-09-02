import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const env = createEnv({
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string()
        : z.string().optional(),
    // Public URL the app runs on; OAuth callbacks derive from it. Falls back to localhost in dev.
    BETTER_AUTH_URL:
      process.env.NODE_ENV === 'production'
        ? z.string().url()
        : z.string().url().optional(),
    BETTER_AUTH_GITHUB_CLIENT_ID: z.string(),
    BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string(),
    BETTER_AUTH_GOOGLE_CLIENT_ID: z.string(),
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    // Cloudflare R2 (S3-compatible) — user-uploaded photos and videos.
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
    // Public base URL of the bucket (r2.dev subdomain or a custom domain), no trailing slash.
    R2_PUBLIC_URL: z.string().url(),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Injected by Vercel; absent in local dev. Drives site-flags.ts.
    VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  },

  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  // Next.js edge runtimes and the client can't destructure `process.env` directly, so this maps each var by hand.
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
    BETTER_AUTH_GITHUB_CLIENT_SECRET:
      process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    BETTER_AUTH_GOOGLE_CLIENT_ID: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    BETTER_AUTH_GOOGLE_CLIENT_SECRET:
      process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
  // Set SKIP_ENV_VALIDATION for Docker builds where env vars aren't available at build time.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  // Treats "" the same as undefined, so an accidentally-empty required var fails validation instead of passing silently.
  emptyStringAsUndefined: true,
});

export { env };
