# SB Lambunao — Design System Reference

**Status:** v1 · Phase 4 deliverable
**Audience:** Future contributors (humans and AI agents) building or extending screens
**Companion docs:**

- `docs/superpowers/specs/2026-04-28-sb-lambunao-design-direction.md` — the _why_
- `docs/superpowers/specs/2026-04-28-sb-lambunao-design-brief.md` — the original brief (note: pivoted in Phase 2 to user-supplied mockups; this doc supersedes brief sections that conflict)
- `PROJECT.md` § 13 — locked atomic tokens
- Live reference: `/admin/design-tokens` (in-app screen showing the token catalogue)

This document is the single source of truth for the **applied** design system. Read it before building a new screen or adding a new component.

---

## 1. Visual identity (one-paragraph)

**Civic broadsheet meets operational atelier with a wireframe-aesthetic warmth.** Public surface reads like a small-town Philippine broadsheet — heavy display serif (Fraunces) headlines on warm paper, italic editorial prose, hand-drawn script (Caveat) for moments of warmth (nav, button labels, accent prose). Admin surface is a dense operational console using the same vocabulary in a denser key. Both surfaces share rust as the brand-CTA color, navy as structural authority, gold as editorial accent. Dashed borders, hatched image placeholders, and mono uppercase eyebrows give the entire system a deliberate "designed-by-people" feel — not generic SaaS, not generic gov, not generic AI.

---

## 2. Tokens (canonical values)

All tokens live in `app/globals.css` inside `@theme`. Hex values mirror PROJECT.md §13 with the user-supplied pivot additions. **Do not introduce new top-level color tokens without updating this document.**

### 2.1 Color

| Token                  | Hex       | Role                                                                          |
| ---------------------- | --------- | ----------------------------------------------------------------------------- |
| `--color-navy-primary` | `#0B2447` | Headlines, wordmark, structural authority. **Not** primary CTA color anymore. |
| `--color-navy-700`     | `#19376D` | Hover/pressed states for navy elements                                        |
| `--color-navy-200`     | `#cdd6e6` | Selected-row tint                                                             |
| `--color-rust`         | `#C14A2A` | **Primary CTA color**, eyebrow color, attention-card surface, focus ring      |
| `--color-rust-dark`    | `#9B3F22` | Rust hover/pressed                                                            |
| `--color-rust-soft`    | `#D9624A` | Rust subtle accent                                                            |
| `--color-destructive`  | `#8B2820` | True destructive (delete, withdraw) — distinct from rust brand                |
| `--color-gold`         | `#B88A3E` | Editorial accent — link underlines, hero accent underline, marker             |
| `--color-gold-soft`    | `#D9B46A` | Soft gold hover                                                               |
| `--color-paper`        | `#FAF8F3` | Page background                                                               |
| `--color-paper-2`      | `#F3EFE6` | Card surface, sidebar, mission band                                           |
| `--color-paper-3`      | `#EBE6DA` | Subdued container, skeleton base                                              |
| `--color-ink`          | `#1A1A1A` | Body text, structural lines                                                   |
| `--color-ink-soft`     | `#3A3A3A` | Secondary text                                                                |
| `--color-ink-faint`    | `#6A6A6A` | Meta, captions, mono labels (AA on paper)                                     |
| `--color-ink-ghost`    | `#B5B5B5` | Dividers, skeleton, disabled                                                  |
| `--color-success`      | `#2D6A3A` | Answered, Approved, Published, Active                                         |
| `--color-warn`         | `#C14A2A` | Same hex as rust — kept as alias for "warn" semantic                          |
| `--color-highlight`    | `#FFF3A8` | Search-result text mark                                                       |

**Surface stack rule:** `paper → paper-2 → paper-3`. Never put paper-2 on paper-3 (no contrast). Cards on paper use `paper` background with a border; cards on `paper-2` (sidebar) use `paper` background.

**Gold-≤1 rule, relaxed:** the original brief said gold ≤1 per viewport. The user-supplied target relaxes this — gold is freely used on link underlines, "see all" arrows, and active-nav indicators. Keep gold _editorial_, not decorative.

### 2.2 Typography

Four font families wired via `next/font/google` in `app/layout.tsx`:

| Family         | CSS var                                                   | Use                                                                                                                                   |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Inter**      | `--font-sans`                                             | Default body, UI elements, table cells, form inputs, sidebar items, meta                                                              |
| **Fraunces**   | `--font-display` (alias `--font-serif`, `--font-heading`) | Display headlines (page hero titles on public, card titles), italic prose accents (article body, mission quotes, member bios)         |
| **Caveat**     | `--font-script`                                           | Page titles on **admin**, hero subheadings, button labels (script-toned CTAs), nav items, "Welcome back"-style greetings, accent text |
| **Geist Mono** | `--font-mono`                                             | Eyebrows, dates, codes, reference numbers, captions, technical IDs                                                                    |

**The voice rule:**

- **Public page titles** → `font-display` (Fraunces 700, big)
- **Admin page titles** → `font-script` (Caveat italic, friendly)
- **Eyebrows** (the small uppercase label above a heading) → `font-mono` `text-[11px]` `tracking-[0.18em]` `text-rust`
- **Body prose with civic warmth** → `font-display` italic in `text-navy-primary` (article body, mission quotes, member bios)
- **Functional UI body** → `font-sans` (Inter), default

### 2.3 Spacing

Tailwind v4 default spacing scale (`p-1` through `p-96`) governs everything. Per the brief: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Use the standard utilities — no custom spacing tokens.

- **Public card padding:** `p-6` (24)
- **Admin card padding:** `p-4` (16)
- **Admin section gutter:** `gap-5` (20) or `gap-6` (24)
- **Public section gutter:** `gap-12` (48) or `gap-16` (64) between major sections

### 2.4 Radii

| Token           | Value | Use                                          |
| --------------- | ----- | -------------------------------------------- |
| `--radius-sm`   | 4px   | Tag pills inside text (rare)                 |
| `--radius-md`   | 8px   | Inputs, default Button, default Card (admin) |
| `--radius-lg`   | 12px  | Public Cards, Dialog, Sheet                  |
| `--radius-pill` | 24px  | Status badges, locale pill, filter chips     |
| `--radius-full` | 999px | Avatars, the SB badge mark                   |

### 2.5 Shadows

| Token                | Use                                  |
| -------------------- | ------------------------------------ |
| `--shadow-e0` (none) | Flush surfaces (sidebar, status bar) |
| `--shadow-e1`        | Cards, sticky headers                |
| `--shadow-e2`        | Hover-elevated cards, Sonner toasts  |
| `--shadow-e3`        | Modal, Sheet                         |

### 2.6 Motion

| Token             | Value                          | Use                                                     |
| ----------------- | ------------------------------ | ------------------------------------------------------- |
| `--duration-fast` | 120ms                          | Admin button feedback, dropdown open, focus transitions |
| `--duration-base` | 180ms                          | Public reveals, card hover, tab underline slide         |
| `--duration-slow` | 260ms                          | Modal/Sheet entry, mobile drawer                        |
| `--ease-out`      | `cubic-bezier(.2,.8,.2,1)`     | Default                                                 |
| `--ease-spring`   | `cubic-bezier(.34,1.56,.64,1)` | Drawer, sheet                                           |

**Reduced motion is honored globally** in `app/globals.css` — when `prefers-reduced-motion: reduce`, all durations collapse to 1ms.

### 2.7 Z-index

| Token          | Value                      |
| -------------- | -------------------------- |
| `--z-base`     | 0                          |
| `--z-dropdown` | 10                         |
| `--z-sticky`   | 20 (top nav, admin topbar) |
| `--z-overlay`  | 30 (sticky public top nav) |
| `--z-modal`    | 40 (Dialog, Sheet)         |
| `--z-toast`    | 50 (Sonner)                |

---

## 3. Surface model

The system has **two surfaces**: `public` (citizen-facing) and `admin` (council-facing). They share tokens but differ in density, typographic mix, and chrome.

### 3.1 How it works

Every route's root `<div>` carries a `data-surface` attribute:

```tsx
// app/(marketing)/layout.tsx
<div data-surface="public">{children}</div>

// app/(app)/layout.tsx
<div data-surface="admin">{children}</div>

// app/(auth)/layout.tsx
<div data-surface="public">{children}</div>  // auth uses public density
```

`globals.css` defines two custom Tailwind variants on this attribute:

```css
@custom-variant public (&:is([data-surface='public'] *));
@custom-variant admin (&:is([data-surface='admin'] *));
```

Use them in any component className:

```tsx
<div className="text-sm public:text-base">…</div>
<div className="p-4 public:p-6 admin:p-4">…</div>
```

### 3.2 Per-surface defaults

| Dimension    | Public                                                   | Admin                                          |
| ------------ | -------------------------------------------------------- | ---------------------------------------------- |
| Layout       | Editorial, max-width 1100–1200, generous gutters         | Sidebar 240 + content stretched, dense gutters |
| Type mix     | Fraunces display + Inter body + Caveat accent            | Inter UI + Caveat for greetings/page titles    |
| Card padding | 24 (`p-6`)                                               | 16 (`p-4`)                                     |
| Card radius  | `rounded-md` (default) — _brief says lg, mockups use md_ | `rounded-md`                                   |
| Motion       | 180ms ease                                               | 120ms snap                                     |

---

## 4. Primitive inventory (`components/ui/`)

Shadcn-style primitives, source-owned. **Customize freely; do not re-run `shadcn add` over an existing file** without diff-checking.

### Core form primitives

| Primitive                                                | Use                                                                                                                                                                                | Notes                                                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                 | All buttons                                                                                                                                                                        | `default` (rust filled), `outline` (dashed border), `secondary` (paper-2), `ghost`, `destructive`. Sizes: `sm` 32px, `default` 40px, `lg` 48px, plus `icon` variants |
| `Field` + `FieldInput` / `FieldTextarea` / `FieldSelect` | Print-form-style fieldset (mono uppercase legend on border). **Use everywhere a form input lives** — Login, Submit Query, Resolution Upload, Member Editor, Settings, Users invite |
| `Input`                                                  | Plain input — used inside the new top-nav search, table search bars                                                                                                                |
| `Textarea`                                               | Plain textarea — used in Query Detail reply composer                                                                                                                               |
| `Checkbox`                                               | Rust-accented checkbox. Use `accent-rust` class on native `<input type="checkbox">` for table-row selectors and toggles                                                            |
| `Form`                                                   | react-hook-form integration (FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage). Use for forms with Zod validation                                         |
| `Select`                                                 | shadcn Select (Radix primitive) — used for dropdown menus where Field's native `<select>` won't do                                                                                 |

### Data display primitives

| Primitive                                                                                              | Use                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardEyebrow` / `CardFooter` | Three variants: `default` (solid border), `dashed` (wireframe-aesthetic), `attention` (rust surface — one per page max)                                                                                                                                                                   |
| `Badge`                                                                                                | Status pill. Variants: `default`, `secondary`, `success` (filled green), `success-outline`, `destructive` (filled rust), `new`, `warn` (gold outline), `outline`, `ghost`                                                                                                                 |
| `Avatar` + `AvatarImage` / `AvatarFallback`                                                            | Circle on public, rounded-md on admin. Fallback is gold initials on navy. Sizes: sm 24, default 40, lg 64, xl 120                                                                                                                                                                         |
| `Skeleton`                                                                                             | Static placeholder (no shimmer — 3G + reduced-motion). Use `bg-paper-3` rounded                                                                                                                                                                                                           |
| `ImagePlaceholder`                                                                                     | Dashed border + hatched diagonal fill + mono caption. Aspect ratios: 16:9, 4:3, 1:1, 3:4                                                                                                                                                                                                  |
| `Table`                                                                                                | shadcn Table primitive — but **the canonical admin table pattern lives inline in pages** (e.g., `/admin/meetings`, `/admin/resolutions`). Standard layout: mono uppercase `<thead>`, dashed `<tbody>` row dividers, pill status badges. Copy from a sibling page when building a new list |

### Overlay primitives

| Primitive          | Use                                                                             |
| ------------------ | ------------------------------------------------------------------------------- |
| `Dialog`           | Modal. Overlay is `bg-navy-primary/45`                                          |
| `Sheet`            | Side drawer. Used by mobile top-nav, admin sidebar mobile, secondary edit forms |
| `Tooltip`          | Supplementary labels only — never critical info                                 |
| `DropdownMenu`     | Row actions, secondary menus                                                    |
| `Sonner` (Toaster) | Light-only, position top-right, CSS vars mapped to paper/ink/success/rust       |

### Sidebar (admin only)

`Sidebar` + 20+ subcomponents (`SidebarProvider`, `SidebarInset`, `SidebarMenuButton`, etc.) — full shadcn primitive. The active-state styling is customized: filled rust + paper text + paper icon (no gold border).

---

## 5. App-level components (`components/{app,marketing}/`)

Composed components specific to this project — not generic primitives.

### Marketing chrome (`components/marketing/`)

| Component     | Use                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `top-nav.tsx` | Sticky public top nav. SB badge + Caveat wordmark + Caveat nav items with gold-underline active state + dashed-pill `🌐 EN` locale switcher. Includes mobile Sheet menu |
| `footer.tsx`  | Public footer (currently lighter than top-nav — used on landing only)                                                                                                   |

### Admin chrome (`components/app/`)

| Component               | Use                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-sidebar.tsx`     | 240px sidebar with SB badge + "Lambunao SB / Iloilo · admin" header + grouped menu (Dashboard / Meetings / Resolutions / SB Members / News / Citizen Queries [badge] / Audit Log / Users [lock] / Settings) + signed-in-as footer with avatar |
| `admin-topbar.tsx`      | 56px topbar with sidebar trigger + page title + search + per-page primary action (`+ New X`) + bell with notification dot + user avatar                                                                                                       |
| `admin-status-bar.tsx`  | 32px bottom strip with audit-trail reminder + version                                                                                                                                                                                         |
| `admin-page-header.tsx` | Caveat title + optional inline filter pills + accessory slot. **Use this on every admin list/index page** for visual consistency                                                                                                              |

---

## 6. Pattern conventions

### 6.1 Page header (admin)

```tsx
<AdminPageHeader
  title="Meetings"
  pills={[
    { label: 'All', count: 27, active: true },
    { label: 'Scheduled' },
    { label: 'Recorded' },
    { label: 'Transcribed' },
    { label: 'Published' },
  ]}
  accessory={
    <>
      <Button variant="outline" className="font-script text-base">
        …
      </Button>
      <Button className="font-script text-base">…</Button>
    </>
  }
/>
```

### 6.2 Page header (public)

```tsx
<header className="mb-12">
  <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
    Eyebrow text
  </p>
  <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
    Page title
  </h1>
  <p className="text-ink-soft font-script mt-5 max-w-2xl text-lg">Optional subtitle in script.</p>
</header>
```

### 6.3 Eyebrow (canonical)

```tsx
<p className="text-rust font-mono text-[11px] font-medium tracking-[0.18em] uppercase">
  Section name
</p>
```

**Standardize on:** `text-[11px]` (10px is too small at our font), `tracking-[0.18em]` (the middle ground). The codebase has drift (10/11 px and 0.16/0.18/0.22 em) — please use the canonical above when writing new screens.

### 6.4 Borders (canonical)

| Use                               | Class                                  |
| --------------------------------- | -------------------------------------- |
| Solid card / panel border         | `border border-ink/15`                 |
| Dashed wireframe-aesthetic border | `border border-dashed border-ink/30`   |
| Subtle divider inside a card      | `border-t border-dashed border-ink/15` |

The codebase has drift (`border-ink/12, /15, /20, /25, /30` all in use). When refactoring or building new, prefer **/15 for solid, /30 for dashed**.

### 6.5 Status badges

Always pair with icon + text. Never color-only state.

```tsx
<Badge variant="success">
  <CheckCircle2 aria-hidden="true" />
  Approved
</Badge>
```

| Status                                                   | Variant                                                 |
| -------------------------------------------------------- | ------------------------------------------------------- |
| Approved, Published, Answered, Active                    | `success` (filled green)                                |
| Pending, In review (awaiting action)                     | `outline` or `warn` (gold outline for true "in review") |
| New, Withdrawn, Critical                                 | `new` or `destructive` (filled rust)                    |
| Scheduled, Recorded, Transcribed (process step, neutral) | `outline`                                               |

### 6.6 Forms

Always use the `Field` primitive. The fieldset pattern (mono uppercase legend on border) is the project's signature form chrome.

```tsx
<Field label="Full name" required error={errors.fullName?.message}>
  <FieldInput type="text" placeholder="Juan dela Cruz" {...register('fullName')} />
</Field>
```

For react-hook-form integration, compose with `<Form>`, `<FormField>`, `<FormControl>` (e.g., `app/(marketing)/submit-query/_form.tsx`). For simple non-validated forms (static stubs), use Field directly.

### 6.7 Empty / loading / error states

Live reference: `/admin/states` shows all four patterns.

- **Empty:** centered icon + Caveat headline ("No queries yet") + italic body + dashed-pill primary action
- **Loading:** Skeleton bars matching real content shape (no spinner)
- **Error:** rust X icon + Caveat headline + italic body + Retry button + cached fallback option + mono error code
- **Offline (recorder-specific):** gold banner across viewport with buffered MB readout

---

## 7. URL conventions

| Surface          | URL prefix                                                | Route group        |
| ---------------- | --------------------------------------------------------- | ------------------ |
| Public           | `/`, `/news/*`, `/members/*`, `/about`, `/submit-query/*` | `app/(marketing)/` |
| Auth (no chrome) | `/login`, `/reset-password`                               | `app/(auth)/`      |
| Admin (gated)    | `/admin/*`                                                | `app/(app)/admin/` |

**Why the `/admin/` literal segment:** route groups (parens) don't change URLs, so `/(app)/news/page.tsx` and `/(marketing)/news/page.tsx` would both resolve to `/news` and conflict. The `/admin/` literal segment cleanly separates them and reads correctly in the URL bar.

When adding next-intl in a future phase, public routes will move under `[locale]/` (e.g., `/en/news/*`) per PROJECT.md §7. Admin stays at `/admin/*` (locale-agnostic for v1, per PROJECT.md §3).

---

## 8. When-to-use guide

### Adding a new public page

1. Create `app/(marketing)/<route>/page.tsx`. The `(marketing)` layout provides `data-surface="public"`, top-nav, footer.
2. Use Fraunces (`font-display`) for the page title, mono eyebrow above, optional Caveat sub-headline.
3. Use `Card variant="dashed"` or hand-built `border border-dashed border-ink/30` containers for content cards.
4. ImagePlaceholder for any image not yet sourced.
5. Body prose: `font-display italic text-navy-primary` for civic-warm sections.

### Adding a new admin page

1. Create `app/(app)/admin/<route>/page.tsx`. The `(app)` layout provides `data-surface="admin"`, sidebar, topbar, status bar, TooltipProvider.
2. Use `<AdminPageHeader title="…" pills={…} accessory={…} />` at the top.
3. Add the route to `components/app/admin-sidebar.tsx` ITEMS array (with icon, optional badge/restricted).
4. If the page has a primary action, add it to `PRIMARY_ACTIONS` in `components/app/admin-topbar.tsx`.
5. For tables: copy from `/admin/meetings` or `/admin/resolutions` — both are canonical patterns.
6. For forms: use the `Field` primitive; compose right-rail panels for metadata if needed.

### Adding a new component

1. Generic UI primitives → `components/ui/` (one file per primitive, source-owned)
2. Marketing-specific composed components → `components/marketing/`
3. Admin-specific composed components → `components/app/`
4. Cross-cutting business logic → `components/` (e.g., `components/forms/`, `components/recorder/` — none yet)

### Adding a new color

**Don't** without updating this doc and `globals.css` `@theme`. The system is locked at 14 named colors plus the rust family. New colors mean visual drift.

### Adding a new font weight

If Fraunces 800 is needed (or any new weight), update `app/layout.tsx` `weight: [...]` array. Each new weight adds ~30KB to the font payload. Currently we ship 4 (Inter) + 4 (Fraunces) + 4 (Caveat) + 2 (Geist Mono) = 14 weights ≈ 200KB. Be deliberate.

---

## 9. Known technical debt

Captured here so future contributors don't repeat the patterns:

1. **Border opacity drift:** 158 occurrences across `border-ink/{12,15,20,25,30}` — should converge on /15 (solid) and /30 (dashed). See §6.4.
2. **Eyebrow tracking drift:** 77 occurrences across `tracking-[0.{16,18,22}em]` — should converge on /18. See §6.3.
3. **Eyebrow text-size drift:** mix of `text-[10px]` and `text-[11px]` — converge on `text-[11px]`.
4. **Font-script overuse risk:** Caveat is used in many places. Watch for it appearing in body copy, error messages, or other places where it would hurt legibility.
5. **A4 Recorder + A5 Transcript editor are visual stubs:** the waveform is pure CSS bars (decorative). Real implementation needs `<canvas>` waveform + Web Audio API + IndexedDB chunk buffering. Phase 5 work.
6. **next-intl not yet wired:** public surface URL strings are English-only. The locale switcher in top-nav is non-functional. Adding next-intl will require moving public routes under `[locale]/`.
7. **No real auth wiring:** A1 Login form does not POST to Supabase yet. A16 Users invite does not send. Phase 5 work per the original prompt's Phase 3 (data wiring).
8. **Status bar in admin:** The `/admin/states` reference page exists but the live admin pages don't actually demonstrate empty/loading/error states yet — they all show populated mock data.

---

## 10. The 8 rules (cheat-sheet)

If you remember nothing else:

1. **Rust is the brand.** All primary CTAs, all attention surfaces. Navy is for headlines and structure.
2. **Caveat is admin's voice.** Page titles, greetings, button labels on admin all use Caveat. Public uses Fraunces for the equivalent.
3. **Mono is for facts.** Dates, IDs, codes, eyebrows. Always uppercase + tracked when used as eyebrow.
4. **Dashed borders signal "wireframe-aesthetic" intent.** Use them on ghost buttons, locale pills, image placeholders, editorial cards. Solid borders signal "official content" — admin tables, dashboard cards, the resolution PDF preview.
5. **Hatched placeholders are not decoration.** They communicate "image will go here" specifically — print-publication convention. Don't reach for generic gray boxes.
6. **One rust attention card per page.** The Dashboard's "Upcoming Session" pattern. Don't proliferate.
7. **Reduced motion is sacred.** Already handled globally; don't add custom animations that bypass it.
8. **The seal is mounted with reverence.** Never rotate, filter, overlay, or shrink below 32px. Always include alt text. The official seal PNG lives at `public/seal/lambunao-seal.png`.

---

## 11. Production launch checklist (carry forward to Phase 5+)

- [x] ~~Replace `public/seal/lambunao-seal.svg` placeholder with official municipal seal PNG~~ (done)
- [ ] Wire next-intl, move public routes under `[locale]/`
- [ ] Wire Supabase auth on `/login` and middleware
- [ ] Wire Drizzle queries to replace `lib/mock/meetings.ts`
- [ ] Wire Cloudflare Turnstile on `/submit-query` (currently a placeholder)
- [ ] Wire Resend email on citizen-query confirmation + DPO deletion link
- [ ] Wire `@react-pdf/renderer` for resolution PDFs
- [ ] Audio recorder backend (chunked upload to Supabase Storage, IndexedDB buffer)
- [ ] ASR provider (decision pending per PROJECT.md §22)
- [ ] WCAG 2.1 AA audit with axe-core + screen-reader walkthrough on critical flows
- [ ] Lighthouse Performance ≥ 90 on `/`, `/news`, `/members`
- [ ] Filipino-language vetting of all UI strings (en/tl/hil)
- [ ] Real photography for member portraits + news cover images
