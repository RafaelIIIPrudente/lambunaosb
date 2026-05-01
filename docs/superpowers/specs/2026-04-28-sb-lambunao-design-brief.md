# SB Lambunao — Design Brief

**Date:** 2026-04-28
**Phase:** 0 (output of shape skill; contract for Phase 1)
**Status:** Pending user sign-off
**Companion docs:**

- Direction: `docs/superpowers/specs/2026-04-28-sb-lambunao-design-direction.md`
- Locked tokens: `PROJECT.md` §13
- Screen inventory: `PROJECT.md` §8
- Routes: `PROJECT.md` §7

This brief specifies how the locked design system is **applied** across 26 unique desktop screens. It does not propose new tokens. It does not specify every screen — per-screen component composition lives in PROJECT.md §8. It governs Phase 1 (token transcription, typography wiring, shadcn primitive restyling) and Phase 3 (screen scaling).

---

## 1. Layout system

### 1.1 Public surface — editorial 8-col grid

| Property            | Value                                              |
| ------------------- | -------------------------------------------------- |
| Grid                | 8 columns                                          |
| Gutter              | 32 px (mobile 16)                                  |
| Container max-width | 1120 px                                            |
| Outer padding       | clamp(16, 4vw, 48) px                              |
| Section gutter      | 48 (between blocks) · 64 (between sections)        |
| Hero block          | full-bleed background, content constrained to grid |
| Article max-width   | 680 px (60–75ch reading measure)                   |
| Footer              | full-bleed; content centered to grid               |

**Breakpoints (Tailwind v4 defaults):** `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. Public is fluid-mobile through `md`; collapses 8-col → 4-col below `md`; collapses 4-col → 1-col below `sm`.

**Public layouts use vertical rhythm**: every section block is a multiple of 16 px tall, reinforcing the broadsheet feel.

### 1.2 Admin surface — 12-col with fixed sidebar

| Property            | Value                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Grid                | 12 columns                                                                                                        |
| Sidebar             | 240 px fixed left; collapses to 64 px (icon-only) at `md` and below                                               |
| Topbar              | 56 px fixed top                                                                                                   |
| Status bar (footer) | 32 px fixed bottom (audit indicator + connection state + version)                                                 |
| Content gutter      | 16 px (mobile 12)                                                                                                 |
| Content max-width   | none — admin stretches to viewport edges minus 24 px                                                              |
| Section gutter      | 16 (between cards) · 24 (between sections)                                                                        |
| Mobile (≤ md)       | sidebar becomes Sheet drawer; bottom tab bar appears (5 tabs: Home / Meetings / Resolutions / Queries / Settings) |

**Density rule**: admin density is 1.0× the public density. Public spacing tokens 24/32/48/64 → admin spacing tokens 12/16/24/32.

### 1.3 Auth surface — minimal

Login, reset password, invite acceptance pages have no sidebar/topbar chrome. Single centered card, max-width 420 px, vertically centered with the seal mark above. Public footer (DPO + tenant info), no top nav.

---

## 2. Typography application

### 2.1 Family rules

- **Inter** — every UI string in admin; every body string everywhere.
- **Source Serif Pro** — _only_ on the public surface, _only_ for: page heroes, article headlines, news card titles, mission/quote pull-outs, "About" section headers. Never for admin. Never for body copy.
- **Geist Mono** — timestamps, audit log fields, reference numbers (`RES-2026-014`, `Q-2026-0142`), code blocks in MDX, the public confirmation reference number display, recorder time displays.

**The rule for serif vs. sans on public:** If the text reads as _editorial_ (something you'd find in a printed broadsheet headline or a published article), it gets Source Serif Pro. If the text reads as _interface_ (button label, form label, badge text, navigation), it stays Inter. Default is Inter; serif is the deliberate choice for editorial presence.

### 2.2 Type ramp — public

| Role                 | Family           | Size / weight / line-height |
| -------------------- | ---------------- | --------------------------- |
| Hero display         | Source Serif Pro | 48 / 700 / 1.10             |
| Section heading      | Source Serif Pro | 32 / 700 / 1.15             |
| Article headline     | Source Serif Pro | 32 / 700 / 1.15             |
| Subhead / card title | Source Serif Pro | 24 / 600 / 1.20             |
| Lead paragraph       | Inter            | 18 / 400 / 1.55             |
| Body                 | Inter            | 16 / 400 / 1.55             |
| Caption / meta       | Inter            | 14 / 500 / 1.45             |
| Mono / refs          | Geist Mono       | 14 / 500 / 1.40             |

**Paragraph measure**: 60–75 characters (~680 px container). Never wider on body copy.

### 2.3 Type ramp — admin

| Role              | Family     | Size / weight / line-height |
| ----------------- | ---------- | --------------------------- |
| Page title        | Inter      | 24 / 600 / 1.20             |
| Section heading   | Inter      | 18 / 600 / 1.30             |
| Subhead           | Inter      | 16 / 600 / 1.35             |
| Body              | Inter      | 14 / 400 / 1.45             |
| Dense table cell  | Inter      | 13 / 400 / 1.40             |
| Caption / meta    | Inter      | 12 / 500 / 1.40             |
| Mono / refs / IDs | Geist Mono | 12 / 500 / 1.35             |

**Admin uses one family (Inter) and a tighter scale.** This is the density signal.

### 2.4 Headline treatment

- Public hero display headlines have a 4-px gold underline below, 24 px gap, only when the page is the landing or an article. Never on directory or list pages.
- Article headlines have a small caps label above (category name), Geist Mono 12 / 500, gold color, letter-spacing 0.08em.
- Admin page titles have a 12 px breadcrumb above (Inter 12 / 500 / `--color-ink-faint`), no underline, no decoration.

---

## 3. Color application

### 3.1 Semantic mapping (locked palette → UI role)

| Token                            | Public role                                                            | Admin role                                                                      |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `--color-paper` (#FAF8F3)        | Page background                                                        | Page background                                                                 |
| `--color-paper-2` (#F3EFE6)      | Card surface, footer                                                   | Sidebar background, card surface                                                |
| `--color-paper-3` (#EBE6DA)      | Input field, subdued container                                         | Input field, table-row hover                                                    |
| `--color-navy-primary` (#0B2447) | Primary CTA, headlines (when not serif), top nav text                  | Primary CTA, sidebar active indicator, page titles                              |
| `--color-navy-700` (#19376D)     | CTA hover/pressed                                                      | CTA hover/pressed, sidebar hover                                                |
| `--color-navy-200` (#cdd6e6)     | Focus ring                                                             | Focus ring, selected row highlight                                              |
| `--color-gold` (#B88A3E)         | Editorial accent (headline underline, category label, hero seal frame) | Single per-page emphasis only (e.g., audit log "publish" action border)         |
| `--color-ink` (#1A1A1A)          | Body text                                                              | Body text                                                                       |
| `--color-ink-soft` (#3A3A3A)     | Secondary text, captions                                               | Secondary text, table secondary columns                                         |
| `--color-ink-faint` (#6A6A6A)    | Meta, timestamps, captions on paper                                    | Meta, breadcrumbs, table footer                                                 |
| `--color-ink-ghost` (#B5B5B5)    | Dividers, disabled fill                                                | Dividers, disabled fill, skeleton base                                          |
| `--color-success` (#2D6A3A)      | "Answered", "Published" badges, success toasts                         | Same                                                                            |
| `--color-warn` (#C14A2A)         | Form errors, destructive confirmations                                 | Same                                                                            |
| `--color-highlight` (#FFF3A8)    | Search-result text mark                                                | Search-result text mark, transcript editor active segment fill (at 40% opacity) |

### 3.2 Surface stack

```
Page (--color-paper)
└── Section (transparent on paper)
    └── Card (--color-paper-2)
        └── Input/control (--color-paper-3)
```

Cards have a 1 px `--color-ink-ghost` border at 40% opacity, plus shadow `--shadow-e1`. Never use shadow alone; the border carries the shape on low-bandwidth renders before shadows paint.

### 3.3 The "gold ≤1 per viewport" rule

Gold is the rarest pigment in the system. At most one gold element per visible viewport. On public landing: the hero seal frame OR the "Sangguniang Bayan" wordmark — never both. On admin: gold is reserved for the audit log's "publish/approve" left border AND for the active sidebar indicator dot — and even then, the dot only appears for the _current_ route, so still ≤1.

If a screen tempts a second gold instance, demote one to navy or remove it.

---

## 4. Component-level direction (shadcn primitives)

For each primitive: **purpose per surface · variants · padding/radius/shadow · interactive states**.

### 4.1 Button

| Variant             | Public use                                      | Admin use                                                   | Padding           | Radius            | Shadow                                  |
| ------------------- | ----------------------------------------------- | ----------------------------------------------------------- | ----------------- | ----------------- | --------------------------------------- |
| `default` (primary) | Primary CTA on every page; max one per viewport | Primary action per page (e.g., "Save", "Publish", "Invite") | 12 px y / 20 px x | `--radius-md` (8) | `--shadow-e1` rest, `--shadow-e2` hover |
| `secondary`         | Secondary CTA ("Read more", "View all")         | Secondary action ("Cancel", "Discard")                      | 12 / 20           | 8                 | none                                    |
| `ghost`             | Top-nav links, locale switcher                  | Sidebar items, table-row actions                            | 8 / 12            | 8                 | none                                    |
| `destructive`       | Rare on public (delete-my-query)                | "Delete", "Withdraw", "Deactivate"                          | 12 / 20           | 8                 | `--shadow-e1`                           |
| `outline`           | Marketing CTAs that need restraint              | Filter chips, segmented controls                            | 8 / 16            | 8                 | none                                    |

**Sizes:** `sm` (h 32, padding 8/12), `default` (h 40), `lg` (h 48). Default min-height ≥ 40 (touch target floor).

**State treatments:**

- Hover (default): translate `-1px -1px`, shadow steps up by one level, transition `--duration-fast` `--ease-out`
- Focus-visible: 3 px `--color-navy-200` outline, 2 px offset, no shadow change (focus is independent of hover)
- Active/pressed: translate reset to `0 0`, shadow drops one level, no fill change
- Disabled: opacity 0.4, no shadow, no transform on hover, `cursor: not-allowed`

### 4.2 Card

- Public: padding 24 (`p-6`); cards have margin between of 24 (`gap-6`) on grid; `--shadow-e1` rest, `--shadow-e2` hover-elevated only when card is interactive (links to detail).
- Admin: padding 16 (`p-4`); cards margin 16; `--shadow-e1` only when card sits on `--color-paper`. Cards on `--color-paper-2` (sidebar/dashboard groupings) get no shadow, only the 1 px border.
- Border: 1 px `--color-ink-ghost` at 40% opacity always.
- Radius: `--radius-lg` (12) on public, `--radius-md` (8) on admin. Density signal carried by radius too.

### 4.3 Input + Label + Form

- Inputs: background `--color-paper-3`, border 1 px `--color-ink-ghost`, radius `--radius-md` (8), height 40 (touch floor), padding 8 / 12, font Inter 14 (admin) or 16 (public).
- Public uses **floating labels** (label sits inside input, animates up on focus/value).
- Admin uses **stacked labels** (label above input, 6 px gap) — denser to scan.
- Required marker: `*` in `--color-warn`, after the label, no space.
- Focus: 3 px `--color-navy-200` outline + border darkens to `--color-navy-primary`.
- Error: border `--color-warn`, helper text `--color-warn` 12 / 500 below input, `aria-describedby` linked.
- Helper text and character count (when present) sit below input, Inter 12 / 500 `--color-ink-faint`. Character count uses `aria-live="polite"`.
- Disabled: background `--color-paper-2`, text `--color-ink-faint`, no focus possible.

### 4.4 Form (shadcn Form composition)

- Field gap: 16 (admin) / 24 (public).
- Multi-step forms: progress strip at top (segments not numbers; navy fill for completed, ghost for current, ink-ghost for upcoming). 6 px tall, `--radius-full`.
- Submit button is sticky at bottom on mobile; inline at bottom on desktop.
- The `MultilingualField` pattern: tabbed sub-inputs labeled `English` / `Tagalog` / `Hiligaynon` (full names, not codes); when only `en` is filled, the other tabs show `[TL]` / `[HIL]` placeholder badges next to the tab name.

### 4.5 Table

- Admin only (public has no tables — uses Cards).
- Row height 44 (touch floor); cell padding 12 / 16; font Inter 13 / 400; header Inter 12 / 600 `--color-ink-soft` uppercase letter-spacing 0.05em.
- Zebra striping: alternate rows `--color-paper-2` at 40% opacity.
- Hover: full row `--color-paper-3`.
- Selected: full row `--color-navy-200` at 30%, plus 3 px `--color-navy-primary` left border.
- Sortable column header: caret icon to right of label, animates 180° on toggle, announces sort state via `aria-sort`.
- Empty state: see §6.
- Mobile: tables collapse to Card list (each row becomes a Card with key/value pairs).

### 4.6 Tabs

- Underline style. Active tab: 2 px `--color-navy-primary` underline, text `--color-navy-primary`, weight 600. Inactive: text `--color-ink-soft`, no underline.
- Hover: text `--color-ink`, underline appears at 1 px `--color-ink-ghost`.
- Tab bar bottom border: 1 px `--color-ink-ghost`.
- Animation: underline slides between tabs `--duration-fast` `--ease-out`.
- Roving tabindex, arrow-key navigation per WAI-ARIA tabs pattern.

### 4.7 Badge

| Variant                | Background                | Text                                                |
| ---------------------- | ------------------------- | --------------------------------------------------- |
| `default` (neutral)    | `--color-paper-3`         | `--color-ink-soft`                                  |
| `secondary` (category) | `--color-navy-200` at 50% | `--color-navy-primary`                              |
| `destructive`          | `--color-warn` at 15%     | `--color-warn`                                      |
| `success`              | `--color-success` at 15%  | `--color-success`                                   |
| `outline`              | transparent               | `--color-ink-soft`, 1 px `--color-ink-ghost` border |

- Padding 2 / 8; radius `--radius-pill` (24); font Inter 11 / 600 letter-spacing 0.04em uppercase.
- Status badges (`Published`, `Draft`, `Answered`, `Pending`) always carry a 12 px Lucide icon to the left — never color-only state.

### 4.8 Dialog (modal)

- Backdrop: `rgba(11, 36, 71, 0.45)` (navy at 45%).
- Surface: `--color-paper`, radius `--radius-lg` (12), shadow `--shadow-e3`, max-width 520 (default) or 720 (large).
- Padding: 24 (header) / 24 (body) / 24 (footer); footer right-aligned actions, secondary then primary.
- Enter animation: opacity 0 → 1 + translate `4 px` → `0`, `--duration-slow` `--ease-spring`.
- Close on backdrop click + ESC; focus trap; first focusable element receives focus on open; focus returns to trigger on close.

### 4.9 Sheet (side drawer)

- Used for: mobile sidebar (admin), filter panels, secondary edit forms (e.g., `SpeakerTagger`, member quick-edit).
- Slides from right (default) or left (mobile sidebar). Width 360 (desktop) / 100% (mobile).
- Animation: translate from edge, `--duration-slow` `--ease-spring`.
- Header has close button top-right (32 px Lucide `X`), title left.

### 4.10 Tooltip

- Background: `--color-ink` at 95%, text `--color-paper`, radius `--radius-sm` (4), padding 4 / 8, font Inter 12 / 500.
- Delay: 400 ms open, 0 ms close.
- Animation: opacity 0 → 1, no translate. `--duration-fast`.
- Never used to convey critical information — supplementary only. Always a label-equivalent must exist.

### 4.11 Sonner (toast)

- Position: top-right desktop / top-center mobile.
- Surface: `--color-paper`, border 1 px `--color-ink-ghost`, shadow `--shadow-e2`, radius `--radius-md`.
- Variants: `default`, `success`, `warning`, `error`. Each carries an icon (Lucide 16 px) on left in the variant color.
- Auto-dismiss 4000 ms (5000 for warning, 6000 for error), with progress strip on bottom edge.
- Action button if present: ghost `sm` button right-aligned.
- Animation: slide in from edge + fade, `--duration-base` `--ease-out`.

### 4.12 Avatar

- Square 1:1 with `--radius-full` (circle) for member portraits in directories; `--radius-md` (rounded square) in admin tables for compactness.
- Sizes: `sm` 24, `md` 40, `lg` 64, `xl` 120 (member detail page).
- Fallback: initials in Inter 600, gold (`--color-gold`) text on navy (`--color-navy-primary`) background. Two-letter initials (first + last). Always include `alt` matching the member name.
- Border: 1 px `--color-ink-ghost` at 40% on paper backgrounds.

### 4.13 Skeleton

- Background: `--color-paper-3`. No shimmer animation (3G performance + reduced motion respect). Static placeholder.
- Match the dimensions of the actual content; never use generic full-width bars.
- Used at: list/card skeleton (matches Card padding + heading + 2 lines); table row skeleton (matches row height); avatar skeleton (circle/square matching size).

### 4.14 DropdownMenu

- Surface: `--color-paper`, border 1 px `--color-ink-ghost`, shadow `--shadow-e2`, radius `--radius-md`, min-width 180.
- Item: padding 8 / 12, font Inter 14 / 500, hover `--color-paper-3`.
- Separator: 1 px `--color-ink-ghost` at 40%, vertical margin 4.
- Item with destructive intent: text `--color-warn`.
- Animation: opacity + translate `4px → 0`, `--duration-fast` `--ease-out`.

### 4.15 Sidebar (admin only)

- Background `--color-paper-2`, right border 1 px `--color-ink-ghost`.
- Width 240 expanded, 64 collapsed.
- Items: padding 12 / 16, font Inter 14 / 500, icon 20 Lucide on left, label right of icon.
- Active item: `--color-navy-primary` text + weight 600, 3 px gold left border (the gold-≤1 carrier on admin), background transparent.
- Hover (non-active): `--color-paper-3` background.
- Collapse toggle: bottom of sidebar, ghost button with chevron icon.
- Section group label: Inter 11 / 600 uppercase letter-spacing 0.05em `--color-ink-faint`, padding 16 / 16 / 4.

---

## 5. Form patterns

| Pattern           | Treatment                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label position    | Public: floating inside input. Admin: stacked above (6 px gap).                                                                                                                     |
| Required marker   | `*` in `--color-warn` after label, no space, no parens                                                                                                                              |
| Helper text       | Below input, Inter 12 / 500 `--color-ink-faint`, max one line — wrap to two if absolutely needed                                                                                    |
| Error state       | Border `--color-warn`, helper text replaced with error text in `--color-warn`, `aria-describedby` linked, `aria-invalid="true"` set, focus moves to first error on submit           |
| Character count   | Below input, right-aligned, Inter 12 / 500 `--color-ink-faint`, turns `--color-warn` at 90% capacity, `aria-live="polite"`                                                          |
| Multi-step flow   | Progress strip top, step title below, single primary action right, "Back" ghost left, allow keyboard `Enter` to proceed when valid                                                  |
| MultilingualField | Tabs labeled `English` / `Tagalog` / `Hiligaynon`. `[TL]` / `[HIL]` badge appears on tabs that are unfilled when `en` has value. Save persists per-locale via `translations` table. |
| Submit button     | Disabled until form is valid (soft disabled with reasoned tooltip, never silent)                                                                                                    |
| Optimistic update | UI updates immediately on submit; rolls back with toast if server returns `ok: false`                                                                                               |

---

## 6. Empty / loading / error states

### 6.1 Empty (no data yet)

| Surface | Treatment                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public  | Soft, warm. Source Serif Pro 24 heading ("No news yet"), Inter 16 body ("New announcements will appear here. Visit again soon."), centered, no illustration, no CTA needed.            |
| Admin   | Functional. Inter 16 / 600 heading ("No meetings scheduled"), Inter 14 body ("Create the first meeting to start recording."), Inter primary CTA ("New meeting"), left-aligned in card. |

### 6.2 Loading (data en route)

| Surface | Treatment                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public  | Skeleton in the shape of the content (article: headline + 4 lines + meta; card grid: 6 card skeletons). No spinner.                                              |
| Admin   | Skeleton for tables (row skeletons matching real row height). For full-page loads: top progress strip 2 px navy, animates left-to-right, `aria-label="Loading"`. |

### 6.3 Error (data fetch failed)

| Surface | Treatment                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public  | Warm, reassuring. Inter 18 / 600 ("We couldn't load that right now"), Inter 14 body ("Please check your connection or try again in a moment."), secondary "Try again" button. Includes `role="alert"`.                                      |
| Admin   | Informational, retry-forward. Inter 16 / 600 ("Failed to load meetings"), Inter 14 body with the actual error code (`E_DB_TIMEOUT`), Inter 14 mono error ID for support, primary "Retry" button + ghost "Open status page". `role="alert"`. |

### 6.4 Cached fallback (network failed but cache exists)

Both surfaces: render last cached data with a banner above content: `Showing cached data, X hours old · Refresh`. Banner uses `--color-paper-3` background, `--color-ink-soft` text, ghost "Refresh" button right-aligned.

---

## 7. Motion philosophy

| Surface | Default duration           | Default easing  | Where motion is allowed                                                                                                         |
| ------- | -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Public  | `--duration-base` (180 ms) | `--ease-out`    | Page transitions (fade only), card hover (subtle elevation), tab underline slide, modal/sheet entry, locale switch announcement |
| Admin   | `--duration-fast` (120 ms) | `--ease-out`    | Button press feedback, dropdown open, tooltip appear, optimistic state changes, focus ring transitions                          |
| Both    | `--duration-slow` (260 ms) | `--ease-spring` | Modal open, Sheet drawer slide, mobile drawer                                                                                   |

### Motion rules

- **No parallax.** Ever.
- **No scroll-triggered animations on public.** 3G performance is a hard requirement.
- **No decorative motion.** Motion serves comprehension only — direction of change, state transition, focus.
- **Respect `prefers-reduced-motion`.** When set: all motion durations collapse to 0 (instant), opacity transitions remain (they're the accessible substitute for movement).
- **No animated loading spinners.** Use static skeletons or the 2 px top progress strip.
- **Recorder UI.** The "REC" pulsing dot is the one allowed continuous motion — opacity oscillation 1.0 → 0.5 → 1.0 over 1500 ms. It carries critical state (recording in progress) and is paired with `aria-label="Recording in progress"`.

---

## 8. Density rule applied — paired component examples

| Pair                    | Public             | Admin                             |
| ----------------------- | ------------------ | --------------------------------- |
| Card padding            | 24 (`p-6`)         | 16 (`p-4`)                        |
| Card radius             | 12 (`--radius-lg`) | 8 (`--radius-md`)                 |
| Section gutter          | 48 / 64            | 16 / 24                           |
| Body line-height        | 1.55               | 1.45                              |
| Button height (default) | 48 (`lg`)          | 40 (`default`)                    |
| Form field gap          | 24                 | 16                                |
| Table                   | n/a (use Cards)    | row 44, padding 12/16, font 13    |
| Avatar default          | 64 (`lg`)          | 40 (`md`)                         |
| Page max-width          | 1120 (article 680) | none (stretches to viewport - 24) |
| Hero block height       | min 480            | n/a (no hero on admin)            |

---

## 9. Accessibility floor

| Concern            | Spec                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Focus ring         | 3 px solid `--color-navy-200`, 2 px offset, never removed; visible on every focusable element                         |
| Touch target       | 44 × 44 px minimum (admin tables solve via row padding, not button size)                                              |
| Reduced motion     | `@media (prefers-reduced-motion: reduce)` collapses all durations to 0; opacity transitions retained                  |
| Color contrast     | Body text on paper ≥ 7:1 (AAA); secondary text ≥ 4.5:1 (AA); meta/timestamps ≥ 3:1 (large-text AA only)               |
| Color independence | No state communicated by color alone; every status badge has icon + text; every chart legend has shape + label        |
| Skip link          | First focusable element on every page, skips to main content; visible on focus                                        |
| Heading order      | Strict h1 → h2 → h3; no skipped levels; one h1 per page                                                               |
| Form errors        | Focus moves to first invalid field on submit; `aria-invalid` + `aria-describedby` on every error                      |
| Live regions       | Toasts use `role="status"` (success) or `role="alert"` (error); character counts use `aria-live="polite"`             |
| Keyboard           | Every interaction reachable by keyboard; no `mousedown`-only handlers; ESC closes overlays; arrow keys for tabs/menus |
| Lang attribute     | `<html lang>` matches the active locale on every public route; `<span lang>` for inline foreign-language quotes       |

---

## 10. Seal usage rules

The official municipal seal of Lambunao is at `public/seal/lambunao-seal.png`. It is the highest-trust visual element in the system.

**Always:**

- Include `alt="Official seal of Lambunao Municipality, Province of Iloilo"` on every render.
- Maintain 1:1 aspect ratio.
- Render at fixed pixel dimensions (use `next/image` with explicit `width` and `height`).
- Place on `--color-paper` background, with 24 px padding around it, ideally framed with a 1 px gold (`--color-gold`) border at 40% opacity for the hero use only.
- Lazy-load below-the-fold uses; preload the landing hero use via `<link rel="preload">`.

**Never:**

- Rotate, skew, flip, or distort.
- Apply filters, blur, blend modes, gradients, or color overlays.
- Place on top of photography or pattern.
- Use as a decorative repeating element.
- Crop or partially mask.
- Resize below 32 × 32 (favicon excepted).
- Replace with a generated alternative.
- Animate.

**Sizes by context:**

- Landing hero: 240 × 240
- About page header: 160 × 160
- Public footer mark: 48 × 48
- Auth page mark: 64 × 64
- Admin topbar (tenant identity): 32 × 32
- Favicon: 32 × 32 (separate optimized asset)
- OG image: 200 × 200 within the 1200 × 630 frame

---

## 11. What this brief leaves to per-screen judgment

The following are NOT specified by this brief — they are implementation decisions per screen:

- Specific copy for empty/error/loading states beyond the patterns in §6
- The exact composition of the public landing hero (seal placement, mission copy phrasing, news teaser layout) — Phase 2 reference screen P1 will set the precedent
- Exact admin dashboard widget composition (which "hero cards" appear in what order)
- The transcript editor two-pane proportions (audio vs. segments) — this is one of the novel custom components and earns a per-screen design pass during Phase 3
- The recorder UI's button arrangement and microphone affordances
- News composer MDX toolbar item set
- Resolution PDF visual layout (handled by `@react-pdf/renderer`; design language must align with this brief but the print medium has its own constraints)
- Marketing page additional imagery (other than the seal and member portraits)
- Per-screen breakpoint adjustments where the responsive rules in §1 don't cover the case

---

## 12. Recommended impeccable references for Phase 1

When the impeccable skill runs in Phase 1 (teach + craft modes), prioritize loading these references:

- `spatial-design.md` — for the dual-grid system (public 8-col vs. admin 12-col)
- `interaction-design.md` — for the form patterns and primitive state treatments
- `typography.md` — for the dual type-mix rule
- `color-systems.md` — for the gold-≤1 rule and surface stack
- `accessibility.md` — for the WCAG 2.1 AA floor
- `motion-design.md` — for the reduced-motion strategy and per-surface duration rule

---

## 13. Open questions for implementation to resolve

1. **Sidebar grouping** — should admin sidebar items be grouped under section labels (e.g., "Operations", "Content", "Admin"), or flat? Defer to first reference screen pass.
2. **Public locale switcher** — dropdown or inline three-button toggle? Defer to P1 reference screen.
3. **Audit indicator placement** — the persistent "actions are logged" cue. Topbar pill? Status bar text? Defer to A2 (Dashboard) reference screen.
4. **Recorder mobile layout** — the recorder is the most novel component; mobile-specific affordances (large stop button, haptic feedback) will land during Phase 3, not Phase 2.
5. **Filipino-language vetting** — copy needs review by a fluent Hiligaynon speaker. Phase 1 ships English-only UI strings; Phase 3 layers in TL/HIL via `messages/*.json`.

---

## 14. Phase 1 contract (what this brief authorizes)

When Phase 1 runs, it executes against this brief:

1. **Token transcription** (`app/globals.css`): paste §13 tokens verbatim; add z-index scale (0/10/20/30/40/50 mapping to base/dropdown/sticky/overlay/modal/toast); add semantic aliases per §3.1 (e.g., `--surface-card: var(--color-paper-2)`).
2. **Typography wiring** (`app/layout.tsx` + `app/globals.css`): load Inter, Source Serif Pro, Geist Mono via `next/font`; expose via `--font-sans`, `--font-serif`, `--font-mono`; configure type ramp utilities per §2.
3. **shadcn primitive restyling** (`components/ui/*`): apply §4 specs to each primitive; add variants where missing; preserve Radix accessibility behavior.

Phase 1 does NOT build screens. The first screen is built in Phase 2 (the three reference screens), governed by this brief.
