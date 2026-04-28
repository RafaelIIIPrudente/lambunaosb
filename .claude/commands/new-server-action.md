---
description: Create a server action with Zod input, Result return, and server-only import
argument-hint: <ActionName> [purpose]
---

The user wants a new server action: `$ARGUMENTS`.

Determine the action's purpose. If input fields and side effects are unclear, ask.

Create at `app/_actions/<action-name>.ts` (or colocated next to the route that consumes it):

```typescript
'use server';

import 'server-only';
import { z } from 'zod';
// import { createClient } from '@/lib/supabase/server';
// import { db } from '@/lib/db/client';

const InputSchema = z.object({
  // fields
});

type Input = z.infer<typeof InputSchema>;

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; code: string };
type Result<T> = Ok<T> | Err;

export async function actionName(raw: unknown): Promise<
  Result<{
    /* return shape */
  }>
> {
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message, code: 'INVALID_INPUT' };
  }

  // Authorize — prefer auth.getUser() (verifies JWT), never getSession()
  // const supabase = await createClient();
  // const { data: { user }, error: authError } = await supabase.auth.getUser();
  // if (authError || !user) return { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };

  try {
    // Mutation via Drizzle (auth-role connection) or Supabase
    return {
      ok: true,
      data: {
        /* ... */
      },
    };
  } catch (e) {
    // Sentry auto-captures the throw via @sentry/nextjs instrumentation;
    // return a sanitized error to the UI.
    return { ok: false, error: 'Internal error', code: 'INTERNAL' };
  }
}
```

Constraints:

- Top-of-file order is mandatory: `'use server'` first, then `import 'server-only'` immediately after, then other imports.
- NEVER throw from a server action consumed by UI — return a `Result<T>`.
- Always `safeParse` the input. Never trust caller-typed values.
- For authenticated actions, always use `supabase.auth.getUser()` — never `getSession()`.
- The service-role Supabase client is permitted only for genuinely admin paths and must be encapsulated in a server-only service module.
- Never log raw input, tokens, or secrets.
