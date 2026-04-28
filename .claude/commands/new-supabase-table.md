---
description: Full pipeline — Drizzle schema entry + migration + RLS policies for a new table
argument-hint: <table-name> [scoping: user|tenant|public-read]
---

The user wants a new Supabase table: `$ARGUMENTS`.

This is a multi-step pipeline. Confirm the table name, columns, and scoping with the user before any writes.

**Step 1 — Drizzle schema entry**

Edit `lib/db/schema.ts` to add the table. Use Drizzle's `pgTable`. Required defaults:

- `id: uuid('id').primaryKey().defaultRandom()`
- `created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`
- `updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()`

Plus, by scoping:

- **user-scoped**: `userId: uuid('user_id').notNull()` referencing `auth.users(id)` with `onDelete: 'cascade'`.
- **tenant-scoped**: `tenantId: uuid('tenant_id').notNull()` referencing `tenants.id` with `onDelete: 'cascade'`, plus `userId` as above.

Export both type aliases:

```typescript
export type <TableName> = typeof <table>.$inferSelect;
export type New<TableName> = typeof <table>.$inferInsert;
```

**Step 2 — Generate the migration**

```bash
pnpm drizzle-kit generate
```

Review the generated SQL in `lib/db/migrations/`.

**Step 3 — RLS policy**

Use `/new-rls-policy <table-name> <scoping>` to generate the policy SQL. Append it to the same migration file or create a sibling `_rls_<table>.sql`.

**Step 4 — Apply**

```bash
pnpm drizzle-kit migrate
```

Constraints:

- RLS must be enabled and policies attached BEFORE the table receives data from any non-admin path.
- For `auth.users` foreign keys, declare via `references(() => sql\`auth.users(id)\`)`since`auth.users`is in the`auth`schema, not`public`.
- Never apply schema changes that drop data without explicit user confirmation.
- Re-run any code-gen that depends on schema types after the migration.
