---
description: Generate Postgres RLS policy SQL for a Supabase table
argument-hint: <table-name> [user-scoped|tenant-scoped|public-read]
---

The user wants an RLS policy for: `$ARGUMENTS`.

Determine the scoping pattern. If not specified, ask: user-scoped, tenant-scoped, or public-read?

Generate the SQL:

```sql
-- Enable RLS first; an RLS-enabled table with no policies rejects all access (secure default)
alter table public.<table> enable row level security;

-- User-scoped: rows owned by auth.uid()
create policy "<table>_select_own" on public.<table>
  for select using (auth.uid() = user_id);

create policy "<table>_insert_own" on public.<table>
  for insert with check (auth.uid() = user_id);

create policy "<table>_update_own" on public.<table>
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "<table>_delete_own" on public.<table>
  for delete using (auth.uid() = user_id);
```

For **tenant-scoped**, add to each policy:

```sql
and tenant_id = (select tenant_id from public.profiles where id = auth.uid())
```

For **public-read**: SELECT policy is `using (true)`; writes still require `auth.uid()` ownership.

Place the SQL in a Drizzle migration file (`lib/db/migrations/<timestamp>_rls_<table>.sql`) so it lives alongside schema changes. Apply via:

```bash
pnpm drizzle-kit migrate
```

Constraints:

- Always enable RLS BEFORE adding policies.
- The service role bypasses all RLS; it must NEVER be used from a Client Component, an unprotected route handler, or any code reachable from the browser.
- Verify policies via the Supabase dashboard SQL editor (impersonate as anon and as an authenticated user) or a unit test.
- For `auth.users` foreign keys, use `references(() => sql\`auth.users(id)\`)`since`auth.users` lives outside the public schema.
