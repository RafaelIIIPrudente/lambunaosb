# SB Lambunao — Phase 5 Wire-Up Runbook

**When to read this:** when the Supabase project exists (or you're about to create it) and you want the app to switch from `MOCK_DATA=true` browse-only mode to a fully-live database + auth + audit trail.

**Time:** ~15 minutes end-to-end. Most of it is dashboard clicks; the actual code/CLI bits are 3 commands.

**Status before you start:** Phase 5 code is on disk — schemas, validators, queries, server actions, RLS SQL files, seed script, auth pages, audit helper, Turnstile helper, email templates. All you need is a real Supabase project to point everything at.

---

## 0. One-time prerequisites

Run once on your machine if you haven't already:

```bash
pnpm install
pnpm add -D tsx
```

`tsx` runs the seed script — it lets `pnpm db:seed` start fast without `pnpm dlx tsx` lookups every time.

---

## 1. Create the Supabase project (5 min)

1. Go to https://supabase.com/dashboard.
2. **New project**. Pick your org (`RafaelIIIPrudente's Org` per current state).
3. **Project name:** `SB Lambunao`.
4. **Database password:** generate a strong one and save it in 1Password — Supabase shows it once.
5. **Region:** **Southeast Asia (Singapore) — `ap-southeast-1`**. Closest to Iloilo; matches your `SolarTym` project's region.
6. **Pricing plan:** Free works for setup and smoke testing. Upgrade the org to **Pro** before launch — Free pauses inactive projects after 1 week, caps DB at 500 MB, and only allows 2 active projects per org.
7. Click **Create new project**. Wait ~2 minutes for the database to provision.

While it provisions, open these tabs in advance:

- Project settings → **Data API**
- Project settings → **Database**
- Authentication → **Users**
- SQL Editor

---

## 2. Fill `.env.local` (3 min)

If you don't have one yet, copy the template:

```bash
cp .env.example .env.local
```

Fill these from the Supabase dashboard:

| Env var                                | Where to find it                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project settings → Data API → **Project URL**                                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project settings → Data API → **publishable key** (starts with `sb_publishable_`)                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`            | Project settings → Data API → **service_role key** (starts with `sb_secret_`). Click "Reveal" first. **Server-only — never expose to client code.**             |
| `DATABASE_URL`                         | Project settings → Database → Connection string → **URI** tab → choose **Session pooler** (port 5432). Replace `[YOUR-PASSWORD]` with the password from step 1. |
| `NEXT_PUBLIC_SITE_URL`                 | `http://localhost:3000` for local dev; your production URL for Vercel                                                                                           |

Then flip the dev escape hatches **off**:

```
AUTH_ENABLED=true
MOCK_DATA=false
```

(Or delete the lines — both default to the production-safe value.)

Optional, leave blank until you wire them in Phase 6:

- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` / `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`

---

## 3. Push the schema (1 min)

```bash
pnpm db:push
```

This runs Drizzle Kit against `DATABASE_URL` and creates all 18 tables + 17 enums + indexes. You'll see a generated SQL preview; type `y` to apply.

**Verify** in Supabase dashboard → Table Editor → you should see: `tenants`, `sb_members`, `profiles`, `committees`, `committee_assignments`, `meetings`, `audio_chunks`, `transcripts`, `transcript_segments`, `resolutions`, `resolution_versions`, `news_posts`, `citizen_queries`, `citizen_query_replies`, `audit_log_entries`, `translations`, `deletion_requests`, `attachments`.

---

## 4. Apply RLS policies (3 min)

This is the only **manual paste** step. Open Supabase dashboard → **SQL Editor** → **New query**, then for each file in `lib/db/policies/` **in numerical order**:

```
00_helpers.sql
01_tenants.sql
02_sb_members.sql
03_profiles.sql
04_committees.sql
05_committee_assignments.sql
06_meetings.sql
07_audio_chunks.sql
08_transcripts.sql
09_transcript_segments.sql
10_resolutions.sql
11_resolution_versions.sql
12_news_posts.sql
13_citizen_queries.sql
14_citizen_query_replies.sql
15_audit_log_entries.sql
16_translations.sql
17_deletion_requests.sql
18_attachments.sql
```

Paste the file's contents into the editor → **Run** → confirm "Success" → next file.

**Why numerical order matters:** `00_helpers.sql` defines `public.current_tenant_id()` and `public.current_user_role()`, and every per-table policy file references them. Run helpers first.

**Verify** in dashboard → Authentication → Policies. Each table should show 4–5 policies. The `audit_log_entries`, `audio_chunks`, `citizen_query_replies`, and `resolution_versions` tables intentionally have no UPDATE/DELETE policies (append-only).

---

## 5. Seed the tenant + members (1 min)

```bash
pnpm db:seed
```

Output:

```
Seeding lambunao tenant...
  tenant created: <uuid>
  committees: inserted 13, total 13
  members: inserted 8, total 8; committee assignments inserted 14

Next step: create the Secretary auth user in the Supabase dashboard,
then run `pnpm db:link-secretary <UUID>` to link their profile.
```

The script is **idempotent** — safe to re-run. It checks for existing rows first and only inserts new ones.

**Verify** in dashboard → Table Editor → `tenants` (1 row, `slug='lambunao'`), `committees` (13 rows), `sb_members` (8 rows), `committee_assignments` (14 rows).

---

## 6. Create the Secretary auth user (2 min)

1. Supabase dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
2. **Email:** `sec@lambunao.gov.ph` (or whatever the Secretary's real email is).
3. **Password:** generate a strong one. Save in 1Password — this is the production admin password.
4. **Auto Confirm User:** ✓ check this so they can sign in immediately.
5. **Create user**.
6. From the row that appears, copy the **UID** (UUID column, e.g. `e8f3c1a2-...`).

---

## 7. Link the Secretary profile (30 sec)

```bash
pnpm db:link-secretary <PASTE-THE-UUID>
```

Output:

```
Linking secretary profile to auth user e8f3c1a2-...
  profile created: e8f3c1a2-... → secretary
Done.
```

This inserts a `profiles` row keyed to that auth user UUID with `role='secretary'`, `tenant_id` linked to the lambunao tenant, default fullName/title/email. (You can edit those later via `/admin/settings`.)

---

## 8. Smoke test (3 min)

```bash
pnpm dev
```

Open http://localhost:3000 and walk through:

| Page                   | Expected                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | Landing renders. "Latest news" section may be empty (no news seeded — that's fine)                                                             |
| `/members`             | 7 members render in the grid (Mayor hidden per `showOnPublic=false`)                                                                           |
| `/members/<click any>` | Member detail page renders with bio + activity stub                                                                                            |
| `/about`               | Static about page + RA 10173 strip render                                                                                                      |
| `/submit-query`        | Form renders. Try submitting — you should land on `/submit-query/confirmation?ref=Q-2026-XXXX` and a real row should land in `citizen_queries` |
| `/admin/dashboard`     | First time: redirects to `/login?redirectTo=/admin/dashboard`                                                                                  |
| `/login`               | Sign in with the Secretary email + password from step 6. Should redirect to `/admin/dashboard`                                                 |
| `/admin/dashboard`     | Renders chrome + 2×2 cards. Empty data is OK                                                                                                   |
| `/admin/members`       | 7 members render (Mayor still hidden per the query filter)                                                                                     |
| `/admin/queries`       | Should show your test submission from earlier with `New` badge                                                                                 |
| `/admin/queries/<id>`  | Detail page renders. Try the "Mark answered" button                                                                                            |
| `/admin/audit`         | Should now show `citizen_query.submitted` and `citizen_query.status_updated` rows                                                              |
| `/admin/news/new`      | Compose a draft, click Publish. It should appear at `/news`                                                                                    |

Visit `/admin/audit` after every action — every mutation should produce an entry. That's the audit trail working.

---

## 9. (Optional) Customize the Supabase email templates

Supabase sends its own auth emails (password reset, magic link, invite). To brand them with the SB Lambunao look:

1. Render `emails/password-reset.tsx` → HTML via React Email (`pnpm dlx react-email export emails`)
2. Paste the rendered HTML into Supabase dashboard → Authentication → Email templates → Reset Password
3. Use the magic-link template variable `{{ .ConfirmationURL }}` in place of the example URL

(You can defer this — Supabase's defaults are functional, just plain.)

---

## Troubleshooting

| Symptom                                                                     | Cause                                                                                                                                                   | Fix                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tenant "lambunao" not found`                                               | `db:push` ran but `db:seed` didn't                                                                                                                      | Run `pnpm db:seed`                                                                                                                             |
| `permission denied for table sb_members` (or any)                           | RLS policies not applied for that table                                                                                                                 | Re-run the matching `lib/db/policies/<table>.sql` in SQL Editor                                                                                |
| `function public.current_tenant_id() does not exist`                        | Skipped `00_helpers.sql`                                                                                                                                | Paste & run that file first                                                                                                                    |
| Sign-in succeeds but `/admin/dashboard` redirects back to `/login`          | Auth user UID doesn't match `profiles.id`                                                                                                               | Re-run `pnpm db:link-secretary <correct UUID>` — copy from Authentication → Users                                                              |
| `connection refused` on `pnpm db:push`                                      | Using direct DB connection (port 5432 of `db.<ref>.supabase.co`) instead of pooler                                                                      | Use the **Session pooler** URL from the Connection string tab (host is `aws-0-<region>.pooler.supabase.com`)                                   |
| `Invalid env: DATABASE_URL is required` on `pnpm dev`                       | `.env.local` missing or malformed                                                                                                                       | Re-copy `.env.example` and fill the four Supabase values                                                                                       |
| Build fails on `generateStaticParams` for `/news/[slug]` or `/members/[id]` | DB unreachable at build time                                                                                                                            | `safeBuildtimeQuery` should catch this and return `[]` — the route falls back to dynamic rendering. If it doesn't, check the build error trace |
| RLS blocks an admin action that should succeed                              | Profile is missing or `active=false`, or role doesn't match                                                                                             | Check `profiles` row for the signed-in user; verify `role` and `active=true`                                                                   |
| Anonymous public-page query returns 0 rows when DB has data                 | Tenant scoping in policy uses `current_tenant_id()` which is `NULL` for anon — but the public-read policy should accept `status='published'` regardless | Check the policy file for that table — every public-read policy should have `OR (status='published' ...)` for anon                             |

---

## What's still ahead (Phase 6+)

After live-flip, the launch checklist in `docs/design-system.md` §11 is the next read. Highlights:

- Wire `next-intl` and move public routes under `[locale]/` (en / tl / hil)
- Wire **Resend** to actually send the email templates we built
- Wire **Cloudflare Turnstile** widget on `/submit-query` (the verify helper is ready; just needs the client-side widget in `_form.tsx`)
- Build the real audio recorder (chunked upload + IndexedDB buffer) — A4
- Pick an ASR provider (PROJECT.md §22) and wire transcription
- Wire `@react-pdf/renderer` for resolution PDF generation
- Filipino-language vetting of all UI strings
- Real photography for member portraits + news cover images
- WCAG 2.1 AA audit
- Lighthouse Performance ≥ 90 on `/`, `/news`, `/members`

The inline mock data in admin list pages (`/admin/meetings`, `/admin/queries`, `/admin/audit`, `/admin/resolutions`, `/admin/users`, `/admin/news`, `/admin/dashboard`) can also be wired to the real queries — `lib/db/queries/*` already exposes the right functions; each page just needs its `ROWS` constant replaced with an `await` call. Save that for a Phase 6 sprint.
