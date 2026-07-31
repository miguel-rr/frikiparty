# Project Overview

This is a web project for a bunch of friends that get together once a year to play some board games and a great tournament by teams playing Age of The Ring (Battle of Middle Earth)

The website contains information about every tournament held (we started in 2005, so more than 20 editions now), a ranking of players and a nice tournament mode so players can setup the upcoming tournaments (usually teams of 3/4 members playing a group phase and then playoff), setup participants in teams, set tournament phases and start playing it and updating the scores so anyone can check the standings or brackets live.

This is app is built on the T3 Stack: Next.js (App Router), TypeScript, tRPC, Tailwind CSS. Will be deployed to Vercel.

Database layer: we will be using Neon

**Current state**: this is still the `create-t3-app` scaffold — the homepage, the single `post` router, and the `posts` table are all boilerplate, not real features. None of the tournament/ranking/team functionality described above exists in code yet. Don't assume any domain model beyond what's actually in `src/server/db/schema.ts`.

# Commands

- Dev server: `pnpm run dev`
- Build: `pnpm run build`
- Lint: `pnpm run check` (Biome — also formats; use `pnpm run check:write` to auto-fix)
- Typecheck: `pnpm run typecheck`
- DB schema → SQL migration: `pnpm run db:generate`
- Apply migrations: `pnpm run db:migrate`
- Push schema directly (no migration file, dev convenience): `pnpm run db:push`
- Drizzle Studio (DB browser GUI): `pnpm run db:studio`

Run `pnpm run typecheck` and `pnpm run check` before considering any task done.

# Stack & Conventions

- **Framework**: Next.js App Router — Server Components by default, `"use client"` only when needed (state, effects, browser APIs).
- **API layer**: tRPC — routers live in `src/server/api/routers/`, root router in `src/server/api/root.ts`. Use `publicProcedure` vs `protectedProcedure` (from `src/server/api/trpc.ts`) depending on whether auth is required; `protectedProcedure` guarantees `ctx.session.user` is non-null.
- **Server vs client tRPC access**: Server Components import `api` from `src/trpc/server.ts` (wraps a server-side caller, supports `HydrateClient`/`.prefetch()` for streaming into client components). Client Components use the `api` hooks from `src/trpc/react.tsx` (`createTRPCReact`), provided by `TRPCReactProvider` in the root layout.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config.ts`). Prefer utility classes over new CSS files.
- **Auth**: better-auth, configured in `src/server/better-auth/config.ts`, mounted at `src/app/api/auth/[...all]/route.ts`. Server-side session reads go through `getSession()` in `src/server/better-auth/server.ts` (React `cache`-wrapped); client-side through `authClient` in `src/server/better-auth/client.ts`. Currently only GitHub OAuth + email/password are enabled.
- **Database**: Drizzle ORM against Postgres (`src/server/db/index.ts`, `src/server/db/schema.ts`). App tables should go through `createTable` (a `pgTableCreator` that prefixes table names) rather than `pgTable` directly — better-auth's own tables (`user`, `session`, `account`, `verification`) are the exception and stay unprefixed since better-auth owns that schema shape.
- **Env vars**: validated centrally in `src/env.js` via `@t3-oss/env-nextjs`/Zod. Add new vars to both the schema there and `.env.example`, never read `process.env` directly elsewhere.
- **Path alias**: `@/*` → `src/*` (see `tsconfig.json`).
- **Types**: no `any` — infer types from tRPC/DB layer rather than duplicating them by hand.
- **File structure**: open to suggestions. Please ask me anything you need to know.

# Boundaries

- Don't touch `next.config.js`, `tailwind.config.ts`, or `.env*` without explicit confirmation.
- Don't install new dependencies without asking first.
- Generated/build output (`.next/`, `node_modules/`) is off-limits.

# Open Decisions

- **Database ORM**: Drizzle. If a task needs DB access, ask which one is in use rather than assuming.
- **Database host**: Neon. No local Postgres/Docker — development runs directly against a Neon "dev" branch (`DATABASE_URL` in `.env` points to it). I'm a newbie here, I'll need some guidance to create the account and set up the branch.
- **Media hosting**: Cloudflare R2, (Same as Neon, I'll need some guidance. Ask me anything)

# Deployment

- Hosted on Vercel. Use the Vercel CLI (`vercel`, `vercel env pull`, `vercel logs`) for deploy checks and debugging build failures.
- Environment variables are managed in the Vercel dashboard — pull them locally with `vercel env pull .env.local`.
- Ask me for anything during first deploy and store everything you need so you don't ask me again

# Workflow Notes

- For multi-file or schema-affecting changes, outline the plan before editing (use plan mode).
- Prefer small, verifiable steps over large speculative rewrites.