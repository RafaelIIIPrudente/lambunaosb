# BASEPLATE.md

## 1. Overview

This is the canonical project baseplate for new web projects. It targets a startup / Series-A quality bar: production-ready, observable, and scalable without enterprise-tier overhead. Every project type covered here — SaaS dashboards, marketing and landing sites, internal tools, interactive 3D experiences, and AI-powered apps — starts from the same core stack (Next.js App Router, Supabase, Tailwind, shadcn/ui, optionally Three.js) and adds only what each project type requires. The document is consumed both by a senior engineer as a personal reference and by AI coding agents as a deterministic scaffolding spec.

---

## 2. Core Stack

### Next.js

**Role:** React framework, routing, rendering (RSC + streaming), API surface (route handlers + server actions), and Vercel-native edge/runtime targeting.
**Why:** App Router + Server Components is the default for every project type here; it eliminates 80% of client-state plumbing and ships less JS. Vercel deployment is a first-class path.
**Install:** scaffolded by `create-next-app` (see section 6).
**Gotchas:** Always pin React/Next minor versions in `package.json` — Server Component semantics shift across minors. `'use client'` cascades downward through imports, so client boundaries must be drawn at the leaf, not the page. Avoid `dynamic(() => import(...), { ssr: false })` in Server Components — wrap in a Client Component first.

### Supabase

**Role:** Postgres (primary DB), Auth (sole identity provider for every project), Storage (file blobs), Realtime (when needed), Edge Functions (avoid — prefer Vercel route handlers).
**Why:** One vendor for DB + auth + storage cuts integration cost; Postgres + RLS is the right primitive for multi-tenant SaaS; the SSR helper package supports App Router cookie-based sessions.
**Install:** `pnpm add @supabase/supabase-js @supabase/ssr`
**Gotchas:** Never use `@supabase/auth-helpers-nextjs` (deprecated) — use `@supabase/ssr`. Service-role keys must never reach the browser; gate them in server-only modules with `import 'server-only'`. RLS is off by default on new tables — enable it before the first insert.

### Tailwind CSS

**Role:** Utility-first styling, design-token plumbing, and the substrate shadcn/ui generates against.
**Why:** Co-located styles, near-zero runtime, and direct token control without a CSS-in-JS runtime tax.
**Install:** scaffolded by `create-next-app --tailwind`.
**Gotchas:** Tailwind v4 uses CSS-first config (`@theme` in `globals.css`) — there is no `tailwind.config.ts` by default. The `cn()` helper is mandatory for any conditional class composition; never concatenate class strings manually.

### shadcn/ui

**Role:** Source-owned component library generated into `components/ui/` — not an npm dependency.
**Why:** You own the code, can edit any primitive, and avoid version-drift breakage. Built on Radix primitives, accessible by default, Tailwind-themed.
**Install:** `pnpm dlx shadcn@latest init`
**Gotchas:** Components are copied into your repo; treat them as project source and refactor freely. Re-running `add` overwrites the file — diff before accepting. Lucide is the bundled icon set; do not mix icon libraries.

### Three.js (when 3D applies)

**Role:** WebGL renderer for interactive 3D scenes, used through React Three Fiber.
**Why:** R3F gives a declarative React surface over Three.js; `drei` ships the 80% of helpers you'd otherwise rebuild (controls, loaders, environments, postprocessing).
**Install:** `pnpm add three @react-three/fiber @react-three/drei` and `pnpm add -D @types/three`
**Gotchas:** R3F components must live inside a Client Component (`'use client'`). Never render a `<Canvas>` server-side. Three.js is heavy (~600KB gzipped) — code-split the entire 3D feature behind `dynamic(..., { ssr: false })`.

---

## 3. Complementary Stack — by concern

### ORM / type-safe DB queries

**Pick:** `drizzle-orm` — typed SQL builder for Postgres that respects RLS at the connection level.
**Why:** Zero-runtime, generates accurate TypeScript types from schema, and unlike Prisma it does not hide the query plan or fight Supabase's connection pooling.
**Alternatives considered:** Prisma — heavier client, historically awkward with RLS and edge runtimes. Raw `@supabase/supabase-js` — fine for simple reads but loses compile-time safety on joins and aggregates.
**Install:** `pnpm add drizzle-orm postgres` and `pnpm add -D drizzle-kit`
**Gotchas:** Use the `postgres` driver (not `pg`) for Vercel edge compatibility. RLS is enforced by the Postgres role you connect as — use the anon/auth role connection (via Supabase's session JWT) for user-scoped queries, and the service role only for admin paths.

### Schema validation

**Pick:** `zod` — runtime + static validation for env, forms, server-action input, and API boundaries.
**Why:** De facto standard, integrates with `react-hook-form`, `@t3-oss/env-nextjs`, AI SDK tool schemas, and Drizzle.
**Alternatives considered:** Valibot — smaller bundle but weaker ecosystem fit. Yup — older, no static inference.
**Install:** `pnpm add zod`
**Gotchas:** Pin to a single major (Zod 3 → 4 has breaking changes). Use `z.infer<typeof schema>` everywhere instead of duplicating types.

### Forms

**Pick:** `react-hook-form` with `@hookform/resolvers` for Zod integration.
**Why:** Uncontrolled-by-default form state, minimal re-renders, first-class shadcn `Form` component support.
**Alternatives considered:** TanStack Form — newer, smaller ecosystem. Formik — slow, controlled, effectively dead.
**Install:** `pnpm add react-hook-form @hookform/resolvers`
**Gotchas:** Forms must be Client Components. Pair with server actions via `<form action={action}>` for progressive enhancement, or `handleSubmit` for client-side validation flows.

### Client state management

**Pick:** `zustand` — minimal global client state for UI concerns (modals, multi-step wizards, ephemeral filters).
**Why:** No provider, no boilerplate, RSC-compatible because it is purely client-side.
**Alternatives considered:** Redux Toolkit — overkill for the kinds of state RSC leaves on the client. Jotai — equally good but Zustand has broader adoption.
**Install:** `pnpm add zustand`
**Gotchas:** Do not store server data here — that belongs in TanStack Query or RSC. Use slice patterns to keep stores under ~100 lines each.

### Server-state / data fetching / caching

**Pick:** `@tanstack/react-query` — for client-initiated fetches only (mutations from forms, polling, optimistic updates, infinite scroll).
**Why:** RSC handles the default read path; TanStack Query covers the cases RSC cannot (interactive client-side refetches, optimistic UI).
**Alternatives considered:** SWR — fine but smaller feature surface. Apollo — GraphQL-only, wrong scope.
**Install:** `pnpm add @tanstack/react-query @tanstack/react-query-devtools`
**Gotchas:** Wrap the provider in a Client Component (`providers.tsx`). Default `staleTime` to 30–60 seconds — the library's `0` default causes refetch storms.

### Server actions vs. route handlers — guidance

**Server actions** (`'use server'` functions, called from `<form action={...}>` or buttons): use for all mutations originating from your own UI — create/update/delete, auth flows, file uploads. Default choice.
**Route handlers** (`app/api/**/route.ts`): use only for (a) webhooks (Stripe, Resend), (b) third-party callbacks (OAuth, Supabase auth confirmations), (c) endpoints consumed by non-Next clients (mobile, external integrations), (d) streaming AI responses where you need raw `Response` control.

### Data tables

**Pick:** `@tanstack/react-table` — headless table primitives.
**Why:** Headless means it composes with shadcn `Table`; supports sorting, filtering, pagination, and column visibility without imposing styles.
**Alternatives considered:** AG Grid — enterprise feature creep, paid for advanced features. MUI DataGrid — drags in MUI's whole design system.
**Install:** `pnpm add @tanstack/react-table`
**Gotchas:** It is headless — you write the markup. Use shadcn's `data-table` recipe as the starting point.

### Animations / motion

**Pick:** `motion` — successor to Framer Motion (same API, new package name).
**Why:** Production-grade spring physics, layout animations, and gesture handling; works inside Client Components without runtime CSS-in-JS.
**Alternatives considered:** GSAP — more powerful but commercial license for some use cases and not React-native. CSS-only — fine for hover/focus, insufficient for layout animations.
**Install:** `pnpm add motion`
**Gotchas:** Import from `motion/react` (not `framer-motion`). Animations require a Client Component boundary. Use the `LazyMotion` pattern to defer the ~30KB runtime when only a few pages animate.

### 3D helpers (React Three Fiber ecosystem)

**Pick:** `@react-three/drei` (helpers) + `leva` (debug controls during dev).
**Why:** `drei` covers cameras, controls, loaders, environment maps, postprocessing, and performance helpers. `leva` is a dev-only GUI for tweaking shader/material params.
**Alternatives considered:** Hand-rolling controls and loaders — wastes weeks. Theatre.js — powerful but a heavier learning curve.
**Install:** `pnpm add @react-three/drei leva`
**Gotchas:** `drei` is large — import named exports only (`import { OrbitControls } from '@react-three/drei'`), never the whole namespace. Strip `leva` from production builds via `<Leva hidden />` or env-gated mounting.

### Email (transactional sending + React-based templating)

**Pick:** `resend` (sending) + `@react-email/components` and `@react-email/render` (templating).
**Why:** Resend has the best DX for transactional email on Vercel; React Email lets you co-locate templates with the rest of your React code and preview them locally.
**Alternatives considered:** Postmark — solid but plain-HTML templates. SendGrid — feature creep, worse DX. Plunk — too new.
**Install:** `pnpm add resend @react-email/components @react-email/render` and `pnpm add -D react-email`
**Gotchas:** Domain verification (SPF/DKIM/DMARC) takes 24–48 hours on first setup — start it before launch, not the day of. Always send from a verified subdomain (e.g., `mail.yourdomain.com`), never the apex.

### Payments / billing

**Pick:** `stripe` (server SDK) + `@stripe/stripe-js` (client loader).
**Why:** Industry default; Checkout + Customer Portal handles 90% of SaaS billing without building custom UI; webhook-driven sync to Supabase is a well-trodden path.
**Alternatives considered:** Lemon Squeezy / Paddle — merchant-of-record convenience but worse API and limited customization. Polar — too new for production billing.
**Install:** `pnpm add stripe @stripe/stripe-js`
**Gotchas:** Stripe webhooks must be a route handler (not a server action) to access the raw request body for signature verification. Store the Stripe customer ID on your `users`/`profiles` table, not the other way around.

### Product analytics

**Pick:** `posthog-js` + `posthog-node`.
**Why:** Product analytics, session replay, and experiment framework in one tool — replaces three separate vendors at the startup tier.
**Alternatives considered:** Mixpanel — analytics-only, more expensive at scale. Amplitude — enterprise pricing. Vercel Analytics — page views and Web Vitals only, not a substitute for product analytics (use it alongside, see below).
**Install:** `pnpm add posthog-js posthog-node`
**Gotchas:** Initialize PostHog in a Client Component provider; do not call `posthog.identify` before auth resolves. For Web Vitals and traffic, prefer the built-in `@vercel/analytics` and `@vercel/speed-insights` over PostHog's page-view tracking.

### Error monitoring / observability

**Pick:** `@sentry/nextjs`.
**Why:** Source-mapped client + server + edge errors, performance tracing, and release tracking with a single Vercel integration.
**Alternatives considered:** Highlight.io — strong session replay but weaker server-side coverage. Datadog — enterprise pricing.
**Install:** `pnpm add @sentry/nextjs` then `pnpm dlx @sentry/wizard@latest -i nextjs`
**Gotchas:** The wizard generates `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` — keep all three. Set `tracesSampleRate` low in production (0.1 or lower) to control cost.

### Structured logging

**Pick:** `pino` (server-side structured logs) + Vercel Log Drains routed to Axiom or Better Stack.
**Why:** Pino is the fastest Node logger and outputs JSON natively; Vercel's log drain ships those logs to a queryable backend without app-level integration.
**Alternatives considered:** `console.log` only — fine for early dev, useless once you need search/alerts. Winston — slower, less ergonomic.
**Install:** `pnpm add pino` and configure a Vercel log drain in the dashboard.
**Gotchas:** Never log secrets, tokens, or full request bodies. Wrap Pino with a redact list (`redact: ['password', 'token', 'authorization']`).

### Feature flags

**Pick:** `@vercel/flags` (edge-evaluated flags for rollout gating) — paired with PostHog for experiment-style flags tied to user cohorts.
**Why:** `@vercel/flags` evaluates at the edge with zero added latency for kill switches and percentage rollouts. PostHog handles cohort targeting and A/B test analysis when an experiment needs statistical evaluation.
**Alternatives considered:** LaunchDarkly — enterprise pricing for what is essentially a key-value store at startup scale. Statsig — solid but adds a third vendor.
**Install:** `pnpm add @vercel/flags`
**Gotchas:** Edge flags must be evaluated server-side and passed to clients; do not expose flag definitions to the browser. Cache flag values per request to avoid re-evaluation in nested layouts.

### Rate limiting

**Pick:** `@upstash/ratelimit` + `@upstash/redis`.
**Why:** Serverless Redis with a generous free tier and edge-compatible client; plug-and-play sliding-window and token-bucket algorithms.
**Alternatives considered:** Vercel KV — same Upstash backend, fine if you prefer the Vercel-branded SDK. In-memory — useless on serverless.
**Install:** `pnpm add @upstash/ratelimit @upstash/redis`
**Gotchas:** Free tier has request limits — apply rate limiting only to write/auth/AI endpoints, not every page view. Always include a fail-open path (`if (limiter unavailable) allow`) so a Redis outage does not bring down the app.

### Background jobs / queues / scheduled tasks

**Pick:** `inngest` — durable, event-driven functions with retries, fan-out, and cron, all hosted.
**Why:** Vercel functions cannot run beyond ~5 minutes; Inngest gives you durable workflows, scheduled jobs, and event-driven fan-out without managing a queue. For simple cron-only needs, prefer Vercel Cron + a route handler.
**Alternatives considered:** Trigger.dev — comparable, slightly heavier SDK. BullMQ — needs your own Redis worker, wrong shape for serverless. Vercel Cron — fine for time-based jobs, not for retries or chained workflows.
**Install:** `pnpm add inngest`
**Gotchas:** Inngest functions are exposed via a single route handler at `/api/inngest`. Local dev requires `pnpm dlx inngest-cli@latest dev` running alongside `next dev`.

### File uploads & storage

**Pick:** `@supabase/supabase-js` Storage API — already in the core stack.
**Why:** Avoids a second vendor; RLS-protected buckets; signed URLs for private content; CDN-cached delivery.
**Alternatives considered:** UploadThing — pleasant DX but adds a vendor. S3 + CloudFront — more knobs, more operational cost.
**Install:** included with core Supabase install.
**Gotchas:** Default bucket is public — explicitly set buckets to private and use signed URLs (`createSignedUrl`) for any user-owned content. File-size limits are per-bucket and per-plan; configure them when creating the bucket.

### AI SDK (LLM integration, streaming responses, tool use)

**Pick:** `ai` (Vercel AI SDK) + `@ai-sdk/anthropic` (or `@ai-sdk/openai` per project).
**Why:** Provider-agnostic, first-class streaming, RSC-aware (`streamUI`), tool-use schema validation via Zod, and zero adapter code for swapping models.
**Alternatives considered:** LangChain — too abstract for production app code, churn-heavy. Direct provider SDKs — no streaming helpers, no UI primitives.
**Install:** `pnpm add ai @ai-sdk/anthropic @ai-sdk/openai`
**Gotchas:** Streaming responses require route handlers, not server actions. The `useChat` hook is a Client Component. Always validate tool inputs with Zod schemas — model output is untrusted input.

### Vector search / embeddings

**Pick:** `pgvector` extension on Supabase, queried via Drizzle's `vector` column type.
**Why:** Keeps vectors in the same Postgres instance as your relational data — one query plan, RLS-protected, no second vendor.
**Alternatives considered:** Pinecone — fine but adds a vendor and forces eventual consistency between two stores. Weaviate / Qdrant — self-hosted overhead.
**Install:** Enable `pgvector` in the Supabase dashboard (Database → Extensions); column type already supported by Drizzle.
**Gotchas:** Index choice matters: `ivfflat` for static-ish corpora, `hnsw` for higher recall at cost of build time. Do not index until the table has at least a few thousand rows.

### CMS or content layer

**Pick:** `next-mdx-remote` + `gray-matter` for dev-managed content (blog, docs, marketing pages). Add `sanity` as a layered alternative when non-technical editors join.
**Why:** MDX in-repo is the lowest-overhead content path for a small team and version-controls naturally. Sanity is the right escalation when editors who do not write Markdown need to ship content.
**Alternatives considered:** Contentlayer — abandoned. Payload — heavier, self-hosted. Strapi — bloated. Notion-as-CMS — fragile API.
**Install:** `pnpm add next-mdx-remote gray-matter remark-gfm rehype-pretty-code`
**Gotchas:** Compile MDX on the server (RSC) — never ship `next-mdx-remote` to the client. For Sanity, isolate the studio under a `(studio)` route group so its bundle does not bleed into the marketing site.

### In-app search

**Pick:** Postgres full-text search (`tsvector` + GIN index) via Supabase as the default. Promote to `algolia` when fuzzy matching, typo tolerance, or instant search becomes a product requirement.
**Why:** Postgres FTS is free, RLS-respecting, and covers most internal-search needs. Algolia is the right escalation when search is a UX feature, not a utility.
**Alternatives considered:** Meilisearch / Typesense — self-hosted overhead. Elasticsearch — overkill at this scale.
**Install (Postgres FTS):** create a `tsvector` generated column and a GIN index in a Supabase migration.
**Install (Algolia, when needed):** `pnpm add algoliasearch`
**Gotchas:** Postgres FTS is language-specific — set `to_tsvector('english', ...)` (or your locale) explicitly. Sync Postgres → Algolia via a database trigger or Inngest function, never directly from the client.

### Unit testing

**Pick:** `vitest`.
**Why:** Vite-powered, near-instant cold starts, native TypeScript and ESM, Jest-compatible API.
**Alternatives considered:** Jest — slow, ESM friction. Node's built-in `node:test` — too bare for component-adjacent tests.
**Install:** `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`
**Gotchas:** Use `jsdom` only for component tests; default to `node` for pure logic to keep runs fast. Configure `vitest.config.ts` path aliases to mirror `tsconfig.json`.

### E2E testing

**Pick:** `@playwright/test`.
**Why:** Reliable cross-browser runner, built-in trace viewer, parallelization, network mocking, and visual diffs.
**Alternatives considered:** Cypress — single-process model, flaky with auth flows. Puppeteer — lower-level, more boilerplate.
**Install:** `pnpm add -D @playwright/test` then `pnpm dlx playwright install --with-deps`
**Gotchas:** Run E2E against a real preview deployment, not `localhost` in CI — Vercel preview URLs catch env-var drift. Use storage-state snapshots for authenticated tests instead of logging in per spec.

### Component / visual testing

**Pick:** `storybook` with `@storybook/nextjs` framework — only when building a reusable component library or shipping a design system. Skip otherwise; rely on Playwright screenshot tests for critical pages.
**Why:** Storybook is overhead for typical SaaS app code; it pays off when components are consumed in multiple contexts or built by a separate design team.
**Alternatives considered:** Ladle — lighter, less ecosystem. Histoire — Vue-first.
**Install:** `pnpm dlx storybook@latest init`
**Gotchas:** Storybook adds ~200MB to install and a separate build. Do not adopt it for a single app's internal components.

### Linting & formatting

**Pick:** `eslint` (Next flat config) + `prettier` + `prettier-plugin-tailwindcss`.
**Why:** Next.js ships an ESLint config, the Tailwind class-sort plugin only exists for Prettier, and the ecosystem (Sentry, Storybook, Drizzle) all assume ESLint.
**Alternatives considered:** Biome — much faster but no Next.js plugin and no Tailwind class sorter; revisit when those land.
**Install:** ESLint is scaffolded by `create-next-app`. Add: `pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier`
**Gotchas:** Disable ESLint's stylistic rules (`extends: ['next', 'prettier']`) so Prettier owns formatting. Lock the Prettier config (`.prettierrc`) at repo root, not inside `package.json`, to avoid IDE confusion.

### Git hooks

**Pick:** `husky` + `lint-staged`.
**Why:** Pre-commit lint/format on changed files only; standard, well-understood, low-magic.
**Alternatives considered:** `simple-git-hooks` — lighter but loses the on-install bootstrap. `lefthook` — fast but a less common pattern.
**Install:** `pnpm add -D husky lint-staged` then `pnpm exec husky init`
**Gotchas:** `husky init` writes `.husky/pre-commit` running `pnpm test` — replace it with `pnpm exec lint-staged`. Hooks must be re-installed after each `pnpm install` (Husky handles this via the `prepare` script).

### CI/CD

**Pick:** GitHub Actions (CI: typecheck, lint, test, build) + Vercel Git integration (CD: preview per PR, prod on `main`).
**Why:** GitHub Actions is free for public and generous for private; Vercel preview deployments per branch close the loop on E2E and visual review.
**Alternatives considered:** CircleCI — paid earlier. Vercel-only CI — limited to build-time checks, no test step.
**Install:** No package; commit `.github/workflows/ci.yml`. Connect the repo in Vercel.
**Gotchas:** Disable Vercel's automatic deploys on every commit and only deploy on PR + `main` to control build minutes. Set `VERCEL_TOKEN` and project IDs in GitHub secrets if invoking Vercel CLI from CI.

### Type-safe environment variables

**Pick:** `@t3-oss/env-nextjs` + `zod`.
**Why:** Validates env at boot, splits server-only vs. `NEXT_PUBLIC_*` client vars, and gives typed access via a single import.
**Alternatives considered:** Hand-rolled `process.env.X!` casts — silently ships missing vars. `dotenv-safe` — no type inference.
**Install:** `pnpm add @t3-oss/env-nextjs zod`
**Gotchas:** Define the schema in `env.ts` at the repo root and import it everywhere instead of `process.env`. Keep the `runtimeEnv` map exhaustive — missing keys at boot are caught immediately.

### Icons

**Pick:** `lucide-react`.
**Why:** Default for shadcn/ui, tree-shakeable, ~1500 icons, MIT licensed, consistent stroke style.
**Alternatives considered:** Heroicons — smaller set. React Icons — bundles every set, defeats tree-shaking. Phosphor — fine but mixing with shadcn defaults causes visual inconsistency.
**Install:** `pnpm add lucide-react`
**Gotchas:** Always import named (`import { Check } from 'lucide-react'`) — the default export imports the entire library.

### Date/time

**Pick:** `date-fns` (v4).
**Why:** Tree-shakeable, immutable, locale-aware, no monkey-patching of `Date`.
**Alternatives considered:** Day.js — smaller but mutable-ish API. Moment — frozen, large. Temporal — not stable yet.
**Install:** `pnpm add date-fns`
**Gotchas:** Always store and transmit timestamps as UTC ISO strings; convert to local time only at the render boundary. Use `date-fns-tz` if you need explicit IANA timezone handling.

### className / utility helpers (the `cn` pattern)

**Pick:** `clsx` + `tailwind-merge`, composed into a `cn` utility.
**Why:** `clsx` handles conditional class composition; `tailwind-merge` resolves conflicting Tailwind classes (`p-2 p-4` → `p-4`). Both are required.
**Alternatives considered:** Hand-written conditional strings — guaranteed bugs at the merge boundary. `classnames` — equivalent to `clsx` but slower.
**Install:** `pnpm add clsx tailwind-merge`
**Gotchas:** Define `cn` once in `lib/utils.ts` (shadcn scaffolds this); never inline `clsx` calls without `tailwind-merge` or class collisions will silently regress styling.

### Documentation site

**Pick:** `fumadocs` — only when a project needs a public docs site.
**Why:** Next.js-native, App Router-first, MDX-based, tree of content with automatic search; matches the rest of the stack.
**Alternatives considered:** Mintlify — paid hosted product. Nextra — older Pages Router roots. Docusaurus — separate React stack.
**Install:** `pnpm dlx create-fumadocs-app` (run inside a docs subroute or separate package).
**Gotchas:** Co-locate docs in the same Next.js app under a route group (`app/(docs)`) only if scope is small — extract to a separate Vercel project once docs grow past ~50 pages.

---

## 4. Architectural Conventions

### Server Components vs. Client Components — decision rules

Default to **Server Components**. Add `'use client'` only when the file needs at least one of:

- Browser APIs (`window`, `localStorage`, `IntersectionObserver`)
- React state or effects (`useState`, `useEffect`, `useReducer`)
- Event handlers (`onClick`, `onChange`)
- Third-party libraries that themselves use the above (R3F, motion, react-hook-form, TanStack Query, charting libs)

Push the `'use client'` boundary as far down the tree as possible — a client `<Button>` inside a server `<Page>` is correct; a client `<Page>` containing static content is wrong. Client Components can import Server Components only via the `children` prop, never via direct import.

### Data-fetching patterns

- **Server Components fetch directly via Drizzle / Supabase** — the default for any read that happens during render.
- **Server actions for mutations** — form submissions, button-triggered writes. Return a `Result` object (see error handling below).
- **TanStack Query on the client** — only for refetching, polling, optimistic updates, or infinite scroll. Hydrate from the server with `dehydrate`/`HydrationBoundary` if a client component needs initial data already fetched on the server.
- **Route handlers** — only for webhooks, OAuth callbacks, third-party-consumed APIs, and AI streaming endpoints.

### Supabase auth patterns

- Use `@supabase/ssr`'s `createServerClient` in middleware, server components, and server actions. Use `createBrowserClient` only inside Client Components.
- `middleware.ts` must call `supabase.auth.getUser()` to refresh the session cookie on every request — without this, sessions silently expire.
- All multi-tenant tables must have RLS enabled with policies keyed off `auth.uid()` and (where applicable) a `tenant_id` column. The service-role key bypasses RLS — only use it in server-only modules for admin tasks (cron jobs, webhooks).
- Read the user via `supabase.auth.getUser()` (verifies the JWT) — never via `getSession()` (trusts the cookie).

### Folder and route organization (App Router)

- **Route groups** `(group)` — for layout segmentation without URL impact. Use `(marketing)`, `(app)`, `(auth)` to give each section its own layout.
- **Parallel routes** `@slot` — for dashboards with independently loadable panels (e.g., `@analytics` + `@activity` rendered side by side).
- **Intercepting routes** `(.)`, `(..)` — for modal-over-page patterns where the modal has its own URL but renders within the previous page.
- **Private folders** `_components`, `_lib` — colocated, non-routable helpers next to the routes that use them.

### Where business logic lives

- `lib/` — pure utilities, types, constants, framework-agnostic helpers. No I/O.
- `lib/db/` — Drizzle schema, query helpers, migrations.
- `lib/supabase/` — `client.ts`, `server.ts`, `middleware.ts` clients only. No business logic.
- `app/_actions/` or per-route `_actions.ts` — server actions colocated with the routes that call them.
- `lib/services/` — cross-cutting domain logic called by both server actions and route handlers (e.g., `billing`, `email`, `ai`). Each service is server-only (`import 'server-only'` at the top).

### Error handling

- **`error.tsx`** at every route segment that can fail differently — show a recover-this-segment UI, not a global crash.
- **`not-found.tsx`** for 404s; pair with `notFound()` calls inside server components.
- **Server actions return a discriminated Result** — `type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: string }`. Never throw from a server action that the UI consumes; throw only in route handlers (which translate to HTTP).
- **Sentry catches the rest** — wrap top-level layouts with `Sentry.ErrorBoundary` or rely on the auto-instrumentation from `@sentry/nextjs`.

### Loading and streaming

- **`loading.tsx`** at every route segment whose data fetch can exceed ~200ms — provides automatic Suspense fallback.
- **Granular `<Suspense>` boundaries** inside pages — stream slow data (analytics charts, AI summaries) independently of fast data (header, nav).
- **`useOptimistic`** for any mutation whose server-confirmed result the user must see instantly — likes, toggles, list reorders, message sends.

### Environment variable strategy

- Single `env.ts` at repo root using `@t3-oss/env-nextjs` defining `server`, `client`, and `shared` schemas with Zod.
- Import `env` from `@/env` everywhere; never read `process.env` directly outside this file.
- `.env.local` for local secrets (gitignored). `.env.example` for the template (committed, no secrets). Vercel project settings for prod/preview.
- Validation runs at boot — missing or malformed vars fail the build, not the first request.

---

## 5. Recommended File Structure

```
.
├── app/
│   ├── (marketing)/                # Public marketing + landing routes (own layout)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (auth)/                     # Login, signup, password reset (own layout, no chrome)
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/                      # Authenticated product surface (own layout, gated by middleware)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   └── settings/
│   ├── api/                        # Route handlers — webhooks, OAuth, streaming AI, external APIs
│   │   ├── webhooks/
│   │   │   ├── stripe/route.ts
│   │   │   └── resend/route.ts
│   │   ├── inngest/route.ts
│   │   └── chat/route.ts           # AI streaming endpoint
│   ├── _actions/                   # Server actions shared across routes
│   ├── error.tsx                   # Root error boundary
│   ├── not-found.tsx               # Root 404
│   ├── layout.tsx                  # Root layout (providers, fonts, metadata)
│   └── globals.css                 # Tailwind v4 directives + theme tokens
├── components/
│   ├── ui/                         # shadcn/ui primitives — owned source
│   ├── forms/                      # react-hook-form-backed form components
│   ├── marketing/                  # Marketing-only components (hero, pricing, footer)
│   ├── app/                        # Authenticated-app components (sidebar, topbar)
│   └── three/                      # 3D scenes and R3F components (client-only)
├── lib/
│   ├── db/                         # Drizzle schema, queries, migrations
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── migrations/
│   ├── supabase/                   # SSR + browser + middleware clients
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── services/                   # Cross-cutting domain logic (billing, email, ai) — server-only
│   ├── utils.ts                    # cn() and other framework-agnostic helpers
│   └── validators/                 # Shared Zod schemas
├── content/                        # MDX content for blog, docs, legal pages
├── emails/                         # React Email templates
├── public/                         # Static assets — favicons, og images, fonts (if self-hosted)
├── tests/
│   ├── unit/                       # Vitest specs
│   └── e2e/                        # Playwright specs
├── .github/workflows/              # CI definitions
├── .husky/                         # Git hooks
├── env.ts                          # Type-safe env schema
├── middleware.ts                   # Auth session refresh + route gating
├── drizzle.config.ts               # Drizzle Kit config
├── next.config.ts                  # Next.js config
├── playwright.config.ts            # Playwright config
├── vitest.config.ts                # Vitest config
├── eslint.config.mjs               # ESLint flat config
├── .prettierrc                     # Prettier config
├── tsconfig.json                   # TS strict + noUncheckedIndexedAccess
└── package.json
```

---

## 6. Setup Commands — End-to-end

```bash
# 1. Scaffold Next.js with strict TS, Tailwind, App Router, Turbopack, src-less
# Replace PROJECT_NAME below with your actual project name (lowercase, hyphens OK, no spaces).
pnpm create next-app@latest PROJECT_NAME --typescript --tailwind --eslint --app --turbopack --import-alias "@/*" --use-pnpm
cd PROJECT_NAME

# 2. Tighten TS — edit tsconfig.json: set "strict": true and add "noUncheckedIndexedAccess": true

# 3. Initialize shadcn/ui (pick "new-york", neutral base color, CSS variables)
pnpm dlx shadcn@latest init

# 4. Core deps — Supabase + Drizzle + Zod + env
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres zod @t3-oss/env-nextjs
pnpm add -D drizzle-kit

# 5. Forms + state + tables
pnpm add react-hook-form @hookform/resolvers zustand @tanstack/react-query @tanstack/react-query-devtools @tanstack/react-table

# 6. UI helpers + icons + dates + motion
pnpm add lucide-react date-fns motion clsx tailwind-merge

# 7. Email (transactional + React templates)
pnpm add resend @react-email/components @react-email/render
pnpm add -D react-email

# 8. Payments
pnpm add stripe @stripe/stripe-js

# 9. Observability — analytics, errors, logs, web vitals
pnpm add posthog-js posthog-node @sentry/nextjs pino @vercel/analytics @vercel/speed-insights

# 10. Platform — flags, rate limiting, jobs
pnpm add @vercel/flags @upstash/ratelimit @upstash/redis inngest

# 11. AI SDK (add provider packages per project)
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai

# 12. Content layer (MDX)
pnpm add next-mdx-remote gray-matter remark-gfm rehype-pretty-code

# 13. Dev tooling — testing, lint, format, hooks
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier
pnpm add -D husky lint-staged
pnpm dlx playwright install --with-deps
pnpm exec husky init
# Bash:
echo "pnpm exec lint-staged" > .husky/pre-commit
# Windows PowerShell — must write UTF-8 no-BOM with LF or Git cannot execute the hook:
#   $utf8NoBom = New-Object System.Text.UTF8Encoding $false
#   [System.IO.File]::WriteAllText(".husky/pre-commit", "pnpm exec lint-staged`n", $utf8NoBom)

# 14. Sentry wizard — configures sentry.client/server/edge.config.ts and source-map upload
pnpm dlx @sentry/wizard@latest -i nextjs

# 15. Add some shadcn primitives to start
pnpm dlx shadcn@latest add button card dialog dropdown-menu form input label select sonner table tabs

# 16. Initialize Supabase locally (requires Docker)
pnpm dlx supabase@latest init
pnpm dlx supabase@latest start

# 17. Scaffold env.ts and .env files
touch env.ts
cat > .env.example <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
SENTRY_AUTH_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
EOF
cp .env.example .env.local

# 18. Git baseline + first commit
git init
git add .
git commit -m "chore: initialize baseplate"

# 19. Run dev server
pnpm dev
```

---

## 7. Per-Project-Type Add-ons

### SaaS dashboard

```bash
pnpm add @tanstack/react-table recharts
pnpm dlx shadcn@latest add data-table sheet command avatar badge skeleton
```

Enable RLS on every tenant-scoped table. Add `tenant_id` to all multi-tenant tables and a Postgres RLS policy: `auth.uid() = user_id AND tenant_id = current_tenant()`. Wire Stripe Customer Portal for self-serve billing.

### Marketing site

```bash
pnpm add next-mdx-remote gray-matter remark-gfm rehype-pretty-code reading-time
pnpm dlx shadcn@latest add accordion navigation-menu
```

Generate `sitemap.ts` and `robots.ts` in the App Router. Add OpenGraph image generation via `app/og/route.tsx` using `next/og`. Set `metadataBase` in the root layout.

### Internal tool

```bash
pnpm add @tanstack/react-table
pnpm dlx shadcn@latest add data-table command sheet dialog form
```

Skip marketing dependencies. Gate every route in `(app)` behind a role check in middleware (`profiles.role IN ('admin','staff')`). Disable PostHog session replay if the tool handles sensitive data.

### 3D experience

```bash
pnpm add three @react-three/fiber @react-three/drei leva
pnpm add -D @types/three
```

Wrap the entire `<Canvas>` tree in `dynamic(() => import('./scene'), { ssr: false })`. Lazy-load heavy GLTF assets via `useGLTF.preload`. Add `<Stats />` from drei in dev only and strip from prod via env-gated rendering.

### AI app

```bash
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai
pnpm add @upstash/ratelimit @upstash/redis
```

Streaming endpoints live in `app/api/chat/route.ts` returning `result.toAIStreamResponse()`. Rate-limit per user (not per IP) via Upstash. Enable `pgvector` in Supabase and add a `vector(1536)` column to your embeddings table. Validate every tool input with Zod.

---

## 8. Quickstart Checklist

1. Run `pnpm create next-app@latest PROJECT_NAME --typescript --tailwind --eslint --app --turbopack --import-alias "@/*" --use-pnpm` (substitute your actual project name for `PROJECT_NAME`).
2. Edit `tsconfig.json`: set `"strict": true` and add `"noUncheckedIndexedAccess": true`.
3. Run `pnpm dlx shadcn@latest init` and accept defaults (new-york, neutral, CSS variables).
4. Install all dependency groups from section 6 steps 4–13 in order.
5. Run `pnpm dlx playwright install --with-deps`.
6. Run `pnpm exec husky init` and overwrite `.husky/pre-commit` with `pnpm exec lint-staged`.
7. Run `pnpm dlx @sentry/wizard@latest -i nextjs` and follow the prompts.
8. Run `pnpm dlx shadcn@latest add button card dialog dropdown-menu form input label select sonner table tabs`.
9. Run `pnpm dlx supabase@latest init` and `pnpm dlx supabase@latest start` (Docker required).
10. Create `env.ts` defining the env schema with `@t3-oss/env-nextjs` and Zod, mirroring the keys in `.env.example` from section 6 step 17.
11. Create `.env.example` and `.env.local` from the template in section 6 step 17; populate `.env.local` with local Supabase output and dev keys for Resend, Stripe, PostHog, Upstash, Inngest, Anthropic, OpenAI.
12. Create `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/middleware.ts` per the `@supabase/ssr` App Router pattern.
13. Create `middleware.ts` at repo root that calls `supabase.auth.getUser()` and gates `/(app)` routes by session presence.
14. Create `lib/db/schema.ts` with Drizzle definitions and `drizzle.config.ts` pointing at `DATABASE_URL`.
15. Create `lib/utils.ts` exporting `cn` (clsx + tailwind-merge composition).
16. Create `app/layout.tsx` providers wrapper including PostHog, TanStack Query, and shadcn `Toaster`.
17. Add `app/error.tsx`, `app/not-found.tsx`, and `app/loading.tsx` with shadcn-styled fallbacks.
18. Run `git init && git add . && git commit -m "chore: initialize baseplate"`.
19. Push to GitHub and connect the repo to Vercel; add all env vars from `.env.example` to Vercel project settings (Production + Preview).
20. Run `pnpm dev` and verify the dev server, the home page, and a sample authenticated route render without errors.
