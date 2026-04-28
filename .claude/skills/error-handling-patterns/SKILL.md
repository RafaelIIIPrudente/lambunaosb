---
name: error-handling-patterns
description: Use whenever writing server actions, route handlers, or boundary components in this project — covers Result types, error.tsx placement, Sentry conventions, and the throw-vs-return rule
---

# Error Handling Patterns

## Throw vs return — the rule

| Context                        | Strategy                               |
| ------------------------------ | -------------------------------------- |
| Server action consumed by UI   | Return `Result<T>` — never throw       |
| Route handler (HTTP)           | Throw — converted to HTTP response     |
| Server Component data fetch    | Throw — caught by `error.tsx` boundary |
| Client Component event handler | `try/catch` + show user feedback       |

The reason: server actions are RPC, and unhandled errors leak as unstyled crashes. `Result` types make every failure mode visible to the type system and let the UI render appropriate feedback per `code`.

## Result type — define once, reuse

```typescript
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; code: string };
export type Result<T> = Ok<T> | Err;
```

- `code` — machine-checkable conditions: `UNAUTHORIZED`, `INVALID_INPUT`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`. Add new codes as needed.
- `error` — human-readable message safe to show in the UI.

## error.tsx placement

Add `error.tsx` at every route segment where:

- The data fetch can fail in a domain-meaningful way (missing tenant, deleted resource)
- The recovery action is segment-local (`reset()` should retry just this segment, not crash the whole app)

Top-level `app/error.tsx` is the catch-all. Per-segment `error.tsx` is for finer recovery UX.

```typescript
'use client';

import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## Sentry conventions

`@sentry/nextjs` auto-instruments server, client, and edge runtimes — no manual `Sentry.captureException` is needed for thrown errors.

Use `Sentry.captureException(e, { extra: { ... } })` ONLY when:

- You catch an error and continue (so it would otherwise be lost from telemetry)
- You return a `Result.err` from a server action (so the error path is observable in production despite the clean Result returned to UI)

Set `tracesSampleRate` low in production (`0.1` or lower) to control cost.

NEVER log raw request bodies, tokens, or PII into Sentry context. Configure `beforeSend` to strip sensitive fields.

## Anti-patterns to refuse

- DO NOT throw from server actions consumed by UI.
- DO NOT swallow errors silently. Either return `Result.err` or rethrow.
- DO NOT use `try/catch` to mask programming errors — fix the bug.
- DO NOT log secrets, tokens, or full request bodies.
- DO NOT place a single `app/error.tsx` and rely on it for every segment — you lose granular recovery UX.
- DO NOT create a `Result` type per file — import the canonical one from `@/lib/types/result.ts`.
