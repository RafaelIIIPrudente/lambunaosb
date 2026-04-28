---
name: supabase-patterns
description: Use whenever working with Supabase auth, RLS, or storage in this project — covers @supabase/ssr setup, getUser() over getSession(), service-role isolation, and RLS conventions
---

# Supabase Patterns

Supabase is the SOLE auth provider for this project. Never suggest Clerk, Auth.js, NextAuth, or any alternative.

## Three clients

| File                         | Used in                               | Constructor                                                                    |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/supabase/client.ts`     | Client Components only                | `createBrowserClient` from `@supabase/ssr`                                     |
| `lib/supabase/server.ts`     | RSC + server actions + route handlers | `createServerClient` from `@supabase/ssr` with `cookies()` from `next/headers` |
| `lib/supabase/middleware.ts` | `middleware.ts` only                  | `createServerClient` with the request/response cookie store                    |

ALL three are constructed via `@supabase/ssr`. NEVER use `@supabase/auth-helpers-nextjs` (deprecated).

## Reading the user

Use `supabase.auth.getUser()` — it verifies the JWT against Supabase's auth server.

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  // redirect to login or notFound() depending on context
}
```

NEVER use `supabase.auth.getSession()` from server code — it trusts the cookie blindly without verification. The only legitimate place for `getSession()` is inside the middleware client where the session is being explicitly refreshed.

## Middleware session refresh

`middleware.ts` must call `getUser()` on every protected request:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

Without this call, cookies expire and users get silently logged out.

## RLS policy conventions

Every multi-tenant or user-owned table MUST have RLS enabled with policies keyed off `auth.uid()`:

```sql
alter table public.<table> enable row level security;

create policy "<table>_select_own" on public.<table>
  for select using (auth.uid() = user_id);
```

For tenant-scoped tables, add a `tenant_id` column and join to `profiles` or `tenant_users` for the membership check.

NEVER rely on application-layer authorization alone. RLS is the security boundary; application checks are belt-and-suspenders.

## Service-role isolation

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It must NEVER:

- Be exposed to the browser (no `NEXT_PUBLIC_*` prefix)
- Appear in any Client Component (directly or transitively)
- Appear in any module reachable from a Client Component import graph

Encapsulate service-role usage in a server-only module:

```typescript
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export const adminSupabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
```

Use it only for: webhook handlers, cron jobs, background tasks (Inngest), and explicit admin paths.

## Storage

Buckets are private by default in this project. For user-owned content, generate signed URLs:

```typescript
const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
```

For public content (e.g., marketing images, public avatars), create a dedicated public bucket and document why it is public.

## Anti-patterns to refuse

- DO NOT use `getSession()` from server code.
- DO NOT use `@supabase/auth-helpers-nextjs`.
- DO NOT pass the service-role key to a Client Component.
- DO NOT insert into a multi-tenant table from a non-RLS-protected path.
- DO NOT skip the middleware `getUser()` call — sessions will expire silently.
- DO NOT trust `auth.email_confirmed_at` for security gates without re-verifying via `getUser()`.
