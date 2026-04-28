---
description: Generate and apply a Drizzle migration after a schema change
argument-hint: '<change description>'
---

The user wants a Drizzle migration for: `$ARGUMENTS`.

Steps:

1. Review the requested change against `lib/db/schema.ts`. If the change requires schema edits, propose the diff and wait for confirmation before writing.

2. Apply the schema edits.

3. Generate the migration:

   ```bash
   pnpm drizzle-kit generate
   ```

4. Inspect the generated SQL in `lib/db/migrations/`. If anything looks destructive or unintended (DROP COLUMN, DROP TABLE, RENAME without `--breaking`), STOP and surface the diff to the user.

5. If Supabase is running locally and the user confirms, apply:

   ```bash
   pnpm drizzle-kit migrate
   ```

6. If the change touches a multi-tenant or user-owned table that requires RLS, use `/new-rls-policy <table> <scope>` to generate the policy SQL and append it to the migration (or create a sibling `*_rls_<table>.sql`).

Constraints:

- NEVER auto-apply a migration that drops a column or table without explicit user confirmation.
- All multi-tenant tables require RLS — verify the policy exists before considering the migration complete.
- Migration filenames remain Drizzle Kit's timestamped defaults; do not rename.
- After schema edits, re-export `$inferSelect` / `$inferInsert` types so downstream code can pick them up.
