# SB Lambunao — Design Direction

**Date:** 2026-04-28
**Phase:** 0 (Ground truth → brainstorm → shape brief)
**Status:** Approved by user, pending shape brief

This document captures the design direction for SB Lambunao established during Phase 0 brainstorming. It is the input to the shape skill (Phase 0 step 3), which will translate it into a concrete brief; the brief in turn governs Phase 1 (token wiring, typography, primitive restyling).

---

## 1. Project context

SB Lambunao is the digital operations platform for the Sangguniang Bayan (Municipal Council) of Lambunao, Iloilo, Philippines. One codebase, two surfaces:

- **Admin** — operational, dense, fast. Used by council secretaries, mayor, vice-mayor, SB members, other-LGU staff to run meetings, edit transcripts, publish resolutions, triage citizen queries, manage members and news, view audit logs.
- **Public** — civic, trustworthy, accessible. Used by Lambunao citizens to read news, browse members, submit queries.

**Hard constraints already locked:**

- Tokens locked in `PROJECT.md` §13: navy `#0B2447` and gold `#B88A3E` on warm paper `#FAF8F3`; Inter (UI/body), Source Serif Pro (editorial public headlines), Geist Mono; spacing `4/8/12/16/24/32/48/64`; radii `0/4/8/12/24/999`; shadows e1/e2/e3; motion 120/180/260ms.
- Light mode only for v1.
- WCAG 2.1 AA on every public route; keyboard-navigable on every admin route.
- Low-bandwidth (3G mobile) hard requirement on the public surface.
- Trilingual (`en` / `tl` / `hil`) at the data layer.
- 26 unique desktop screens; mobile is responsive of each, not separate deliverables.

---

## 2. Approach selected

**A. Civic broadsheet + operational atelier.** Public reads like a small-town Philippine broadsheet — Source Serif Pro headlines on warm paper, generous whitespace, the seal mounted with reverence. Admin is a quiet operational atelier — Inter-only, dense 12-col grid, low ceremony, every state visible. They share palette, type families, motion language, and the seal as anchor; they differ in density, layout grid, and typographic mix.

**Rejected alternatives:**

- _Modern minimalism_ (Vercel/Linear-style) — feels Silicon Valley, disconnects from Filipino civic context, wastes the warm-paper palette already locked.
- _Heritage formal_ (full-classical 1950s government document) — feels dated, alienates younger citizens, and §13 tokens already carry the right warmth.

---

## 3. Mood and archetype

| Surface | Archetype      | References                                                                                                                | Emotional read                                                                                                    |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Public  | The Town Crier | Philippine Daily Inquirer web edition, Singapore gov design system, NYTimes article pages, Filipino municipal newsletters | "This is the official council. I trust them. I can read it on my phone in a barangay." Warm, dignified, generous. |
| Admin   | The Magistrate | Linear, Notion's dense views, NYTimes Cooking admin, classical ledger paper                                               | "I'm not going to lose my work. The system remembers." High information density, low ceremony, calm.              |

The transition from public to admin (login) should feel like _stepping behind the counter_ — same building, different room.

---

## 4. Same vs. different

**Through-line (always the same):**

- Locked palette in identical semantic roles
- Type families (Inter, Source Serif Pro, Geist Mono) — mixed differently per surface
- Motion language — same easings, same durations
- The seal — anchor of identity, mounted the same way
- Form patterns — same input styling, same focus ring (`#cdd6e6`, 3px outline, 2px offset)
- Iconography — Lucide 1.8 stroke, 24px viewbox, named imports only

**Per-surface differences:**

| Dimension    | Public                                             | Admin                                          |
| ------------ | -------------------------------------------------- | ---------------------------------------------- |
| Layout grid  | 8-col editorial, max-width 1120, generous gutters  | 12-col, sidebar 240px, content stretches       |
| Type mix     | Source Serif Pro headlines + Inter body            | Inter-only (density-first)                     |
| Density      | Component padding 24/32, section gutters 48/64     | Component padding 12/16, section gutters 16/24 |
| Motion       | 180ms ease (gentle reveal)                         | 120ms snap (responsive feedback)               |
| Imagery      | Member portraits + the seal + barangay photography | None — pure UI; data is the imagery            |
| Voice        | Bilingual-respectful, conversational               | Functional English, action-first labels        |
| Hero pattern | Centered, narrative, mission-forward               | Topbar + breadcrumb + primary action           |

---

## 5. Layout system

```
PUBLIC                              ADMIN
┌──────────────────────────────┐   ┌──────┬───────────────────────┐
│ TopNav  EN | TL | HIL    Search │   │      │ Topbar · breadcrumb   │
├──────────────────────────────┤   │ Side ├───────────────────────┤
│                              │   │ Nav  │                       │
│      [SEAL]                  │   │      │   Content (12-col)    │
│   Mission pull-quote         │   │ 240  │   Padding 12/16       │
│   (Source Serif Pro 32)      │   │      │   Density: 1.0x       │
│                              │   │      │                       │
│   Editorial body (Inter 16)  │   │      │                       │
│                              │   │      │                       │
├──────────────────────────────┤   │      │                       │
│ Footer · seal mark · DPO     │   │      │ Status bar (Geist)    │
└──────────────────────────────┘   └──────┴───────────────────────┘
8-col, max-w 1120, gutters 32     12-col, sidebar fixed, gutters 16
```

---

## 6. Civic-context risks (non-obvious)

1. **"Gov website = ugly default."** Filipinos have low expectations of LGU sites. Over-correcting reads as Silicon Valley; under-correcting inherits bad gov.ph conventions. The broadsheet anchor solves this — Filipinos already trust local papers.
2. **Trilingual respect.** Language switcher is an equal-citizen choice. Top nav, not footer. Show **English / Tagalog / Hiligaynon** as words, never as flag icons (flags conflate language with nationality and exclude regional languages).
3. **The seal is not decoration.** Official municipal seal of Lambunao, Iloilo. Every use: alt text, never rotated, never overlaid with effects, never stylized. The hero seal on landing is the largest typographic-weight element on the page.
4. **Mobile-first means MOBILE-first.** Citizens read this on a phone in a barangay on 3G. Hero images compressed to ≤80KB, lazy-loaded with explicit dimensions. Public landing renders usable HTML in <1.5s on 3G. No skeleton-loader theatre while a 2MB image loads.
5. **Audit context — "everything I do is being recorded."** Admin UI subtly reminds users that actions are logged (small persistent indicator), without being threatening. Audit log uses calm color-coded left borders + icon + text — never color-only.
6. **Honoring "Hon."** Every member display uses the `Hon.` honorific per project convention. Do not strip for visual cleanness.
7. **Code-switching is normal.** Meetings happen in Hiligaynon + English mixed in the same sentence. Transcript editor UI supports per-segment locale tagging as a first-class control, not a hidden dropdown.
8. **Touch targets vs. density.** Admin used primarily on desktop, but secretaries also use tablets. ≥44×44 touch targets even on dense tables — solve via row padding, not button-size compromises.
9. **Photography liability.** Member portraits will vary in quality. Opinionated 1:1 crop + warm-paper background fallback (initials in gold on navy at `radius-pill`) so directories look uniform regardless of source quality.
10. **Civic seriousness vs. accessible tone.** Public copy must be respectful but not academic. UI strings vetted by someone fluent in Hiligaynon — never machine-translated. The `[TL]` / `[HIL]` placeholder convention is honest; auto-translation is dishonest.

---

## 7. Three rules that govern every screen

1. **Density follows surface.** If it's `app/(app)/*`, admin density. If it's `app/[locale]/(marketing)/*`, public density. Never mix.
2. **Color carries meaning, never decoration.** Navy = institutional / CTAs. Gold = emphasis only (≤1 instance per viewport). Success / warn = state, never style. Never use color alone to communicate state — always pair with icon + text.
3. **Motion serves comprehension.** 120ms snap for admin feedback (button presses, toggles). 180ms ease for public reveals (page transitions, card loads). 260ms slow only for modals and sheets. No decorative motion. No parallax. No scroll-triggered animations on public (3G performance).

---

## 8. What this direction does NOT decide

The shape skill (Phase 0 step 3) will turn this direction into a concrete brief covering:

- Component-level styling decisions for each shadcn primitive in `components/ui/`
- Exact admin sidebar layout (collapse behavior, active-state treatment, section grouping)
- Public hero composition (seal placement, mission copy treatment, news teaser grid)
- Form layout patterns (label position, required-field marker, error state, multi-step flows)
- Empty / loading / error state treatments per surface
- Print-style treatments for resolution PDFs (handled by `@react-pdf/renderer`, but the design language must match)
- Recorder UI affordances (the most novel admin component)

Phase 1 tasks already updated in the task list:

- Task #4: transcribe locked tokens from PROJECT.md §13 into `app/globals.css`, add z-index scale (not in §13)
- Task #5: configure typography per §13.2 (Inter + Source Serif Pro + Geist Mono)
- Task #6: restyle shadcn primitives (the real Phase 1 design work)

---

## 9. Decisions ratified by user (2026-04-28)

- 26 unique desktop screens (mobile = responsive adaptations, not separate deliverables)
- Brainstorm/shape skills decide _application_ of locked tokens, not token values
- Light mode only for v1; dark-mode tokens in §13 reserved
