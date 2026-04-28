---
description: Scaffold an App Router route with page/loading/error and optional layout
argument-hint: <route-path> [route-group] [--with-layout]
---

The user wants a new App Router route: `$ARGUMENTS`.

Parse:

- Route path (e.g., `dashboard/settings`)
- Optional route group (e.g., `(app)`, `(marketing)`, `(auth)`)
- Whether a layout is needed (`--with-layout` flag, or implied because this is a section root)

Create under `app/<group>/<route-path>/`:

1. **`page.tsx`** — Server Component by default. Exports `default async function Page()`. If SEO matters for this route, also export `generateMetadata`.

2. **`loading.tsx`** — Suspense fallback using shadcn `Skeleton` primitives matching the page's layout (avoid layout shift).

3. **`error.tsx`** — Client Component (`'use client'`), props `{ error: Error & { digest?: string }; reset: () => void }`. Renders shadcn `Alert` + `Button` for `reset`.

4. **`layout.tsx`** — only if `--with-layout` is requested or this is a route-group root. Server Component, accepts `Readonly<{ children: React.ReactNode }>`.

If the route is auth-gated and lives under `(app)`, verify `middleware.ts` already guards this segment. If not, surface the gap.

If the route is part of a marketing section, verify `metadataBase` is set in the parent layout.

Constraints:

- TypeScript strict — type props explicitly. Use `Readonly<{...}>` for layout/page props.
- Server Components fetch directly via Drizzle/Supabase. Do not introduce client-side fetching unless the data is interactive (then TanStack Query in a Client Component).
- `loading.tsx` and `error.tsx` must visually match `page.tsx` to avoid layout shift.
- For dynamic segments `[slug]`, implement `generateStaticParams` if the data is build-time-knowable.
