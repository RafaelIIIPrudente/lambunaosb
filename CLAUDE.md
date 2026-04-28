# CLAUDE.md — lambunaosb

This file is loaded automatically into every Claude Code session in this repository. Read it end-to-end before suggesting any code, scaffolding, or architectural decisions.

## Project mission

`lambunaosb` is a production-grade web project baseplate targeting startup / Series-A quality bar. It is the foundation for five project types:

1. **SaaS dashboards** — auth-gated, multi-tenant capable
2. **Marketing and landing sites** — public, SEO-optimized
3. **Internal tools** — rapid CRUD, admin-style
4. **Interactive 3D experiences** — when the project calls for it
5. **AI-powered apps** — LLM-driven features, streaming UI

## Core stack

| Layer               | Tech                                                          | Role                                           |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Framework           | Next.js 15 (App Router + RSC default)                         | Routing, rendering, API surface                |
| DB + Auth + Storage | Supabase                                                      | Postgres, sole identity provider, file storage |
| Styling             | Tailwind v4                                                   | Utility-first CSS                              |
| Components          | shadcn/ui (Radix + Nova: Lucide + Geist)                      | Source-owned component primitives              |
| 3D                  | Three.js + React Three Fiber + drei                           | When 3D applies                                |
| Language            | TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) | Compile-time safety                            |
| Package manager     | pnpm                                                          | Sole package manager                           |
| Deployment          | Vercel                                                        | Edge + serverless                              |

## Complementary stack — concern → package

| Concern                    | Pick                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| ORM                        | `drizzle-orm` + `postgres` driver                                           |
| Schema validation          | `zod`                                                                       |
| Forms                      | `react-hook-form` + `@hookform/resolvers`                                   |
| Client state               | `zustand`                                                                   |
| Server state (client-side) | `@tanstack/react-query`                                                     |
| Data tables                | `@tanstack/react-table`                                                     |
| Animations                 | `motion` (formerly Framer Motion)                                           |
| 3D helpers                 | `@react-three/drei`, `leva`                                                 |
| Email                      | `resend` + `@react-email/components` + `@react-email/render`                |
| Payments                   | `stripe` + `@stripe/stripe-js`                                              |
| Product analytics          | `posthog-js` + `posthog-node`                                               |
| Web vitals / page views    | `@vercel/analytics` + `@vercel/speed-insights`                              |
| Error monitoring           | `@sentry/nextjs`                                                            |
| Logging                    | `pino` + Vercel log drain (Axiom or Better Stack)                           |
| Feature flags              | `@vercel/flags` (kill switches) + PostHog (experiments)                     |
| Rate limiting              | `@upstash/ratelimit` + `@upstash/redis`                                     |
| Background jobs            | `inngest`                                                                   |
| File uploads               | Supabase Storage                                                            |
| AI SDK                     | `ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`                               |
| Vector search              | `pgvector` (Supabase)                                                       |
| CMS / content layer        | `next-mdx-remote` + `gray-matter` (escalate to Sanity for non-tech editors) |
| Search                     | Postgres FTS default; Algolia when fuzzy/typo-tolerance is a feature        |
| Unit testing               | `vitest`                                                                    |
| E2E testing                | `@playwright/test`                                                          |
| Linting + formatting       | `eslint` (Next config) + `prettier` + `prettier-plugin-tailwindcss`         |
| Git hooks                  | `husky` + `lint-staged`                                                     |
| CI/CD                      | GitHub Actions + Vercel Git integration                                     |
| Type-safe env              | `@t3-oss/env-nextjs` + `zod`                                                |
| Icons                      | `lucide-react`                                                              |
| Date/time                  | `date-fns`                                                                  |
| className helper           | `clsx` + `tailwind-merge` (composed as `cn`)                                |
| Documentation site         | `fumadocs` (when needed)                                                    |

## Architectural conventions

### Server Components vs. Client Components

Default to Server Components. Add `'use client'` only when the file needs at least one of:

- Browser APIs (`window`, `document`, `localStorage`, `IntersectionObserver`)
- React state or effects (`useState`, `useEffect`, `useReducer`)
- Event handlers (`onClick`, `onChange`)
- Libraries that themselves require the above (R3F, motion, react-hook-form, TanStack Query, charting)

Push the boundary as far down as possible. A Client `<Button>` inside a Server `<Page>` is correct. A Client `<Page>` containing static content is wrong. Client Components consume Server Components only via the `children` prop.

### Server actions vs. route handlers

- **Server actions** (`'use server'`): default for all UI-originated mutations.
- **Route handlers** (`app/api/**/route.ts`): webhooks (raw body access), OAuth callbacks, non-Next API consumers, and AI streaming endpoints that need raw `Response` control.

### Supabase auth patterns

- Use `@supabase/ssr` exclusively. Never `@supabase/auth-helpers-nextjs` (deprecated).
- Three clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC + actions + handlers), `lib/supabase/middleware.ts` (session refresh).
- `middleware.ts` at repo root MUST call `supabase.auth.getUser()` on every protected request to refresh cookies.
- Read the user via `supabase.auth.getUser()` — verifies the JWT. NEVER `getSession()` (trusts the cookie blindly).
- All multi-tenant tables MUST have RLS enabled with `auth.uid()`-keyed policies. The service-role connection bypasses RLS — confine it to server-only modules with `import 'server-only'`.

### Data fetching

- Server Components fetch directly via Drizzle / Supabase — the default read path.
- Server actions for mutations. Return a discriminated `Result<T> = { ok: true; data: T } | { ok: false; error: string; code: string }`. Never throw from a server action consumed by UI.
- TanStack Query on the client only for refetching, polling, optimistic updates, and infinite scroll. Set `staleTime` to 30–60 seconds to avoid refetch storms.

### File structure

- `app/` — routes. Use route groups `(marketing)`, `(auth)`, `(app)` for layout segmentation. Parallel routes `@slot` for independently loadable panels. Intercepting routes `(.)` for modal-over-page.
- `components/ui/` — shadcn primitives, owned source.
- `components/{forms,marketing,app,three}/` — feature-specific composed components.
- `lib/` — pure utilities, types, helpers (no I/O).
- `lib/db/` — Drizzle schema, queries, migrations.
- `lib/supabase/` — SSR clients only.
- `lib/services/` — cross-cutting domain logic, server-only.
- `lib/validators/` — shared Zod schemas.
- `app/_actions/` — server actions colocated with routes.
- `content/` — MDX content.
- `emails/` — React Email templates.
- `tests/{unit,e2e}/` — test specs.

### Error handling

- `error.tsx` at every route segment that can fail differently — segment-local recovery UI.
- `not-found.tsx` paired with explicit `notFound()` calls in server components.
- Server actions return `Result<T>`. Route handlers throw (translated to HTTP).
- `@sentry/nextjs` auto-instruments errors across server, client, and edge runtimes.

### Loading and streaming

- `loading.tsx` at any route segment whose data fetch can exceed ~200ms.
- Granular `<Suspense>` boundaries inside pages for slow widgets (charts, AI summaries).
- `useOptimistic` for any mutation the user must see instantly.

## Hard constraints

- TypeScript `strict: true` AND `noUncheckedIndexedAccess: true`.
- App Router + Server Components are the default.
- Supabase is the SOLE auth provider.
- pnpm is the SOLE package manager.
- Vercel is the deployment target — every recommendation must be Vercel-friendly.

## Code conventions

- Path alias: `@/*` → project root. Always import via the alias for cross-directory imports.
- No `any`. Use `unknown` and narrow.
- Read env via `import { env } from '@/env'`. Never read `process.env` directly outside `env.ts`.
- Server-only modules start with `import 'server-only'` (immediately after `'use server'` if both apply).
- Class composition uses `cn()` from `@/lib/utils`. Never concatenate Tailwind classes by string.
- Server actions: `'use server'` at the top of the file, then `import 'server-only'`, then other imports.
- Client components: `'use client'` at the top.

## Do not

- DO NOT suggest Clerk, Auth.js, NextAuth, or any non-Supabase auth provider.
- DO NOT use `supabase.auth.getSession()` from server code — always `getUser()`.
- DO NOT expose `SUPABASE_SERVICE_ROLE_KEY` to a Client Component (directly or transitively).
- DO NOT concatenate Tailwind classes manually. Always use `cn()`.
- DO NOT bypass `env.ts`. Never read `process.env` outside that file.
- DO NOT run `npm`, `yarn`, or `bun`. pnpm only.
- DO NOT use `dynamic(..., { ssr: false })` from a Server Component — wrap in a Client Component first.
- DO NOT introduce CSS-in-JS runtimes (styled-components, emotion). Tailwind only.
- DO NOT use `@supabase/auth-helpers-nextjs` (deprecated). Use `@supabase/ssr`.
- DO NOT throw from server actions consumed by UI — return a `Result`.
- DO NOT skip Zod validation on tool inputs in AI features. Model output is untrusted.
- DO NOT rate-limit AI endpoints by IP only — use authenticated user ID.

## Reference

`BASEPLATE.md` at repo root contains the deeper rationale: why each tool was picked, alternatives considered, install commands, file structure tree, end-to-end setup commands, and per-project-type add-ons. Read it when you need the "why" behind a recommendation in this file.
