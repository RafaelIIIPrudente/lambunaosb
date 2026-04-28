---
name: drizzle-patterns
description: Use when defining database schemas, writing queries, or generating migrations with Drizzle ORM in this project — covers RLS-aware connection roles and migration workflow
---

# Drizzle Patterns

This project uses Drizzle ORM (`drizzle-orm` with the `postgres` driver) on Supabase Postgres.

## Schema definition

All tables live in `lib/db/schema.ts`. Use `pgTable`:

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

Always export both `$inferSelect` and `$inferInsert` types. Use them everywhere downstream instead of redefining shapes.

For relations, use `relations()`:

```typescript
import { relations } from 'drizzle-orm';

export const projectsRelations = relations(projects, ({ one }) => ({
  owner: one(users, { fields: [projects.userId], references: [users.id] }),
}));
```

## Connection roles — RLS awareness

Two connections, used for different paths:

1. **Auth-role connection** (`lib/db/client.ts`) — created with the user's JWT so Postgres applies RLS policies on every query. Use this for the vast majority of queries (server actions, RSC reads, anything user-scoped).

2. **Service-role connection** (`lib/db/admin-client.ts`) — bypasses RLS. Use ONLY for genuinely admin paths: webhooks, cron, system migrations. Server-only (`import 'server-only'`).

NEVER mix them. A query made from a server action authorizing a user must use the auth-role connection. Using the service role bypasses the very RLS policies that protect the user from themselves.

## Migration workflow

1. Edit `lib/db/schema.ts`.
2. Generate the SQL:
   ```bash
   pnpm drizzle-kit generate
   ```
3. Inspect the generated SQL in `lib/db/migrations/`. If anything looks destructive, STOP.
4. Apply:
   ```bash
   pnpm drizzle-kit migrate
   ```

For RLS, append `alter table ... enable row level security;` and `create policy ...` to the same migration file or a sibling SQL file.

## Query style

- Use Drizzle's query builder for typed queries.
- Use `relations()` and `with: { ... }` for join definitions — more readable than manual joins.
- For SQL escape hatches, use `sql\`<template>\`` — never string-concat user input into SQL.
- Use prepared statements (`.prepare(...)`) for hot paths to skip query-plan rebuilds.

## Anti-patterns to refuse

- DO NOT import `drizzle-kit` (the migration toolkit) into runtime code; it's a CLI dependency only.
- DO NOT use the service-role connection from a server action that authorizes a user — it bypasses the RLS that protects the user.
- DO NOT delete schema columns without an explicit migration step that confirms data preservation.
- DO NOT skip generating types after schema changes — downstream code relies on `$inferSelect` / `$inferInsert`.
- DO NOT use the deprecated `pg` driver — this project uses `postgres` for edge compatibility.
