# SB Lambunao — Launch Domain Wireup

**When to read this:** when wiring `lambunaosb.com` into the project from scratch, or when re-running any single step (DNS, Resend, Supabase auth, etc.) after something breaks. This is the single source of truth for how the production domain is connected end-to-end.

**Time:** ~30 minutes end-to-end if Bryan moves through the dashboard steps without delay. The DNS-propagation waits dominate.

---

## a. Goal and canonical-URL contract

**Goal.** Production traffic to `https://lambunaosb.com` works for: marketing pages, citizen query submissions (Cloudflare Turnstile + email acknowledgement via Resend), Supabase auth flows for the admin app, and OG / canonical tags for SEO + social sharing.

**Canonical-URL contract.** The canonical site is the bare apex `https://lambunaosb.com`. `www.lambunaosb.com` exists **only** as a 307/308 permanent redirect to the apex. Every metadataBase, every OG `url`, every canonical `link`, every sitemap entry, every Supabase auth redirect URL, every Resend verified domain reference, and every Cloudflare Turnstile hostname agrees on the apex form. **No `www` URL appears anywhere.**

**DNS topology.** Vercel manages the `lambunaosb.com` zone. All DNS records (Vercel's own A/AAAA for the apex, Resend's MX/TXT/CNAMEs, etc.) live in **Vercel → Settings → DNS**. There is no registrar-side DNS to edit.

---

## b. Audit snapshot — what was on disk before this task

Pre-existing references that needed fixing or were already correct:

| File                                            | State before                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx:46`                             | **Bug**: `metadataBase: new URL('https://lambunao.gov.ph')` (hardcoded stale .gov.ph candidate domain)                        |
| `env.ts:23`                                     | Already `z.string().url()` — strict, no change needed                                                                         |
| 8 marketing pages with `generateMetadata`       | Each declared its own `metadataBase: new URL(SITE_URL)` (redundant once root layout sets it correctly)                        |
| `app/sitemap.ts`                                | **Missing**                                                                                                                   |
| `app/robots.ts`                                 | **Missing**                                                                                                                   |
| `.env.example`                                  | **Missing** (only `.env` on disk)                                                                                             |
| `app/_actions/auth.ts`, `app/_actions/users.ts` | Already use `env.NEXT_PUBLIC_SITE_URL` for password-reset redirect URLs — correct                                             |
| `lib/services/email.ts`                         | Already uses `env.RESEND_FROM_EMAIL` cleanly — correct                                                                        |
| `lib/db/index.ts`                               | `max: 10` per process — too high for Supabase Free pooler under parallel build workers (lowered to `max: 2` as a bundled fix) |

Marketing pages where redundant `metadataBase` was removed: `(marketing)/page.tsx`, `committees/page.tsx`, `news/[slug]/page.tsx` (two metadata blocks), `news/page.tsx`, `about/page.tsx`, `members/page.tsx`, `members/[id]/page.tsx` (two metadata blocks), `submit-query/page.tsx`.

---

## c. Vercel — domain attach

Vercel dashboard → SB Lambunao project → **Settings → Domains**.

1. **Add** `lambunaosb.com`. Vercel detects Vercel-managed nameservers and validates within 30 seconds. Expected row state:
   - Domain: `lambunaosb.com`
   - Status: green check, "Valid Configuration"
   - Branch: `Production`
2. **Add** `www.lambunaosb.com`. After it appears, click the row's **Edit** button. Set **Redirect to** = `lambunaosb.com`, **Status code** = 307/308 (permanent). Save. Expected row state:
   - Domain: `www.lambunaosb.com`
   - Status: green check, "Redirects to lambunaosb.com"
3. Both rows auto-issue ACM TLS certificates within ~2 minutes. Lock icons appear when ready.

**Done when:** both rows show green checks and lock icons.

---

## d. Vercel — environment variables

Vercel dashboard → SB Lambunao project → **Settings → Environment Variables**.

| Key                    | Value                                         | Production | Preview |      Development      |
| ---------------------- | --------------------------------------------- | :--------: | :-----: | :-------------------: |
| `NEXT_PUBLIC_SITE_URL` | `https://lambunaosb.com`                      |     ✓      |    ✓    |           —           |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`                       |     —      |    —    |           ✓           |
| `RESEND_FROM_EMAIL`    | `SB Lambunao <secretary@mail.lambunaosb.com>` |     ✓      |    ✓    | ✓ (or local override) |

All other env vars (Supabase URL/keys, Turnstile keys, Resend API key, DATABASE_URL) are unchanged by this task.

**Do not redeploy yet** — commit the repo changes from sections **e** and ship in a single deployment.

---

## e. Repo changes — file by file

### `app/layout.tsx`

```diff
 import type { Metadata } from 'next';
 import { Inter, Fraunces, Caveat, Geist_Mono } from 'next/font/google';
 import './globals.css';
+
+import { env } from '@/env';
 ...
   applicationName: 'SB Lambunao',
   authors: [{ name: 'Sangguniang Bayan ng Lambunao' }],
-  metadataBase: new URL('https://lambunao.gov.ph'),
+  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
 };
```

### `app/sitemap.ts` (new)

Emits 6 static entries (`/`, `/news`, `/members`, `/committees`, `/about`, `/submit-query`) plus dynamic `/news/<slug>` per published-public post and `/members/<id>` per active-public member. `lastModified` is sourced from each row's `updated_at`. Wrapped in `safeBuildtimeQuery` so the build does not crash if the DB is unreachable mid-build (returns the static entries only).

```ts
import type { MetadataRoute } from 'next';
import { and, eq, isNull } from 'drizzle-orm';

import { env } from '@/env';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { newsPosts, sbMembers } from '@/lib/db/schema';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();

  const [publishedNews, publicMembers] = await Promise.all([
    safeBuildtimeQuery(
      async () => {
        const tenantId = await getCurrentTenantId();
        return db
          .select({ slug: newsPosts.slug, updatedAt: newsPosts.updatedAt })
          .from(newsPosts)
          .where(
            and(
              eq(newsPosts.tenantId, tenantId),
              eq(newsPosts.status, 'published'),
              eq(newsPosts.visibility, 'public'),
              isNull(newsPosts.deletedAt),
            ),
          );
      },
      [] as { slug: string; updatedAt: Date }[],
    ),
    safeBuildtimeQuery(
      async () => {
        const tenantId = await getCurrentTenantId();
        return db
          .select({ id: sbMembers.id, updatedAt: sbMembers.updatedAt })
          .from(sbMembers)
          .where(
            and(
              eq(sbMembers.tenantId, tenantId),
              eq(sbMembers.active, true),
              eq(sbMembers.showOnPublic, true),
              isNull(sbMembers.deletedAt),
            ),
          );
      },
      [] as { id: string; updatedAt: Date }[],
    ),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/members`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/committees`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    {
      url: `${baseUrl}/submit-query`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const newsEntries: MetadataRoute.Sitemap = publishedNews.map((p) => ({
    url: `${baseUrl}/news/${p.slug}`,
    lastModified: p.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const memberEntries: MetadataRoute.Sitemap = publicMembers.map((m) => ({
    url: `${baseUrl}/members/${m.id}`,
    lastModified: m.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...newsEntries, ...memberEntries];
}
```

### `app/robots.ts` (new)

```ts
import type { MetadataRoute } from 'next';

import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/login', '/reset-password/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
```

### `.env.example` (new)

Full template covering every key in `env.ts`. Production `NEXT_PUBLIC_SITE_URL` is the apex; comment instructs Bryan to override to localhost in `.env.local`.

### `lib/db/index.ts`

Bundled fix — Supabase Session pooler caps at 15 sessions per project. With `max: 10` per process and 7 build workers, the pool was saturated during prerender (especially when Studio or `pnpm dev` was open simultaneously). Lowered to `max: 2` per process — 7 workers × 2 = 14, fits comfortably.

```diff
+// Pool sizing: each Node process (Vercel function, build worker, dev server)
+// gets its own pool. Supabase's Session pooler caps at 15 sessions per
+// project — and that cap is shared with Studio, drizzle-kit, and any other
+// process connecting at the same time. max:2 fits ~7 build workers in the
+// 15-slot ceiling and is plenty for a single Vercel function.
 const client = postgres(env.DATABASE_URL, {
   prepare: false,
-  max: env.NODE_ENV === 'production' ? 10 : 1,
+  max: 2,
 });
```

### 8 marketing pages — redundant `metadataBase` removed

Each page's `generateMetadata` had a redundant `metadataBase: new URL(SITE_URL),` line that the root layout now owns. Pattern applied to:

- `app/(marketing)/page.tsx`
- `app/(marketing)/committees/page.tsx` (also dropped now-unused `SITE_URL` constant + `env` import)
- `app/(marketing)/news/[slug]/page.tsx` (two `generateMetadata` blocks)
- `app/(marketing)/news/page.tsx`
- `app/(marketing)/about/page.tsx`
- `app/(marketing)/members/page.tsx`
- `app/(marketing)/members/[id]/page.tsx` (two `generateMetadata` blocks)
- `app/(marketing)/submit-query/page.tsx`

`SITE_URL` constants still in use for absolute URL composition in JSON-LD, OG, breadcrumbs — those stay.

---

## f. Resend — verify mail.lambunaosb.com

Resend dashboard → **Domains** → **Add Domain** → enter `mail.lambunaosb.com`.

Resend produces ~5 DNS records. Paste each into **Vercel → Settings → DNS** (since Vercel manages this domain's zone). When pasting in Vercel, the **Name** field takes only the prefix before `.lambunaosb.com` — drop the apex suffix.

Typical record set (your exact values come from Resend's UI):

| Type  | Name (in Vercel)          | Value                                                   | Priority |
| ----- | ------------------------- | ------------------------------------------------------- | -------- |
| MX    | `send.mail`               | `feedback-smtp.us-east-1.amazonses.com`                 | 10       |
| TXT   | `send.mail`               | `v=spf1 include:amazonses.com ~all`                     | —        |
| TXT   | `resend._domainkey.mail`  | (long DKIM string from Resend)                          | —        |
| TXT   | `_dmarc.mail`             | `v=DMARC1; p=none; rua=mailto:secretary@lambunaosb.com` | —        |
| CNAME | (return-path host varies) | (Resend value)                                          | —        |

After all are saved in Vercel → click **Verify DNS records** in Resend. All 5 turn green within 1–5 minutes.

`RESEND_FROM_EMAIL` = `SB Lambunao <secretary@mail.lambunaosb.com>` (set in Vercel env, section **d**) — `secretary@mail.lambunaosb.com` is now a valid sender on a verified domain.

**DMARC starter policy.** The above value (`p=none`) is monitoring-only — reports are aggregated but no action is taken on misaligned mail. After 30 days of clean reports (check `secretary@lambunaosb.com` aggregate inbox), tighten to `p=quarantine`. Tightening to `p=reject` should be a deliberate decision after a quarantine soak period.

---

## g. Cloudflare Turnstile — add hostname

Cloudflare dashboard → **Turnstile** → existing SB Lambunao site → **Settings → Hostname Management**.

Add `lambunaosb.com`. Keep `localhost` for dev. **Do NOT add `www.lambunaosb.com`** — the redirect makes it unreachable as a Turnstile origin.

Site key + secret key do **not** rotate. Vercel env vars `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` are unchanged.

---

## h. Supabase Auth — URL configuration

Supabase dashboard → SB Lambunao project → **Authentication → URL Configuration**.

- **Site URL**: `https://lambunaosb.com`
- **Redirect URLs** (each on its own line):
  - `https://lambunaosb.com/**`
  - `http://localhost:3000/**`
  - `https://*-rafael-iii-prudentes-projects.vercel.app/**` (Vercel preview wildcard — replace the suffix with your team scope's actual pattern)

Save.

**Email Templates** (Authentication → Email Templates) — open each and confirm any URL uses `{{ .SiteURL }}` or `{{ .ConfirmationURL }}`. Replace any hardcoded URL with the template variable.

---

## i. Smoke test checklist

After Vercel deploys the latest commit, walk through (in order):

- [ ] `https://lambunaosb.com` returns the marketing home with TLS green.
- [ ] `https://www.lambunaosb.com` redirects 307/308 to `https://lambunaosb.com` (browser address bar ends on apex).
- [ ] `https://lambunaosb.com/sitemap.xml` returns XML listing the 6 static URLs plus dynamic news/members.
- [ ] `https://lambunaosb.com/robots.txt` includes `Sitemap:` + `Host:` lines and disallows `/admin/`, `/login`, `/reset-password/`.
- [ ] View source on `https://lambunaosb.com/` — `canonical`, `og:url`, `twitter:url` all use the apex form. No `www`, no `localhost`, no `lambunao.gov.ph`.
- [ ] `/login` → sign in as the Secretary → lands on `/admin/dashboard` without an Invalid-redirect-URL error.
- [ ] In an incognito window: `/submit-query` → fill form → Turnstile renders + validates → submit → confirmation page renders with `?ref=Q-2026-XXXX`.
- [ ] Within ~30 seconds the Secretary's mailbox receives a "new query" email from `secretary@mail.lambunaosb.com`. Show original / view headers — `Authentication-Results` shows `spf=pass`, `dkim=pass`, `dmarc=pass` (or `dmarc=none` while in monitoring mode).

---

## j. Rollback notes

If anything breaks after the launch, here is how to revert each piece in isolation.

| Change                        | How to revert                                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain attach                 | Vercel → Settings → Domains → remove `lambunaosb.com` and `www.lambunaosb.com`. Production traffic returns to the previous `<project>.vercel.app` URL.                                                                      |
| Vercel env vars               | Vercel → Settings → Environment Variables → set `NEXT_PUBLIC_SITE_URL` back to the previous value, redeploy.                                                                                                                |
| Repo changes                  | `git revert <commit-sha>` for the launch commit, push. metadataBase reverts to whatever it was before (this doc's audit shows the previous bug was `https://lambunao.gov.ph` hardcode — pick the right intermediate state). |
| Resend DNS records            | Vercel → Settings → DNS → delete the 5 Resend records. `RESEND_FROM_EMAIL` will fail to send until restored — leave the env var pointing at a verified subdomain or unset `RESEND_API_KEY` to skip sends.                   |
| Cloudflare Turnstile hostname | Cloudflare → Turnstile → Hostname Management → remove `lambunaosb.com`. Live form submissions will fail validation until restored.                                                                                          |
| Supabase Auth URL config      | Supabase → Authentication → URL Configuration → set Site URL back to the previous value, remove the apex Redirect URLs.                                                                                                     |
| `lib/db/index.ts` pool size   | Restore `max: 10`. Note this re-introduces the build-time pool-saturation risk under contention.                                                                                                                            |

---

## k. Out of scope (deferred to separate tasks)

- **Locale routing** (`[locale]/en|tl|hil`). Public routes ship at `/...` for now. Plan reference: `PROJECT.md` and `docs/wire-up-runbook.md` § "What's still ahead".
- **Supabase Pro upgrade** (Image Transformations, Smart CDN). See `docs/storage-optimization.md` § "When you upgrade to Pro" for the swap.
- **Resend email template HTML branding** (React Email). Templates currently use Supabase defaults; a future task will render `emails/*.tsx` to HTML and paste into Supabase Auth Email Templates.
- **Receiving mail** at `@lambunaosb.com` (Google Workspace, Fastmail, etc.). Resend is sending-only. The DMARC `rua` reports will arrive at `secretary@lambunaosb.com` once that mailbox is set up.
- **DMARC tightening past `p=none`**. Soak in monitoring mode for 30 days, then tighten to `p=quarantine`, then optionally `p=reject` after a quarantine soak.
- **Custom Supabase domain** (white-labeling `<project>.supabase.co`). Pro-plan feature; not needed for launch.
