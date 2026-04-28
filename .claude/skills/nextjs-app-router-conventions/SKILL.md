---
name: nextjs-app-router-conventions
description: Use whenever writing Next.js code in this project — covers RSC vs Client decisions, server actions vs route handlers, Suspense and streaming, error.tsx vs not-found.tsx, and route organization
---

# Next.js App Router Conventions

This project uses the App Router with Server Components as the default. Apply these rules to every Next.js file you produce.

## Server Components vs Client Components — decision tree

Default to Server Components. Add `'use client'` ONLY when the file needs at least one of:

- Browser APIs (`window`, `document`, `localStorage`, `IntersectionObserver`)
- React hooks that require state or effects (`useState`, `useEffect`, `useReducer`, `useRef` for DOM)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Third-party libraries that themselves require the above (R3F, motion, react-hook-form, TanStack Query, charting libs)

Push the boundary as far down as possible. A Client `<Button>` inside a Server `<Page>` is correct. A Client `<Page>` containing static content is wrong.

Client Components consume Server Components ONLY via the `children` prop. Direct imports from Client → Server fail at build time.

## Server actions vs route handlers — boundary

| Use case                                                      | Choose        |
| ------------------------------------------------------------- | ------------- |
| Form submission, button-triggered mutation, optimistic UI     | Server action |
| Webhook receiver (Stripe, Resend, etc.)                       | Route handler |
| Third-party OAuth callback                                    | Route handler |
| Endpoint consumed by a non-Next client (mobile, external API) | Route handler |
| AI streaming response (raw `Response` control)                | Route handler |
| Auth confirmation or magic link                               | Route handler |

Server actions enforce origin checks that reject third-party POSTs — never use them for webhooks.

## Middleware

`middleware.ts` at repo root must call `supabase.auth.getUser()` on every protected request to refresh the session cookie. Without that call, sessions silently expire after the cookie max-age.

Match config should exclude static assets:

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

## Suspense and streaming

- Add `loading.tsx` at every route segment whose data fetch can exceed ~200ms.
- Add granular `<Suspense>` boundaries inside pages to stream slow widgets independently of fast ones.
- Use `useOptimistic` for any mutation whose server-confirmed result the user must see instantly (likes, toggles, list reorders, message sends).

## error.tsx vs not-found.tsx

- `error.tsx` (Client Component) — catches uncaught errors thrown during render or data fetch in this segment. Receives `{ error, reset }`. Use for unexpected failures that warrant a retry.
- `not-found.tsx` (Server Component) — paired with explicit `notFound()` calls. Use for missing-resource cases.

A segment can have BOTH — `error.tsx` for unexpected failures and `not-found.tsx` for explicit 404s.

## Route organization

- **Route groups** `(group)` — layout segmentation without URL impact. Used here as `(marketing)`, `(auth)`, `(app)` to give each section its own layout.
- **Parallel routes** `@slot` — independently loadable panels in dashboards (e.g., `@analytics` + `@activity` rendered side by side).
- **Intercepting routes** `(.)`, `(..)` — modal-over-page where the modal has its own URL.
- **Private folders** `_components`, `_actions`, `_lib` — colocated, non-routable.

## Anti-patterns to refuse

- DO NOT call `dynamic(..., { ssr: false })` from a Server Component. Wrap in a Client Component first.
- DO NOT introduce CSS-in-JS runtimes. Tailwind only.
- DO NOT bypass `error.tsx` with global try/catch in pages.
- DO NOT fetch data on the client when a Server Component can fetch it on the server.
- DO NOT use server actions for webhooks or OAuth callbacks.
