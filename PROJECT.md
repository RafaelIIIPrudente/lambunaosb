# PROJECT.md — SB Lambunao

Canonical source of truth for product intent, domain model, and project-specific decisions. Pair with `CLAUDE.md` (rules and conventions) and `BASEPLATE.md` (stack rationale and setup).

---

## 1. Overview

SB Lambunao is the digital operations platform for the Sangguniang Bayan (Municipal Council) of Lambunao, Iloilo, Philippines. It serves two distinct audiences from a single codebase: **council staff and members** (admin surface — meetings, transcripts, resolutions, members, news, citizen-query triage, audit log, settings) and **citizens of Lambunao** (public surface — landing, news, members directory, member detail, submit query, confirmation, about). Operational success means: every regular session is recorded, transcribed, and published as minutes within 7 days; every citizen query is acknowledged within 24 hours and resolved within 3 business days; every published resolution is downloadable as a signed PDF; the public surface stays usable on a 3G connection from a mobile phone in a barangay.

---

## 2. Mission and operating principles

**Mission**: Enact responsive ordinances, exercise transparent oversight of municipal affairs, and faithfully represent the voice of every Lambunaonon — kabataan, kababaihan, magbubukid, kag mga senior.

**Data privacy posture**: Compliant with the Philippine Data Privacy Act of 2012 (RA 10173). Collect the minimum necessary personal information (name + email only on citizen queries). Retain for 3 years. Provide a documented deletion path. Surface explicit consent on every data-collecting form.

**Operating principles** (encode as design constraints):

1. **Transparency by default.** Public actions (resolution publication, news posts, minutes) are visible without authentication. Withholding is the exception, not the default.
2. **Accessibility is a hard requirement.** WCAG 2.1 AA on every public route. Keyboard-navigable on every admin route. No exceptions for "internal" tools.
3. **Multilingual at the data layer.** Every user-facing string belongs to a locale (`en`, `tl`, `hil`). The data model carries translations; the UI never burns English into the schema.
4. **Low-bandwidth-friendly.** Critical CSS inlined, fonts preloaded, images lazy with explicit dimensions, audio recorder buffers offline, list screens cache and degrade gracefully.
5. **Audit-trail-by-default.** Every state transition by an admin user (publish, approve, reply, assign, invite, delete) writes an append-only `audit_log_entries` row. The audit log is read-only at the database level.

---

## 3. Stack alignment

This project conforms to `BASEPLATE.md` and `CLAUDE.md` without exception. Stack details (Next.js 15 App Router + RSC default, Supabase as sole auth + Postgres + Storage, Tailwind v4, shadcn/ui Radix-based, Drizzle ORM, Vercel deployment, pnpm, TypeScript strict + `noUncheckedIndexedAccess`, plus the full complementary picks) are defined there; see `CLAUDE.md` § Core stack and § Complementary stack — concern → package.

SB-Lambunao-specific additions on top of BASEPLATE:

- `next-intl` — App Router-native i18n for EN/TL/HIL.
- `@react-pdf/renderer` — server-side PDF generation for resolutions and meeting minutes.
- `@marsidev/react-turnstile` — Cloudflare Turnstile widget for the public submit-query form.
- ASR (automatic speech recognition) provider — **RESEARCH NEEDED** (see § 22).

No package in BASEPLATE is removed or replaced. Where this document references a tool, capability, or convention already in BASEPLATE/CLAUDE.md, it cross-links rather than duplicates.

---

## 4. Project-specific conventions

| Convention              | Format                                                                   | Example                          |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------------- |
| Resolution number       | `RES-YYYY-NNN` (zero-padded 3-digit sequence per year)                   | `RES-2026-014`                   |
| Citizen query reference | `Q-YYYY-NNNN` (zero-padded 4-digit sequence per year)                    | `Q-2026-0142`                    |
| SB term label           | `TERM YYYY-YYYY`                                                         | `TERM 2025-2028`                 |
| Meeting label (display) | `<Type> Session #<seq>`                                                  | `Regular Session #14`            |
| Member display          | `Hon. <full_name>`                                                       | `Hon. Maria dela Cruz`           |
| Locale codes            | `en`, `tl`, `hil` (BCP 47-style; `tl` = Tagalog, `hil` = Hiligaynon)     | —                                |
| Placeholder bracket     | `[TL]` and `[HIL]` for untranslated content until human translator lands | `[TL] Naghihintay ng pagsasalin` |

**RBAC keying**: every multi-tenant or per-user row joins `auth.uid()` for RLS. Never application-layer authorization alone.

**Seal asset path**: `public/seal/lambunao-seal.png` — official municipal seal, Province of Iloilo. Source provided by Office of the Mayor; do not modify without written authorization. Used in cover, public landing hero, footer mark, OG image.

**Lambunao official contact info** (seed into `tenants` table on first deploy):

```text
Tenant slug:    lambunao
Display name:   Sangguniang Bayan ng Lambunao
Office:         SB Office, 2nd Floor Municipal Hall, Plaza Rizal, Brgy. Poblacion, Lambunao, Iloilo 5018
Phone:          (033) 333-1234
Email:          sb@lambunao.gov.ph
DPO email:      dpo@lambunao.gov.ph
Office hours:   Mon–Fri, 08:00–17:00 PHT (closed weekends + Philippine public holidays)
Established:    1948
```

---

## 5. Domain model

All schemas live in `lib/db/schema.ts`. Migrations in `lib/db/migrations/` are generated by Drizzle Kit. Every multi-tenant table carries `tenant_id` (UUID, FK `tenants.id`, `on delete cascade`). Every row carries `created_at` and `updated_at` (UTC timestamps, default `now()`). Every soft-deletable entity carries `deleted_at` (nullable). All TypeScript types exported as `<Entity>` (select) and `New<Entity>` (insert) per `CLAUDE.md` § Drizzle Patterns.

### 5.1 Tenant

Single-tenant in production today, but architected as multi-tenant so a sister LGU could be onboarded without schema migration. Every row joins `tenants.id` and every RLS policy filters on it.

```typescript
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  province: text('province').notNull(),
  establishedYear: integer('established_year'),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  dpoEmail: text('dpo_email').notNull(),
  officeAddress: text('office_address'),
  sealStoragePath: text('seal_storage_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
```

**Indexes**: `slug` (unique).

### 5.2 User profile

`profiles` mirrors `auth.users` 1:1 via shared id and adds tenant + role + display fields.

```typescript
export const userRole = pgEnum('user_role', [
  'secretary',
  'mayor',
  'vice_mayor',
  'sb_member',
  'other_lgu',
]);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // FK to auth.users(id)
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  role: userRole('role').notNull(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  honorific: text('honorific').default('Hon.'),
  avatarStoragePath: text('avatar_storage_path'),
  memberId: uuid('member_id').references(() => sbMembers.id, { onDelete: 'set null' }),
  active: boolean('active').notNull().default(true),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
```

**Indexes**: `(tenant_id, role)`, `(tenant_id, active)`, `email` (unique within tenant).
**Relations**: optional 1:1 to `sb_members` for council members who hold an admin login.

### 5.3 SB Member

The roster of council members. Independent of `profiles` because not every member needs an admin login (e.g., ex-officio reps may be display-only).

```typescript
export const memberPosition = pgEnum('member_position', [
  'mayor',
  'vice_mayor',
  'sb_member',
  'sk_chairperson', // youth ex-officio
  'liga_president', // barangay captains ex-officio
  'ipmr', // Indigenous Peoples Mandatory Representative
]);

export const sbMembers = pgTable('sb_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  honorific: text('honorific').notNull().default('Hon.'),
  position: memberPosition('position').notNull(),
  termStartYear: integer('term_start_year').notNull(),
  termEndYear: integer('term_end_year').notNull(),
  photoStoragePath: text('photo_storage_path'),
  contactEmail: text('contact_email'),
  bioMd: text('bio_md'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type SBMember = typeof sbMembers.$inferSelect;
export type NewSBMember = typeof sbMembers.$inferInsert;
```

**Indexes**: `(tenant_id, active, sort_order)`, `(tenant_id, position)`.

### 5.4 Committee

Standing and ad-hoc committees of the Sangguniang Bayan. Examples: Health & Sanitation, Education, Women & Family, Public Safety, Appropriations, Rules.

```typescript
export const committees = pgTable('committees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  isStanding: boolean('is_standing').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Committee = typeof committees.$inferSelect;
export type NewCommittee = typeof committees.$inferInsert;
```

**Indexes**: `(tenant_id, slug)` (unique), `(tenant_id, sort_order)`.

### 5.5 Membership assignment

Many-to-many bridge between `sb_members` and `committees` with a per-assignment role (chair / vice-chair / member).

```typescript
export const committeeRole = pgEnum('committee_role', ['chair', 'vice_chair', 'member']);

export const membershipAssignments = pgTable('membership_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => sbMembers.id, { onDelete: 'cascade' }),
  committeeId: uuid('committee_id')
    .notNull()
    .references(() => committees.id, { onDelete: 'cascade' }),
  role: committeeRole('role').notNull().default('member'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MembershipAssignment = typeof membershipAssignments.$inferSelect;
export type NewMembershipAssignment = typeof membershipAssignments.$inferInsert;
```

**Indexes**: `(member_id, committee_id, start_date)` (unique to prevent duplicate assignments), `(committee_id, end_date)`.

### 5.6 Meeting

A council session: regular, special, committee-of-the-whole, or committee-specific.

```typescript
export const meetingType = pgEnum('meeting_type', [
  'regular',
  'special',
  'committee_of_whole',
  'committee',
  'public_hearing',
]);

export const meetingStatus = pgEnum('meeting_status', [
  'scheduled',
  'in_progress',
  'awaiting_transcript',
  'transcript_in_review',
  'transcript_approved',
  'minutes_published',
  'cancelled',
]);

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: meetingType('type').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  title: text('title').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  presiderId: uuid('presider_id').references(() => sbMembers.id),
  location: text('location').notNull().default('Session Hall, 2/F Municipal Hall'),
  agendaJson: jsonb('agenda_json').$type<AgendaItem[]>().notNull().default([]),
  primaryLocale: text('primary_locale').notNull().default('hil'),
  status: meetingStatus('status').notNull().default('scheduled'),
  audioStoragePrefix: text('audio_storage_prefix'), // e.g. tenants/<id>/meetings/<id>/audio/
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export type AgendaItem = {
  id: string;
  order: number;
  title: string;
  presenter?: string;
  durationMinutes?: number;
};
```

**Indexes**: `(tenant_id, scheduled_at desc)` (list view), `(tenant_id, status)`, `(tenant_id, type, sequence_number)` (unique).

### 5.7 Audio chunk

Per-chunk record for the resumable upload pipeline. Allows the recorder to upload incrementally and survive network interruptions.

```typescript
export const audioChunks = pgTable('audio_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  clientChunkId: uuid('client_chunk_id').notNull(), // idempotency key from client
  sequenceIndex: integer('sequence_index').notNull(),
  durationMs: integer('duration_ms').notNull(),
  byteSize: integer('byte_size').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull().default('audio/webm;codecs=opus'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AudioChunk = typeof audioChunks.$inferSelect;
export type NewAudioChunk = typeof audioChunks.$inferInsert;
```

**Indexes**: `(meeting_id, sequence_index)` (unique), `client_chunk_id` (unique — idempotency).

### 5.8 Transcript

The full transcript of a meeting. Immutable except via the editor; approval freezes it.

```typescript
export const transcriptStatus = pgEnum('transcript_status', [
  'awaiting_asr',
  'asr_failed',
  'in_review',
  'approved',
  'rejected',
]);

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' })
    .unique(),
  primaryLocale: text('primary_locale').notNull().default('hil'),
  asrProvider: text('asr_provider'), // 'whisper' | 'deepgram' | 'assemblyai' | 'manual' — TBD per § 22
  asrJobId: text('asr_job_id'),
  status: transcriptStatus('status').notNull().default('awaiting_asr'),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
```

**Indexes**: `(tenant_id, status)`, `meeting_id` (unique).

### 5.9 Transcript segment

Each speaker turn within a transcript. Editable individually. Locale-tagged per segment for code-switching meetings (common in Lambunao — speakers may mix Hiligaynon and English in the same session).

```typescript
export const transcriptSegments = pgTable('transcript_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transcriptId: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  sequenceIndex: integer('sequence_index').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  speakerId: uuid('speaker_id').references(() => sbMembers.id),
  speakerLabel: text('speaker_label'), // free-form when speaker is not on the council
  locale: text('locale').notNull(),
  text: text('text').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  editedBy: uuid('edited_by').references(() => profiles.id),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type NewTranscriptSegment = typeof transcriptSegments.$inferInsert;
```

**Indexes**: `(transcript_id, sequence_index)` (unique), `(transcript_id, start_ms)`, full-text GIN index on `text` (locale-aware via `to_tsvector`).

### 5.10 Resolution

A formal resolution or ordinance enacted by the council.

```typescript
export const resolutionStatus = pgEnum('resolution_status', [
  'draft',
  'pending',
  'approved',
  'withdrawn',
  'published',
]);

export const resolutions = pgTable('resolutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  number: text('number').notNull(), // RES-2026-014
  year: integer('year').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull(),
  primarySponsorId: uuid('primary_sponsor_id').references(() => sbMembers.id),
  coSponsorIds: jsonb('co_sponsor_ids').$type<string[]>().notNull().default([]),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  committeeId: uuid('committee_id').references(() => committees.id),
  status: resolutionStatus('status').notNull().default('draft'),
  pdfStoragePath: text('pdf_storage_path'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Resolution = typeof resolutions.$inferSelect;
export type NewResolution = typeof resolutions.$inferInsert;
```

**Indexes**: `(tenant_id, number)` (unique), `(tenant_id, year, sequence_number)` (unique), `(tenant_id, status, published_at desc)`, GIN on `to_tsvector('simple', title || ' ' || body_md)`.

### 5.11 News post

Bulletin posts shown on the public news feed and (optionally) admin-only.

```typescript
export const newsCategory = pgEnum('news_category', [
  'health',
  'notice',
  'hearing',
  'event',
  'announcement',
  'press_release',
]);

export const newsStatus = pgEnum('news_status', ['draft', 'published', 'archived']);
export const newsVisibility = pgEnum('news_visibility', ['public', 'admin_only']);

export const newsPosts = pgTable('news_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  bodyMdx: text('body_mdx').notNull(),
  category: newsCategory('category').notNull(),
  status: newsStatus('status').notNull().default('draft'),
  visibility: newsVisibility('visibility').notNull().default('public'),
  coverStoragePath: text('cover_storage_path'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  authorId: uuid('author_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type NewsPost = typeof newsPosts.$inferSelect;
export type NewNewsPost = typeof newsPosts.$inferInsert;
```

**Indexes**: `(tenant_id, slug)` (unique), `(tenant_id, status, visibility, published_at desc)`, `(tenant_id, category)`.

### 5.12 Citizen query

The single point of contact between citizens and the SB. Stores name + email only (per RA 10173 minimum-collection rule).

```typescript
export const citizenQueryStatus = pgEnum('citizen_query_status', [
  'new',
  'in_progress',
  'awaiting_citizen',
  'answered',
  'closed',
  'spam',
]);

export const citizenQueryCategory = pgEnum('citizen_query_category', [
  'general',
  'permits',
  'health',
  'roads_infrastructure',
  'public_safety',
  'environment',
  'social_services',
  'feedback_on_resolution',
  'other',
]);

export const citizenQueries = pgTable('citizen_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ref: text('ref').notNull(), // Q-2026-0142
  year: integer('year').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  submitterName: text('submitter_name').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  subject: text('subject').notNull(),
  messageMd: text('message_md').notNull(),
  category: citizenQueryCategory('category').notNull().default('general'),
  status: citizenQueryStatus('status').notNull().default('new'),
  assignedTo: uuid('assigned_to').references(() => profiles.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  ipInet: inet('ip_inet'),
  userAgent: text('user_agent'),
  turnstileScore: numeric('turnstile_score', { precision: 3, scale: 2 }),
  retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }).notNull(),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  deletionConfirmedAt: timestamp('deletion_confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CitizenQuery = typeof citizenQueries.$inferSelect;
export type NewCitizenQuery = typeof citizenQueries.$inferInsert;
```

**Indexes**: `(tenant_id, ref)` (unique), `(tenant_id, status, submitted_at desc)`, `(assigned_to, status)`, `(tenant_id, year, sequence_number)` (unique), `(retention_expires_at)` (for the retention sweeper).

### 5.13 Citizen query reply

```typescript
export const citizenQueryReplies = pgTable('citizen_query_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  queryId: uuid('query_id')
    .notNull()
    .references(() => citizenQueries.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => profiles.id),
  bodyMd: text('body_md').notNull(),
  sentToEmail: text('sent_to_email').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  resendMessageId: text('resend_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CitizenQueryReply = typeof citizenQueryReplies.$inferSelect;
export type NewCitizenQueryReply = typeof citizenQueryReplies.$inferInsert;
```

**Indexes**: `(query_id, sent_at desc)`.

### 5.14 Audit log entry

Append-only. Every admin state transition writes one row. Database-level enforcement (no UPDATE, no DELETE policies — see § 11).

```typescript
export const auditLogEntries = pgTable('audit_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').references(() => profiles.id), // null for system events
  actorRoleSnapshot: userRole('actor_role_snapshot'),
  action: text('action').notNull(), // e.g. 'resolution.published', 'citizen_query.replied'
  targetType: text('target_type').notNull(), // 'resolution' | 'citizen_query' | 'meeting' | ...
  targetId: text('target_id').notNull(),
  ipInet: inet('ip_inet'),
  sessionId: text('session_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLogEntries.$inferSelect;
export type NewAuditLogEntry = typeof auditLogEntries.$inferInsert;
```

**Indexes**: `(tenant_id, created_at desc)`, `(tenant_id, target_type, target_id)`, `(actor_id, created_at desc)`, `(action, created_at desc)`.

### 5.15 Translation

Per-record translation table (chosen over per-record locale columns — see § 14 for rationale). Source-of-truth for any user-facing string that must appear in `en` / `tl` / `hil`.

```typescript
export const translatorKind = pgEnum('translator_kind', ['human', 'ai_draft', 'system']);

export const translations = pgTable('translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sourceTable: text('source_table').notNull(), // 'news_posts' | 'resolutions' | 'sb_members' | 'committees' | ...
  sourceId: uuid('source_id').notNull(),
  sourceField: text('source_field').notNull(), // 'title' | 'body_md' | 'bio_md' | ...
  locale: text('locale').notNull(), // 'en' | 'tl' | 'hil'
  value: text('value').notNull(),
  translatorKind: translatorKind('translator_kind').notNull(),
  translatedBy: uuid('translated_by').references(() => profiles.id),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;
```

**Indexes**: `(source_table, source_id, source_field, locale)` (unique), `(tenant_id, locale)`.

---

## 6. RBAC and permissions matrix

Default deny. Public surface is anonymous (`auth.uid() IS NULL`); admin surface requires authenticated `profiles.role`.

### Permissions matrix (admin actions)

Legend: **R** read, **C** create, **U** update, **D** delete (soft), **P** publish/approve, **—** no access.

| Entity                   | Secretary | Mayor | Vice Mayor           | SB Member                | Other LGU |
| ------------------------ | --------- | ----- | -------------------- | ------------------------ | --------- |
| `meetings`               | RCUDP     | R     | RCUP                 | RU (own presider)        | R         |
| `transcripts`            | RCUDP     | R     | RCUP                 | RU (own meetings)        | R         |
| `transcript_segments`    | RCU       | R     | RCU                  | RCU (own meetings)       | R         |
| `resolutions`            | RCUDP     | RP    | RCUP                 | RCU (own sponsorships)   | R         |
| `sb_members`             | RCUD      | R     | RU                   | RU (self)                | R         |
| `committees`             | RCUD      | R     | RU                   | R                        | R         |
| `membership_assignments` | RCUD      | R     | RCU                  | R                        | R         |
| `news_posts`             | RCUDP     | RP    | RCUP                 | RCU (own author)         | R         |
| `citizen_queries`        | RCUD      | R     | RU (assign, status)  | RU (assigned)            | —         |
| `citizen_query_replies`  | RC        | —     | RC                   | RC (assigned)            | —         |
| `audit_log_entries`      | R         | R     | R                    | R (own actor)            | —         |
| `profiles`               | RCUD      | R     | RU (non-secretaries) | RU (self)                | R (self)  |
| `translations`           | RCUD      | R     | RCU                  | RCU (own author content) | R         |

Public anonymous access (no auth): read-only on `news_posts WHERE status='published' AND visibility='public'`, `resolutions WHERE status='published'`, `sb_members WHERE active=true AND deleted_at IS NULL`, `committees`, `membership_assignments`, `meetings WHERE status IN ('minutes_published')`, plus their associated `translations`. `citizen_queries.insert` is permitted anonymously (rate-limited + Turnstile-gated, see § 17).

### RLS policy templates

Templates below are per-table. They enforce tenant isolation (every authenticated user belongs to one tenant via `profiles.tenant_id`) and role-keyed access. The service role bypasses all of these — see `CLAUDE.md` § Supabase Patterns.

```sql
-- helper: returns the tenant_id of the current authenticated user
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- helper: returns the role of the current authenticated user
create or replace function public.current_user_role()
returns user_role language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;
```

```sql
-- meetings
alter table public.meetings enable row level security;

create policy "meetings_select_tenant_or_public" on public.meetings
  for select using (
    (auth.uid() is not null and tenant_id = public.current_tenant_id())
    or (status = 'minutes_published')  -- public read of published minutes
  );

create policy "meetings_insert_admin" on public.meetings
  for insert with check (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','mayor','vice_mayor')
  );

create policy "meetings_update_admin" on public.meetings
  for update using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','mayor','vice_mayor')
  ) with check (tenant_id = public.current_tenant_id());

create policy "meetings_delete_secretary_only" on public.meetings
  for delete using (
    public.current_user_role() = 'secretary'
    and tenant_id = public.current_tenant_id()
  );
```

```sql
-- resolutions
alter table public.resolutions enable row level security;

create policy "resolutions_select" on public.resolutions
  for select using (
    (auth.uid() is not null and tenant_id = public.current_tenant_id())
    or (status = 'published')
  );

create policy "resolutions_insert" on public.resolutions
  for insert with check (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','vice_mayor','sb_member','mayor')
  );

create policy "resolutions_update" on public.resolutions
  for update using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','vice_mayor','mayor')
  );

create policy "resolutions_publish_gate" on public.resolutions
  for update using (
    public.current_user_role() in ('secretary','mayor')
  ) with check (
    -- only secretary or mayor can flip status to 'published'
    (status <> 'published') or public.current_user_role() in ('secretary','mayor')
  );

create policy "resolutions_delete_secretary_only" on public.resolutions
  for delete using (
    public.current_user_role() = 'secretary'
    and tenant_id = public.current_tenant_id()
  );
```

```sql
-- news_posts
alter table public.news_posts enable row level security;

create policy "news_posts_select" on public.news_posts
  for select using (
    (auth.uid() is not null and tenant_id = public.current_tenant_id())
    or (status = 'published' and visibility = 'public' and deleted_at is null)
  );

create policy "news_posts_insert" on public.news_posts
  for insert with check (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','vice_mayor','mayor','sb_member')
  );

create policy "news_posts_update" on public.news_posts
  for update using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary','vice_mayor','mayor')
      or (public.current_user_role() = 'sb_member' and author_id = auth.uid())
    )
  );

create policy "news_posts_publish_gate" on public.news_posts
  for update with check (
    (status <> 'published') or public.current_user_role() in ('secretary','vice_mayor','mayor')
  );
```

```sql
-- citizen_queries
alter table public.citizen_queries enable row level security;

-- anonymous insert is permitted (gated by Turnstile + rate limit at the action layer)
create policy "citizen_queries_anon_insert" on public.citizen_queries
  for insert to anon
  with check (true);  -- the server action enforces tenant_id and validates payload

-- authenticated select: secretary + vice mayor see all; sb_member sees only assigned
create policy "citizen_queries_select_admin" on public.citizen_queries
  for select using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary','vice_mayor','mayor')
      or assigned_to = auth.uid()
    )
  );

create policy "citizen_queries_update_admin" on public.citizen_queries
  for update using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','vice_mayor','mayor')
  );

-- no public select; no anon select; PII protected
```

```sql
-- audit_log_entries — APPEND-ONLY at database level
alter table public.audit_log_entries enable row level security;

create policy "audit_log_select_admin" on public.audit_log_entries
  for select using (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary','vice_mayor','mayor','sb_member')
  );

create policy "audit_log_insert_authenticated" on public.audit_log_entries
  for insert with check (
    auth.uid() is not null
    and tenant_id = public.current_tenant_id()
  );

-- intentionally no UPDATE policy — append-only
-- intentionally no DELETE policy — append-only
revoke update, delete on public.audit_log_entries from authenticated, anon;
```

---

## 7. Route map

App Router tree, route groups, auth requirements, and data deps. `[locale]` is the next-intl locale segment (`en` / `tl` / `hil`). All public-facing routes ship under `[locale]`.

```text
app/
├── [locale]/
│   ├── (marketing)/                                # public, anonymous
│   │   ├── layout.tsx                              # PublicTopNav + LanguageSwitcher + Footer
│   │   ├── page.tsx                                # P1 Landing (RSC; reads news_posts, sb_members, tenants)
│   │   ├── news/
│   │   │   ├── page.tsx                            # P2 News feed (RSC; reads news_posts)
│   │   │   ├── loading.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                        # P3 News post detail (RSC; reads news_posts + translations)
│   │   │       ├── loading.tsx
│   │   │       └── not-found.tsx
│   │   ├── members/
│   │   │   ├── page.tsx                            # P4 Members directory (RSC; reads sb_members + memberships)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                        # P5 Member detail (RSC; reads sb_members + activity)
│   │   │       └── not-found.tsx
│   │   ├── submit-query/
│   │   │   ├── page.tsx                            # P6 Submit query (Client form via shadcn Form)
│   │   │   └── confirmation/
│   │   │       └── page.tsx                        # P7 Confirmation (RSC; reads ref code from query)
│   │   ├── about/
│   │   │   └── page.tsx                            # P8 About (RSC; reads tenants + static content)
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   └── (auth)/                                     # public, anonymous, no app chrome
│       ├── layout.tsx                              # MinimalAuthLayout
│       ├── login/
│       │   └── page.tsx                            # A1 Login (Client form; Supabase signIn)
│       ├── reset-password/
│       │   └── page.tsx
│       └── invite/
│           └── [token]/
│               └── page.tsx                        # First-time password set after Secretary invite
├── (app)/                                          # admin, authenticated, locale-agnostic UI in en for v1
│   ├── layout.tsx                                  # SidebarNav + TopBar + role gate
│   ├── dashboard/
│   │   └── page.tsx                                # A2 Dashboard (RSC; reads meetings, queries, audit_log)
│   ├── meetings/
│   │   ├── page.tsx                                # A3 Meetings list (RSC; reads meetings)
│   │   ├── new/
│   │   │   └── page.tsx                            # New meeting form
│   │   └── [id]/
│   │       ├── page.tsx                            # A4 Meeting detail + Recorder (Client; MediaRecorder)
│   │       └── transcript/
│   │           └── page.tsx                        # A5 Transcript editor (two-pane; Client)
│   ├── resolutions/
│   │   ├── page.tsx                                # A6 Resolutions list
│   │   ├── new/
│   │   │   └── page.tsx                            # A8 Resolution upload + draft form
│   │   └── [id]/
│   │       └── page.tsx                            # A7 Resolution detail (PDF preview)
│   ├── members/
│   │   ├── page.tsx                                # A9 Members directory (admin)
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx                            # A10 Member editor
│   ├── news/
│   │   ├── page.tsx                                # A11 News list
│   │   ├── new/
│   │   │   └── page.tsx                            # A12 News composer (MDX editor)
│   │   └── [id]/
│   │       └── page.tsx
│   ├── queries/
│   │   ├── page.tsx                                # A13 Queries inbox
│   │   └── [id]/
│   │       └── page.tsx                            # A14 Query detail
│   ├── audit/
│   │   └── page.tsx                                # A15 Audit log
│   ├── users/
│   │   └── page.tsx                                # A16 User management (Secretary-only)
│   ├── settings/
│   │   └── page.tsx                                # A17 Settings
│   ├── error.tsx
│   ├── not-found.tsx
│   └── loading.tsx                                 # Skeleton consistent with A18 States
└── api/
    ├── og/
    │   └── route.ts                                # OG image generation via @vercel/og
    ├── inngest/
    │   └── route.ts                                # Inngest webhook receiver
    ├── citizen-queries/
    │   └── deletion-confirm/
    │       └── [token]/
    │           └── route.ts                        # RA 10173 deletion confirmation link
    ├── pdf/
    │   └── resolutions/
    │       └── [id]/
    │           └── route.ts                        # @react-pdf/renderer streamed response
    └── translate/
        └── route.ts                                # AI streaming for translation drafts (admin only)
```

Top-level files:

```text
app/
├── sitemap.ts                                       # public surface URLs by locale
├── robots.ts
├── layout.tsx                                       # root: <html lang> set per locale; providers
├── globals.css                                      # Tailwind v4 @theme tokens (see § 13)
└── og/
    └── route.tsx                                   # alternative OG endpoint pinned to /og
```

Middleware: `middleware.ts` at repo root chains `next-intl` middleware (locale detection, `[locale]` prefix) and the Supabase session-refresh middleware from `lib/supabase/middleware.ts`. Order: locale first, then auth.

---

## 8. Screen inventory

Every wireframe screen ID maps to a route, components, and data deps.

| ID  | Title                            | Route                                          | File                                                          | shadcn primitives                                 | Custom components                                                                  | Data (entities · actions)                                    | Accessibility notes                                                                         |
| --- | -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| A1  | Login                            | `/(auth)/login`                                | `app/(app)/(auth)/login/page.tsx`                             | `Form`, `Input`, `Button`, `Label`                | —                                                                                  | `signIn` action                                              | `aria-live="polite"` on auth errors; password field announces caps-lock                     |
| A2  | Dashboard                        | `/(app)/dashboard`                             | `app/(app)/dashboard/page.tsx`                                | `Card`, `Badge`, `Skeleton`, `Button`             | `HeroCard`, `ActivityFeed`                                                         | meetings · queries · audit_log                               | hero cards keyboard-reorderable; skip link to "primary action"                              |
| A3  | Meetings list                    | `/(app)/meetings`                              | `app/(app)/meetings/page.tsx`                                 | `Table`, `Badge`, `DropdownMenu`, `Button`        | `MeetingRow`                                                                       | meetings                                                     | sortable column headers announce sort state                                                 |
| A4  | Meeting detail / Recorder        | `/(app)/meetings/[id]`                         | `app/(app)/meetings/[id]/page.tsx`                            | `Tabs`, `Badge`, `Button`, `Dialog`               | `AudioRecorder`, `MeetingAgendaEditor`, `LanguagePicker`                           | meetings, audio_chunks · recordMeeting                       | Recorder controls have visible labels; pulsing REC has `aria-label="Recording in progress"` |
| A5  | Transcript editor (two-pane)     | `/(app)/meetings/[id]/transcript`              | `app/(app)/meetings/[id]/transcript/page.tsx`                 | `Button`, `Badge`, `Tooltip`, `Sheet`             | `TranscriptEditorTwoPane`, `AudioScrubber`, `SpeakerTagger`, `AutoScrollPause`     | transcripts, transcript_segments · approveTranscript         | active segment has `aria-current="true"`; auto-scroll pauses on manual scroll for 4s        |
| A6  | Resolutions list                 | `/(app)/resolutions`                           | `app/(app)/resolutions/page.tsx`                              | `Table`, `Badge`, `Input`, `DropdownMenu`         | `ResolutionRow`, `StatusFilter`                                                    | resolutions · publishResolution                              | status badge has both icon + text                                                           |
| A7  | Resolution detail (PDF preview)  | `/(app)/resolutions/[id]`                      | `app/(app)/resolutions/[id]/page.tsx`                         | `Tabs`, `Card`, `Button`, `Dialog`                | `ResolutionPdfPreview`, `SponsorPicker`, `CommitteePicker`                         | resolutions · publishResolution, withdrawResolution          | PDF preview falls back to download link for screen-reader users                             |
| A8  | Resolution upload                | `/(app)/resolutions/new`                       | `app/(app)/resolutions/new/page.tsx`                          | `Form`, `Input`, `Textarea`, `Button`             | `MdxEditor`, `PdfUploader`, `MultilingualField`                                    | resolutions · uploadResolutionPdf, createResolution          | upload progress announced; drag-drop has keyboard equivalent                                |
| A9  | Members directory (admin)        | `/(app)/members`                               | `app/(app)/members/page.tsx`                                  | `Card`, `Avatar`, `Badge`, `Button`               | `MemberCard` (admin variant)                                                       | sb_members, membership_assignments                           | grid keyboard-navigable left/right/up/down                                                  |
| A10 | Member editor                    | `/(app)/members/[id]`                          | `app/(app)/members/[id]/page.tsx`                             | `Form`, `Input`, `Textarea`, `Avatar`, `Combobox` | `PhotoUploader`, `CommitteeAssignmentEditor`, `MultilingualField`                  | sb_members, memberships, translations · updateMemberProfile  | photo crop has alt-text editor                                                              |
| A11 | News list                        | `/(app)/news`                                  | `app/(app)/news/page.tsx`                                     | `Table`, `Badge`, `Button`, `DropdownMenu`        | `NewsRow`, `VisibilityBadge`                                                       | news_posts                                                   | filter chips are toggle buttons with `aria-pressed`                                         |
| A12 | News composer                    | `/(app)/news/new`                              | `app/(app)/news/new/page.tsx`                                 | `Form`, `Input`, `Button`, `Toggle`               | `NewsComposerWithMdx`, `CoverImageUploader`, `CategoryPicker`, `MultilingualField` | news_posts · createNewsPost, publishNewsPost                 | MDX editor announces formatting changes                                                     |
| A13 | Queries inbox                    | `/(app)/queries`                               | `app/(app)/queries/page.tsx`                                  | `Input`, `Badge`, `Button`, `DropdownMenu`        | `CitizenQueryRow`, `StatusFilterBar`, `AssigneePicker`                             | citizen_queries · assignCitizenQuery                         | new-item indicator has `aria-label="Unread query"`                                          |
| A14 | Query detail                     | `/(app)/queries/[id]`                          | `app/(app)/queries/[id]/page.tsx`                             | `Card`, `Form`, `Textarea`, `Button`, `Badge`     | `QueryThread`, `ReplyComposer`                                                     | citizen_queries, citizen_query_replies · replyToCitizenQuery | reply form's character count uses `aria-live="polite"`                                      |
| A15 | Audit log                        | `/(app)/audit`                                 | `app/(app)/audit/page.tsx`                                    | `Table`, `Input`, `Badge`                         | `AuditLogRow`, `AuditFilterBar`                                                    | audit_log_entries                                            | actor + action + target read together by screen reader                                      |
| A16 | User management                  | `/(app)/users`                                 | `app/(app)/users/page.tsx`                                    | `Table`, `Form`, `Input`, `Button`, `Badge`       | `UserRow`, `RoleChip`, `InviteUserDialog`                                          | profiles · inviteUser, deactivateUser                        | role-change confirm dialog announces the change                                             |
| A17 | Settings                         | `/(app)/settings`                              | `app/(app)/settings/page.tsx`                                 | `Tabs`, `Form`, `Input`, `Switch`, `Button`       | `TenantSettingsForm`, `LocaleSettings`, `RetentionSettings`                        | tenants · updateTenantSettings                               | tab keyboard navigation with `roving tabindex`                                              |
| A18 | States (empty / loading / error) | reused under each route                        | `app/(app)/loading.tsx` + `error.tsx` + `components/states/*` | `Skeleton`, `Alert`, `Button`                     | `EmptyState`, `ErrorState`, `LoadingState`                                         | —                                                            | error state has `role="alert"`; retry button is the next focusable element                  |
| P1  | Landing (civic / formal)         | `/[locale]`                                    | `app/[locale]/(marketing)/page.tsx`                           | `Card`, `Button`, `Badge`                         | `HeroSeal`, `MissionPullQuote`, `NewsTeaserGrid`, `MembersCarousel`, `CTABand`     | news_posts, sb_members, tenants                              | seal has `<img alt="Official seal of Lambunao Municipality">`; skip link first focusable    |
| P2  | News feed                        | `/[locale]/news`                               | `app/[locale]/(marketing)/news/page.tsx`                      | `Card`, `Input`, `Badge`, `Button`                | `NewsCard`, `CategoryChips`, `InfiniteScrollSentinel`                              | news_posts                                                   | category chips have `aria-pressed`; "Loading more" announced                                |
| P3  | News post detail                 | `/[locale]/news/[slug]`                        | `app/[locale]/(marketing)/news/[slug]/page.tsx`               | `Button`                                          | `NewsArticleBody`, `LocaleSwitcher`, `ShareMenu`                                   | news_posts, translations                                     | article uses `<article>`; locale-switch announces target language                           |
| P4  | Members directory                | `/[locale]/members`                            | `app/[locale]/(marketing)/members/page.tsx`                   | `Card`, `Avatar`, `Badge`, `Button`               | `MemberCard` (public variant), `TermBadge`                                         | sb_members, memberships                                      | grid is `<ul>` of member items; portraits have alt text                                     |
| P5  | Member detail                    | `/[locale]/members/[id]`                       | `app/[locale]/(marketing)/members/[id]/page.tsx`              | `Card`, `Avatar`, `Badge`, `Button`               | `MemberPortrait`, `MemberActivityFeed`, `OfficeContactCard`                        | sb_members, resolutions (sponsored), translations            | activity feed uses `<ol>`; "Contact" goes to `submit-query?to=member-id`                    |
| P6  | Submit query                     | `/[locale]/submit-query`                       | `app/[locale]/(marketing)/submit-query/page.tsx`              | `Form`, `Input`, `Textarea`, `Button`             | `TurnstileWidget`, `HoneypotField`, `ConsentNotice`, `CharacterCount`              | citizen_queries · createCitizenQuery                         | submit failure focuses the offending field; consent has `aria-required`                     |
| P7  | Confirmation                     | `/[locale]/submit-query/confirmation`          | `app/[locale]/(marketing)/submit-query/confirmation/page.tsx` | `Card`, `Button`                                  | `ReferenceNumberDisplay`                                                           | —                                                            | reference number large + monospaced; `role="status"` on success                             |
| P8  | About                            | `/[locale]/about`                              | `app/[locale]/(marketing)/about/page.tsx`                     | `Card`, `Button`                                  | `OfficeContactCard`, `OfficeMapEmbed`, `DataPrivacyNotice`                         | tenants                                                      | map has `<noscript>` text-only fallback                                                     |
| A1m | Login (mobile)                   | `/(auth)/login` (≤768px)                       | shared with A1                                                | shared                                            | shared                                                                             | shared                                                       | larger touch targets; password-show toggle larger                                           |
| A2m | Dashboard (mobile)               | `/(app)/dashboard` (≤768px)                    | shared with A2                                                | adds `Sheet` (drawer nav)                         | `BottomTabBar` (mobile-only)                                                       | shared                                                       | bottom tab bar respects `safe-area-inset-bottom`; tabs ≥ 44×44                              |
| A4m | Recorder (mobile)                | `/(app)/meetings/[id]` (≤768px)                | shared with A4                                                | adds `Sheet`                                      | `MobileRecorderControls` (large stop button)                                       | shared                                                       | recorder buttons ≥ 64×64; haptic feedback on stop (where supported)                         |
| P1m | Landing (mobile)                 | `/[locale]` (≤768px)                           | shared with P1                                                | shared                                            | `MobileSealHero`, `MobilePrimaryCTA`                                               | shared                                                       | seal scales down; nav collapses to hamburger                                                |
| P3m | News post (mobile)               | `/[locale]/news/[slug]` (≤768px)               | shared with P3                                                | shared                                            | shared                                                                             | shared                                                       | font-size scales up to 18px body min                                                        |
| P4m | Members (mobile)                 | `/[locale]/members` (≤768px)                   | shared with P4                                                | shared                                            | adapts `MemberCard` to 2-col                                                       | shared                                                       | grid keyboard nav still works on mobile                                                     |
| P6m | Submit query (mobile)            | `/[locale]/submit-query` (≤768px)              | shared with P6                                                | shared                                            | shared                                                                             | shared                                                       | input fields stack; Turnstile remains usable                                                |
| P7m | Confirmation (mobile)            | `/[locale]/submit-query/confirmation` (≤768px) | shared with P7                                                | shared                                            | shared                                                                             | shared                                                       | reference number copyable; large success icon                                               |

---

## 9. Component breakdown

### 9.1 Custom components (build from scratch)

| Component                              | Purpose                                                                                                                                                                                                | Notes                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `AudioRecorder`                        | Browser-side audio capture using MediaRecorder API. Streams 30-second `audio/webm;codecs=opus` chunks to Supabase Storage via signed URLs with 256KB resumable upload. Exposes pause/resume/stop.      | Lives in `components/recorder/`. Persists chunks to IndexedDB for offline survival.            |
| `TranscriptEditorTwoPane`              | Two-pane editor: audio scrubber on the left, speaker turns on the right. Auto-scrolls active segment into view; pauses for 4s on manual scroll then shows "Resume follow" pill.                        | Debounced auto-save via TanStack Query mutation; optimistic edits; per-segment locale tagging. |
| `AudioScrubber`                        | Vertical or horizontal audio waveform with current-time playhead, click-to-seek, keyboard shortcuts (Space play/pause, J/L back/forward 5s, K play/pause, comma/period frame-step).                    | Renders waveform from server-extracted peaks JSON, not raw audio (perf).                       |
| `SpeakerTagger`                        | Per-segment dropdown to tag a speaker (linked to `sb_members` or free-form).                                                                                                                           | Combobox over council roster + free-form fallback.                                             |
| `MinutesAutoExtractor`                 | Server action wrapper: reads approved transcript, calls AI SDK + Anthropic with a structured-extraction prompt, persists draft minutes to a draft `news_post` for review.                              | Lives in `lib/services/minutes/`.                                                              |
| `ResolutionPdfPreview`                 | Inline preview of generated PDF using `@react-pdf/renderer` PDFViewer. Falls back to download link if `<canvas>` fails.                                                                                | Server-renders the PDF to a stream when a download URL is requested.                           |
| `MemberCard` (public + admin variants) | Renders an SB Member with photo, position, term, and committees. Public variant links to `/[locale]/members/[id]`; admin variant exposes inline edit.                                                  | Photo uses `next/image` with explicit width/height.                                            |
| `CitizenQueryRow`                      | Inbox row for `A13`: unread dot, citizen name + email, subject (truncated), category badge, age. Supports keyboard activation.                                                                         | Optimistic update for assign/mark-answered.                                                    |
| `AuditLogRow`                          | Renders one `audit_log_entries` row with actor, action, target (clickable to `/(app)/<resource>/<id>`), IP, session, timestamp. Color-coded left border per `action` family but never color-only.      | Read-only; cannot be edited (DB enforces).                                                     |
| `NewsComposerWithMdx`                  | MDX editor (custom toolbar over `react-markdown` preview) with cover image upload, category picker, visibility toggle, and per-locale tabs.                                                            | Saves to `news_posts.body_mdx`; never to a CMS-held copy.                                      |
| `FlagPicker`                           | Locale switcher: globe icon + EN / TL / HIL options. Used in admin and public layouts.                                                                                                                 | On admin, swaps the UI strings; on public, swaps the URL prefix.                               |
| `MultilingualField`                    | Form input that writes the same field across `en`, `tl`, `hil` via tabbed sub-inputs. Persists to `translations` table.                                                                                | Marks `[TL]` / `[HIL]` placeholders when only `en` is filled.                                  |
| `HoneypotField`                        | Hidden `<input name="website">` with `display:none`, `aria-hidden`, `tabindex={-1}`. Server action rejects submissions where this field is non-empty (silent reject, return success to confound bots). | Lives in `components/forms/`.                                                                  |
| `TurnstileWidget`                      | Wraps `@marsidev/react-turnstile` with the project sitekey from env, surfaces token to the form, exposes `reset()` for re-verification.                                                                | Server action verifies via Cloudflare's `siteverify` endpoint.                                 |
| `ConsentNotice`                        | Reusable RA 10173 consent block (text in § 17). Required-checkbox variant for `submit-query`; informational variant for footer.                                                                        | —                                                                                              |
| `BottomTabBar` (mobile)                | Five-tab bottom nav for admin mobile: Home / Meetings / Resolutions / Queries / Settings. Respects `safe-area-inset-bottom`.                                                                           | Only mounted under ≤768px.                                                                     |
| `LanguageSwitcher`                     | Dropdown that swaps the `[locale]` segment of the current URL while preserving query params.                                                                                                           | Uses `useRouter` + `usePathname` from `next-intl`.                                             |

### 9.2 shadcn primitive map

| Design component (wireframe)                         | shadcn primitive                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Btn (primary / secondary / ghost / destructive / sm) | `Button` (variants `default`, `secondary`, `ghost`, `destructive` + `sm` size) |
| Input + label-float                                  | `Input` + `Label` (with custom floating-label CSS)                             |
| Textarea                                             | `Textarea`                                                                     |
| Select / Combobox                                    | `Select` + `Command` (for the combobox autocomplete)                           |
| Badge / status / role chip                           | `Badge` (variants `default`, `secondary`, `destructive`, `outline`)            |
| Card                                                 | `Card`, `CardHeader`, `CardContent`, `CardFooter`                              |
| Tabs                                                 | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                               |
| Modal                                                | `Dialog`, `Sheet` (for side-drawer modals on mobile)                           |
| Toast                                                | `Sonner`                                                                       |
| Tooltip / popover                                    | `Tooltip`, `Popover`                                                           |
| DataTable                                            | `Table` + `@tanstack/react-table` (per BASEPLATE)                              |
| DatePicker                                           | `Calendar` + `Popover`                                                         |
| Combobox / file uploader / quick markers             | `Command` + custom drop zone                                                   |
| Sidebar (admin)                                      | `Sidebar` (shadcn)                                                             |
| Dropdown menu                                        | `DropdownMenu`                                                                 |
| Skeleton                                             | `Skeleton`                                                                     |
| Avatar                                               | `Avatar`, `AvatarImage`, `AvatarFallback`                                      |
| Switch / toggle (visibility, public/admin)           | `Switch`, `Toggle`                                                             |
| Breadcrumb                                           | `Breadcrumb`                                                                   |
| Pagination                                           | `Pagination`                                                                   |
| Progress (upload)                                    | `Progress`                                                                     |
| Alert                                                | `Alert` (used in `error.tsx` and inline form alerts)                           |

---

## 10. Server action and route handler surface

### 10.1 Server actions (by entity)

All actions live in `app/_actions/` or colocated `_actions.ts` per `CLAUDE.md` § Code conventions. Every action: (1) `'use server'`, (2) `import 'server-only'`, (3) Zod `safeParse` of `unknown` input, (4) `Result<T>` return, (5) appends an `audit_log_entries` row on every state transition, (6) wraps in `try` and converts thrown errors to `Result.err`.

```typescript
// app/_actions/citizen-queries.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

const CreateCitizenQueryInput = z.object({
  tenantSlug: z.string().min(1),
  submitterName: z.string().min(2).max(120),
  submitterEmail: z.string().email().max(240),
  subject: z.string().min(3).max(180),
  message: z.string().min(20).max(4000),
  category: z
    .enum([
      'general',
      'permits',
      'health',
      'roads_infrastructure',
      'public_safety',
      'environment',
      'social_services',
      'feedback_on_resolution',
      'other',
    ])
    .default('general'),
  consentAccepted: z.literal(true),
  honeypotWebsite: z.string().max(0).optional(), // bots fill this; humans do not
  turnstileToken: z.string().min(1),
  clientSubmissionId: z.string().uuid(), // idempotency
});

export async function createCitizenQuery(raw: unknown): Promise<Result<{ ref: string }>> {
  const parsed = CreateCitizenQueryInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message, code: 'INVALID_INPUT' };

  // Honeypot trap: silent success for bots
  if (parsed.data.honeypotWebsite && parsed.data.honeypotWebsite.length > 0) {
    return { ok: true, data: { ref: 'Q-0000-0000' } };
  }

  // Turnstile verify, rate limit, generate ref, insert row, send confirmation email,
  // append audit_log_entries row. Implementation in lib/services/citizen-queries/.
  // ...
  return { ok: true, data: { ref: 'Q-2026-0142' } };
}

const ReplyToCitizenQueryInput = z.object({
  queryId: z.string().uuid(),
  bodyMd: z.string().min(10).max(8000),
});

export async function replyToCitizenQuery(raw: unknown): Promise<Result<{ replyId: string }>> {
  // ...
  return { ok: true, data: { replyId: '...' } };
}

const AssignCitizenQueryInput = z.object({
  queryId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
});

export async function assignCitizenQuery(raw: unknown): Promise<Result<void>> {
  // ...
  return { ok: true, data: undefined };
}
```

```typescript
// app/_actions/resolutions.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

const CreateResolutionInput = z.object({
  title: z.string().min(5).max(280),
  bodyMd: z.string().min(40),
  primarySponsorId: z.string().uuid(),
  coSponsorIds: z.array(z.string().uuid()).max(20).default([]),
  meetingId: z.string().uuid().optional(),
  committeeId: z.string().uuid().optional(),
  year: z.number().int().min(2024).max(2100),
});

export async function createResolution(
  raw: unknown,
): Promise<Result<{ id: string; number: string }>> {
  /* ... */ return { ok: true, data: { id: '', number: '' } };
}

const UploadResolutionPdfInput = z.object({
  resolutionId: z.string().uuid(),
  storagePath: z.string().min(1), // already-uploaded path in Supabase Storage
});

export async function uploadResolutionPdf(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}

const PublishResolutionInput = z.object({ resolutionId: z.string().uuid() });
export async function publishResolution(raw: unknown): Promise<Result<{ publishedAt: string }>> {
  /* ... */ return { ok: true, data: { publishedAt: '' } };
}
```

```typescript
// app/_actions/news.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

const CreateNewsPostInput = z.object({
  title: z.string().min(5).max(280),
  excerpt: z.string().max(280).optional(),
  bodyMdx: z.string().min(20),
  category: z.enum(['health', 'notice', 'hearing', 'event', 'announcement', 'press_release']),
  visibility: z.enum(['public', 'admin_only']).default('public'),
  coverStoragePath: z.string().optional(),
  translations: z
    .array(
      z.object({
        locale: z.enum(['en', 'tl', 'hil']),
        title: z.string().min(5).max(280),
        bodyMdx: z.string().min(20),
        translatorKind: z.enum(['human', 'ai_draft', 'system']),
      }),
    )
    .default([]),
});

export async function createNewsPost(raw: unknown): Promise<Result<{ id: string; slug: string }>> {
  /* ... */ return { ok: true, data: { id: '', slug: '' } };
}
export async function publishNewsPost(raw: unknown): Promise<Result<{ publishedAt: string }>> {
  /* ... */ return { ok: true, data: { publishedAt: '' } };
}
```

```typescript
// app/_actions/members.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

const UpdateMemberProfileInput = z.object({
  memberId: z.string().uuid(),
  fullName: z.string().min(2).max(180),
  honorific: z.string().min(1).max(20),
  position: z.enum([
    'mayor',
    'vice_mayor',
    'sb_member',
    'sk_chairperson',
    'liga_president',
    'ipmr',
  ]),
  termStartYear: z.number().int().min(2000).max(2100),
  termEndYear: z.number().int().min(2000).max(2100),
  contactEmail: z.string().email().optional(),
  bioMd: z.string().max(8000).optional(),
  photoStoragePath: z.string().optional(),
  committeeAssignments: z.array(
    z.object({
      committeeId: z.string().uuid(),
      role: z.enum(['chair', 'vice_chair', 'member']),
    }),
  ),
  translations: z
    .array(
      z.object({
        locale: z.enum(['en', 'tl', 'hil']),
        bioMd: z.string().max(8000),
      }),
    )
    .default([]),
});

export async function updateMemberProfile(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}
```

```typescript
// app/_actions/users.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

const InviteUserInput = z.object({
  email: z.string().email(),
  role: z.enum(['secretary', 'mayor', 'vice_mayor', 'sb_member', 'other_lgu']),
  fullName: z.string().min(2).max(180),
  memberId: z.string().uuid().optional(), // link to sb_members if applicable
});

export async function inviteUser(raw: unknown): Promise<Result<{ userId: string }>> {
  // calls supabase.auth.admin.inviteUserByEmail; creates profiles row; appends audit log.
  return { ok: true, data: { userId: '' } };
}
```

```typescript
// app/_actions/transcripts.ts (excerpt)
'use server';
import 'server-only';
import { z } from 'zod';

const ApproveTranscriptInput = z.object({ transcriptId: z.string().uuid() });
export async function approveTranscript(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}

const PublishMinutesInput = z.object({
  meetingId: z.string().uuid(),
  minutesNewsPostId: z.string().uuid(),
});
export async function publishMinutes(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}

const StartMeetingInput = z.object({
  meetingId: z.string().uuid(),
  primaryLocale: z.enum(['en', 'tl', 'hil']),
});
const StopMeetingInput = z.object({ meetingId: z.string().uuid() });
const PauseMeetingInput = z.object({ meetingId: z.string().uuid() });

export async function startMeeting(raw: unknown): Promise<Result<{ uploadUrlPrefix: string }>> {
  /* ... */ return { ok: true, data: { uploadUrlPrefix: '' } };
}
export async function stopMeeting(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}
export async function pauseMeeting(raw: unknown): Promise<Result<void>> {
  /* ... */ return { ok: true, data: undefined };
}
```

### 10.2 Route handlers

| Handler                                                     | Purpose                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/inngest/route.ts`                                  | Inngest webhook receiver. Registers all functions listed in § 16. Uses `inngest.serve(...)` per Inngest's Next.js adapter.                                                            |
| `app/api/og/route.tsx`                                      | Dynamic OG image generation via `@vercel/og`. Per-route `og.tsx` files preferred; this catch-all handles legacy social cards.                                                         |
| `app/api/citizen-queries/deletion-confirm/[token]/route.ts` | Citizen clicks the deletion-confirmation link emailed by Resend; this handler verifies the signed token, soft-deletes the query, writes an audit-log row, sends a confirmation email. |
| `app/api/pdf/resolutions/[id]/route.ts`                     | Streams a `@react-pdf/renderer` document for a published resolution. RLS-checked via authenticated client where applicable; signed URL preferred for public downloads.                |
| `app/api/translate/route.ts`                                | AI streaming translation drafts. Authenticated admin only. Validates payload with Zod (target locale, source field, source text); rate-limited per user via Upstash.                  |
| `app/sitemap.ts`                                            | Public surface URLs by locale, refreshed on revalidate.                                                                                                                               |
| `app/robots.ts`                                             | Standard robots.txt; allows public surface, disallows `(app)` and `api`.                                                                                                              |

**No webhook receivers in v1.** No Stripe, no Resend inbound, no GitHub. Note this in the handler folder README so engineers do not add insecure handlers by reflex.

**OAuth callbacks are not custom**: Supabase handles its own auth callback at `/auth/callback`; no custom OAuth handler needed.

**`next-intl` middleware** is invoked from the root `middleware.ts`, not from a route handler. See § 14.

---

## 11. Auth and RLS patterns

Cross-reference: `CLAUDE.md` § Supabase Patterns (three-client split, `getUser()` over `getSession()`, service-role isolation). All patterns there apply here without modification.

SB-Lambunao-specific elements:

### 11.1 Invite-only registration

There is no public sign-up. The Secretary invites users via `inviteUser` server action, which calls `supabase.auth.admin.inviteUserByEmail()` (service-role, server-only). The invited user receives an email with a one-time link to set their initial password (`/(auth)/invite/[token]/page.tsx`). On password set, the corresponding `profiles` row is created/activated and an audit-log entry is written (`action='user.invite_accepted'`).

### 11.2 Role on `profiles.role`

The role is stored on `profiles.role` (enum). Every RLS policy reads `public.current_user_role()` via the helper function in § 6. Role changes write an audit-log row with the previous and new role in `metadata`.

### 11.3 RLS for the four most security-critical tables

1. **`citizen_queries`** — anonymous insert allowed (gated by Turnstile + rate limit at the action layer). Authenticated select restricted to admin roles, with `sb_member` limited to assigned queries only. **No anonymous select** under any condition. PII (name + email) is therefore protected at the row level.

2. **`audit_log_entries`** — append-only at the database level. The `revoke update, delete on public.audit_log_entries from authenticated, anon` line in § 6 enforces this even if a future RLS policy were to relax constraints. The service role retains full access for the retention sweeper to soft-purge after 7 years.

3. **`resolutions`** — the `resolutions_publish_gate` policy ensures only Secretary or Mayor can flip `status` to `published`. SB Members can author drafts; Vice Mayor can update; only Secretary can soft-delete.

4. **`news_posts`** — visibility toggle (`public` vs `admin_only`) is a separate column from `status`; the `news_posts_select` policy combines them to ensure admin-only posts never leak to the public surface.

### 11.4 Service-role usage

Confined to:

- `lib/db/admin-client.ts` (server-only): used by Inngest functions, the retention sweeper, the auth invite flow.
- `lib/services/auth/admin-invite.ts`: wraps `supabase.auth.admin.inviteUserByEmail`.
- `lib/services/audit/sweeper.ts`: nightly Inngest job that soft-purges expired `citizen_queries`.

All service-role modules begin with `import 'server-only'`. No service-role import is reachable from any Client Component import graph.

---

## 12. File structure for this project

Builds on `BASEPLATE.md` § 5. Specializations are in **bold**.

```text
.
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/
│   │   ├── (auth)/
│   │   └── layout.tsx
│   ├── (app)/
│   ├── api/
│   ├── sitemap.ts
│   ├── robots.ts
│   └── globals.css
├── components/
│   ├── ui/                                # shadcn primitives, owned source
│   ├── forms/                             # react-hook-form + Zod resolved forms
│   │   ├── HoneypotField.tsx              # see § 9
│   │   └── TurnstileWidget.tsx
│   ├── marketing/                         # public-only components
│   │   ├── HeroSeal.tsx
│   │   ├── MissionPullQuote.tsx
│   │   ├── NewsCard.tsx
│   │   └── MemberCard.public.tsx
│   ├── app/                               # admin-only components
│   │   ├── HeroCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── CitizenQueryRow.tsx
│   │   ├── AuditLogRow.tsx
│   │   └── BottomTabBar.tsx
│   ├── recorder/                          # **A4 — MediaRecorder + chunked upload**
│   │   ├── AudioRecorder.tsx
│   │   ├── ChunkUploader.ts
│   │   └── IndexedDbBuffer.ts
│   ├── transcript/                        # **A5 — two-pane editor**
│   │   ├── TranscriptEditorTwoPane.tsx
│   │   ├── AudioScrubber.tsx
│   │   ├── SpeakerTagger.tsx
│   │   └── AutoScrollPause.tsx
│   ├── pdf/                               # **@react-pdf/renderer document trees**
│   │   ├── ResolutionDocument.tsx
│   │   └── MinutesDocument.tsx
│   ├── states/                            # **A18 — empty/loading/error reusables**
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── LoadingState.tsx
│   └── i18n/                              # **language switcher + multilingual field**
│       ├── LanguageSwitcher.tsx
│       └── MultilingualField.tsx
├── lib/
│   ├── db/                                # Drizzle schema + clients (per BASEPLATE)
│   │   ├── schema.ts                      # all entities from § 5
│   │   ├── client.ts                      # auth-role connection
│   │   ├── admin-client.ts                # service-role connection (server-only)
│   │   └── migrations/
│   ├── supabase/                          # SSR clients (per CLAUDE.md)
│   ├── services/
│   │   ├── citizen-queries/
│   │   │   ├── create.ts
│   │   │   ├── reply.ts
│   │   │   ├── retention-sweeper.ts
│   │   │   └── ref-generator.ts
│   │   ├── audit/
│   │   │   └── append.ts
│   │   ├── auth/
│   │   │   └── admin-invite.ts
│   │   ├── pdf/                           # **@react-pdf/renderer wrappers**
│   │   │   ├── render-resolution.ts
│   │   │   └── render-minutes.ts
│   │   ├── asr/                           # **STUBBED until provider chosen — § 22**
│   │   │   └── stub.ts
│   │   ├── translation/                   # **STUBBED until strategy chosen — § 22**
│   │   │   └── stub.ts
│   │   ├── ratelimit/                     # Upstash wrapper
│   │   │   └── client.ts
│   │   └── email/                         # Resend + react-email
│   │       └── send-query-confirmation.ts
│   ├── validators/                        # shared Zod schemas
│   │   ├── citizen-query.ts
│   │   ├── resolution.ts
│   │   ├── news-post.ts
│   │   └── member.ts
│   ├── inngest/                           # **Inngest function definitions — § 16**
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── meeting-audio-transcribe.ts
│   │       ├── meeting-transcript-approved.ts
│   │       ├── meeting-minutes-publish.ts
│   │       ├── resolution-pdf-generate.ts
│   │       ├── citizen-query-notification.ts
│   │       └── audit-log-daily-rollup.ts
│   └── utils.ts                           # cn() and framework-agnostic helpers
├── messages/                              # **next-intl translation files**
│   ├── en.json
│   ├── tl.json
│   └── hil.json
├── content/                               # **MDX content (news drafts, static pages)**
│   ├── news/
│   └── pages/
├── public/
│   └── seal/                              # **Lambunao seal asset**
│       └── lambunao-seal.png
├── tests/
│   ├── unit/
│   └── e2e/
├── env.ts
├── middleware.ts                          # next-intl + Supabase chained
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── BASEPLATE.md
├── CLAUDE.md
├── PROJECT.md                             # this file
└── README.md
```

---

## 13. Design system — production tokens

All values are locked. No descriptive substitutes; engineers must use the exact hex codes, font names, and ms values below.

### 13.1 Colors

**Light mode**:

| Token                  | Hex       | Role                   |
| ---------------------- | --------- | ---------------------- |
| `--color-navy-primary` | `#0B2447` | brand · CTAs · headers |
| `--color-navy-700`     | `#19376D` | hover · pressed        |
| `--color-navy-200`     | `#cdd6e6` | focus ring · selected  |
| `--color-gold`         | `#B88A3E` | emphasis · highlights  |
| `--color-paper`        | `#FAF8F3` | background             |
| `--color-paper-2`      | `#F3EFE6` | surface · cards        |
| `--color-paper-3`      | `#EBE6DA` | input bg · subdued     |
| `--color-ink`          | `#1A1A1A` | body text              |
| `--color-ink-soft`     | `#3A3A3A` | secondary text         |
| `--color-ink-faint`    | `#6A6A6A` | muted (AA on paper)    |
| `--color-ink-ghost`    | `#B5B5B5` | dividers               |
| `--color-success`      | `#2D6A3A` | answered · published   |
| `--color-warn`         | `#C14A2A` | errors · destructive   |
| `--color-highlight`    | `#FFF3A8` | text highlight (mark)  |

**Dark mode**:

| Token              | Hex       |
| ------------------ | --------- |
| `--color-bg`       | `#0E1118` |
| `--color-surface`  | `#161922` |
| `--color-navy-inv` | `#7DA0DC` |

### 13.2 Typography

| Use                           | Family                                             | Weights            |
| ----------------------------- | -------------------------------------------------- | ------------------ |
| UI / body                     | Inter                                              | 400, 500, 600, 700 |
| Editorial / public headlines  | Source Serif Pro                                   | 400, 600, 700      |
| Mono (code, refs, timestamps) | Geist Mono (fallback JetBrains Mono, ui-monospace) | 400, 500           |

Scale (px / weight): Display 32 / 700 · Heading 24 / 600 · Subhead 18 / 600 · Body 16 / 400 · Caption 14 / 400 · Mono 12.
Line-height: 1.45 body, 1.15 display.
Min: 14px UI, 16px reading.
Wireframe-only fonts (Caveat, Kalam) are NOT used in production.

### 13.3 Spacing scale

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (px). Component padding 12/16/24. Section gutters 32/48. Touch target ≥ 44.

### 13.4 Radii

`0` sharp · `4` sm · `8` md · `12` lg · `24` pill · `999` full.

### 13.5 Shadows

| Token         | Value                              | Use     |
| ------------- | ---------------------------------- | ------- |
| `--shadow-e0` | `none`                             | flush   |
| `--shadow-e1` | `0 1px 2px rgba(0,0,0,.08)`        | surface |
| `--shadow-e2` | `0 4px 12px -2px rgba(0,0,0,.1)`   | card    |
| `--shadow-e3` | `0 12px 28px -6px rgba(0,0,0,.18)` | modal   |

### 13.6 Motion

| Token             | Value                          | Use                |
| ----------------- | ------------------------------ | ------------------ |
| `--duration-fast` | `120ms`                        | hover · focus      |
| `--duration-base` | `180ms`                        | toasts · dropdowns |
| `--duration-slow` | `260ms`                        | modal · sheet      |
| `--ease-out`      | `cubic-bezier(.2,.8,.2,1)`     | default easing     |
| `--ease-spring`   | `cubic-bezier(.34,1.56,.64,1)` | drawer · sheet     |

### 13.7 Iconography

`lucide-react`, 1.8 stroke-width, 24px viewbox. Imported named only (`import { Check } from 'lucide-react'`). Inline SVG so they scale.

### 13.8 Tailwind v4 token wiring

`app/globals.css` (Tailwind v4 CSS-first config):

```css
@import 'tailwindcss';

@theme {
  /* Colors — light */
  --color-navy-primary: #0b2447;
  --color-navy-700: #19376d;
  --color-navy-200: #cdd6e6;
  --color-gold: #b88a3e;
  --color-paper: #faf8f3;
  --color-paper-2: #f3efe6;
  --color-paper-3: #ebe6da;
  --color-ink: #1a1a1a;
  --color-ink-soft: #3a3a3a;
  --color-ink-faint: #6a6a6a;
  --color-ink-ghost: #b5b5b5;
  --color-success: #2d6a3a;
  --color-warn: #c14a2a;
  --color-highlight: #fff3a8;

  /* Type */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-serif: 'Source Serif Pro', Georgia, serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 24px;
  --radius-full: 999px;

  /* Shadows */
  --shadow-e1: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-e2: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
  --shadow-e3: 0 12px 28px -6px rgba(0, 0, 0, 0.18);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-slow: 260ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@layer base {
  :root {
    color-scheme: light;
    --background: var(--color-paper);
    --foreground: var(--color-ink);
  }
  .dark {
    color-scheme: dark;
    --background: #0e1118;
    --foreground: #ece9e0;
    --color-surface: #161922;
    --color-navy-primary: #7da0dc;
  }
  body {
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
  }
  *:focus-visible {
    outline: 3px solid var(--color-navy-200);
    outline-offset: 2px;
  }
}
```

Usage in TSX (Tailwind v4 picks tokens from `@theme` directly):

```tsx
// Example component using the design system tokens.
import { cn } from '@/lib/utils';

export function PrimaryCta({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2',
        'bg-navy-primary text-paper',
        'min-h-11 rounded-md px-4 py-2',
        'font-sans text-base font-medium',
        'duration-fast transition-transform ease-out',
        'hover:-translate-x-px hover:-translate-y-px',
        'shadow-e1 hover:shadow-e2',
        className,
      )}
    >
      {children}
    </button>
  );
}
```

---

## 14. i18n strategy

Library: `next-intl` (App Router-native). Locales: `en` (English), `tl` (Tagalog), `hil` (Hiligaynon). Fallback locale: `en`. Default URL prefix: `/en` (no implicit default; locale always in URL).

### 14.1 Middleware and `[locale]` segment

`middleware.ts` chains `next-intl` then Supabase:

```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';

const intl = createIntlMiddleware({
  locales: ['en', 'tl', 'hil'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  const intlResponse = intl(request);
  if (
    intlResponse instanceof NextResponse &&
    intlResponse.status >= 300 &&
    intlResponse.status < 400
  ) {
    return intlResponse; // redirect to localized URL
  }
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|seal|.*\\..*).*)'],
};
```

The `[locale]` route group lives at `app/[locale]/` and wraps the public + auth surfaces. The admin surface (`(app)`) is locale-agnostic for v1 — the UI strings are English; phase 3 adds full admin localization.

### 14.2 Message files

UI strings (button labels, form copy, error messages, etc.) live in `messages/en.json`, `messages/tl.json`, `messages/hil.json`. Structure mirrors route segments:

```text
messages/en.json
{
  "marketing": { "landing": { "heroEyebrow": "OFFICIAL · MUNICIPAL COUNCIL · ESTABLISHED 1948", ... } },
  "submitQuery": { "title": "Submit a query", ... },
  "common": { "submit": "Submit", "cancel": "Cancel", ... }
}
```

### 14.3 Content translations — translation table over per-record locale columns

Decision: use the `translations` table from § 5.15 instead of `title_en` / `title_tl` / `title_hil` columns on every entity.

Rationale:

- Adding a fourth locale (e.g., Karay-a) does not require a schema migration.
- A field that is intentionally untranslated (because the human translator hasn't gotten to it) is `null` instead of an empty column, so the UI can render `[TL]` / `[HIL]` placeholders deterministically.
- Translation provenance (`translator_kind`, `translated_by`, `reviewed_by`, `reviewed_at`) lives next to the value, not in a parallel sidecar table.
- Read path: a single `LEFT JOIN translations ON (source_table, source_id, source_field, locale)` fetches whatever locale is active and falls back to source on null.

Cost: queries do more joins. Acceptable at our scale (single tenant, ~1000 active records across all entities).

### 14.4 `[TL]` and `[HIL]` placeholder convention

Until human translators are onboarded, untranslated content renders as `[TL] <english-source-text>` or `[HIL] <english-source-text>`. The bracket prefix is rendered by the `MultilingualField` component when `translations.value IS NULL` for the active locale.

### 14.5 Language switcher placement

- Public layout: top-right of `PublicTopNav`, globe icon + current-locale code.
- Admin layout: per-user preference saved in `profiles.preferred_locale` (defaults `en`); does not change URLs (admin is locale-agnostic in v1).
- News post detail (P3): inline "Read this in [TL] / [HIL]" affordance below the article body.

---

## 15. Recorder and transcription pipeline architecture

The pipeline is split into **client (recorder + chunked upload)** and **server (ASR → diarization → editor → minutes)**. Steps:

1. **Browser MediaRecorder captures audio** (`audio/webm;codecs=opus`, mono, 48 kHz). Chunks are emitted every 30 seconds via `mediaRecorder.requestData()`.
2. **Each chunk is buffered to IndexedDB first**, then uploaded to a per-meeting prefix in Supabase Storage via a signed URL minted by `startMeeting`. Uploads are 256KB pieces with resume support; the client supplies a UUID `clientChunkId` for idempotency. The server records the chunk in `audio_chunks`.
3. **On `stopMeeting`**, the server emits an Inngest event `meeting.recording.completed` with the meeting ID. An Inngest function (`meeting.audio.transcribe`) fans out:
   - Concatenate chunks server-side (or at the ASR provider, depending on choice).
   - Call ASR provider (TBD — see § 22) with the audio + primary locale hint (`en`/`tl`/`hil`/`auto`).
   - Call speaker diarization (the same provider if it supports both, otherwise a follow-up step).
   - Persist `transcripts` row with `status='in_review'` and `transcript_segments` rows from the ASR output.
   - Emit `meeting.transcript.ready`.
4. **Editor UI loads** the transcript via RSC. Per-segment edits are mutations through TanStack Query with debounced `update` server actions; auto-save lands in 500–800ms after typing stops. Optimistic updates with rollback on failure.
5. **On approval**, an Inngest function (`meeting.transcript.approved` → `meeting.minutes.publish`) calls AI SDK + Anthropic with a structured-extraction prompt to draft minutes (key decisions, motions, votes, attendees). The draft becomes a `news_posts` row with `status='draft'` and `category='announcement'`. The Secretary reviews and publishes via the news composer (A12).
6. **Public surface** displays the published minutes under `/[locale]/news/[slug]` and as a downloadable PDF via `@react-pdf/renderer` (the same MinutesDocument template used for the agenda book).

**ASR provider — RESEARCH NEEDED.** Decision criteria below in § 22. Until decided, `lib/services/asr/stub.ts` returns a fixture transcript that lets the editor and minutes pipeline be developed and tested end-to-end.

---

## 16. Background jobs and async pipelines (Inngest)

All Inngest function definitions live in `lib/inngest/functions/`. The Inngest webhook receiver is `app/api/inngest/route.ts`. Functions are registered on the `inngest` client in `lib/inngest/client.ts` and exported via `inngest.serve(...)` per the Next.js adapter. Local dev requires `pnpm dlx inngest-cli@latest dev`.

| Function ID                   | Trigger event                                                                        | Purpose                                                                                                                                             | Retry policy                                    | Expected duration                     | Failure path                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `meeting.audio.transcribe`    | `meeting.recording.completed`                                                        | Concatenate chunks; call ASR; persist transcript + segments.                                                                                        | 3 retries, exponential backoff (1m → 5m → 15m). | 30s – 5min depending on audio length. | On final failure: set `transcripts.status='asr_failed'`; Sentry capture; toast on dashboard. |
| `meeting.transcript.approved` | `meeting.transcript.approved`                                                        | Generate draft minutes via AI SDK + Anthropic. Persist as `news_posts.draft`.                                                                       | 2 retries, 30s/2m.                              | 5–20s.                                | Set draft to manual-write fallback; surface a banner in A5; audit log entry.                 |
| `meeting.minutes.publish`     | manual call from `publishMinutes` action                                             | PDF-render minutes; flip `news_posts.status='published'`; emit `meeting.minutes.published`.                                                         | 2 retries.                                      | 1–3s.                                 | If PDF render fails, publish minutes without PDF and email Secretary.                        |
| `resolution.pdf.generate`     | called from `publishResolution` and `uploadResolutionPdf`                            | Render PDF via `@react-pdf/renderer`; persist to Storage; update `resolutions.pdf_storage_path`.                                                    | 3 retries, 1m/5m/15m.                           | 1–3s.                                 | Mark resolution `published` without PDF and email Secretary; manual re-trigger via A7.       |
| `citizen-query.notification`  | `citizen_query.created`, `citizen_query.replied`, `citizen_query.deletion_requested` | Send Resend transactional email (confirmation, reply, deletion confirm).                                                                            | 5 retries.                                      | <2s.                                  | Bounce → mark `citizen_queries.notification_failed=true`; Secretary sees a banner in A13.    |
| `audit-log.daily-rollup`      | cron: `0 2 * * *` PHT (02:00 daily)                                                  | Aggregate yesterday's audit entries into a daily summary stored in `audit_log_summaries`; soft-purge `citizen_queries` past `retention_expires_at`. | 1 retry.                                        | 5–60s.                                | Sentry capture; Slack alert (or email to Secretary).                                         |

---

## 17. Spam protection and data privacy (RA 10173)

### 17.1 Spam protection on `/submit-query`

1. **Cloudflare Turnstile** widget rendered via `@marsidev/react-turnstile`. Sitekey from `env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`. The client posts the resulting token with the form. The server action verifies the token by POSTing to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `env.TURNSTILE_SECRET_KEY` and the token. Failure → reject with `code='TURNSTILE_FAILED'`.
2. **Honeypot field** named `website` rendered via `HoneypotField` (display:none, `aria-hidden`, `tabindex={-1}`). Bots fill it; humans do not. The server action checks `honeypotWebsite.length > 0` and **silently returns success** (with a fake reference number), never persisting the row. This prevents bots from learning whether their submission was accepted.
3. **Per-IP rate limiting** via `@upstash/ratelimit`: 5 submissions per IP per hour, 20 per IP per day. Sliding window. Limit applied **before** Turnstile verification to save Cloudflare cost.
4. **Per-email rate limiting**: 3 submissions per email per 24 hours. Same backend.
5. **Idempotency**: client supplies `clientSubmissionId` (UUID); the server upserts on this and returns the existing reference if already created. Double-submit silently dedupes.

### 17.2 RA 10173 consent notice

The exact text (rendered by `ConsentNotice` on `submit-query` and in the footer):

```text
By submitting, you consent to the LGU storing your name and email only to respond to this query, per the Philippine Data Privacy Act of 2012 (RA 10173). Your message may be redacted before any public summary. We retain submitted queries for three (3) years and then permanently delete them. You may request deletion at any time by emailing dpo@lambunao.gov.ph or by clicking the deletion-request link in the confirmation email.
```

Required-checkbox version on `submit-query`: same text + a `<input type="checkbox" required>` labeled "I understand and agree." The checkbox must be checked for `consentAccepted: z.literal(true)` to validate.

### 17.3 Retention policy

- `citizen_queries.retention_expires_at` set on insert to `submitted_at + interval '3 years'`.
- The `audit-log.daily-rollup` cron soft-deletes rows where `retention_expires_at < now()` and writes an audit-log entry with `action='citizen_query.retention_purged'`.
- Soft-deleted rows are **hard-deleted** after an additional 90 days by a quarterly cron.
- Audit log entries themselves are retained for **7 years** before soft-purge (longer than the underlying records, for accountability).

### 17.4 DPO contact and deletion request workflow

DPO email: `dpo@lambunao.gov.ph`. Surface in:

- The footer of every public page.
- The consent notice text above.
- The confirmation email sent via Resend after a successful `submit-query`.

Deletion request workflow:

1. Citizen clicks "Request deletion of this query" link in the confirmation email.
2. Link routes to `app/api/citizen-queries/deletion-confirm/[token]/route.ts` with a signed token (HMAC over `query_id + submitted_at`, `env.DPO_DELETION_SECRET`).
3. Handler verifies the signature, sets `citizen_queries.deletion_requested_at = now()`, writes audit-log entry `action='citizen_query.deletion_requested'`, sends an email confirming the request.
4. The next `audit-log.daily-rollup` run soft-deletes the row.
5. The citizen receives a final confirmation email when soft-deletion completes.

---

## 18. Accessibility non-negotiables (WCAG 2.1 AA)

The following six rules are reproduced from the design handoff and are project hard requirements:

1. **Touch targets ≥ 44×44 px** on every interactive element. Mobile recorder controls use ≥ 64×64 for primary actions.
2. **Skip-to-content link** is the first focusable element on every page. Anchored to `#main`. Visible on focus.
3. **Focus ring**: `3px solid #cdd6e6 / offset 2px`. Never removed (`outline: none` is forbidden anywhere in CSS).
4. **Status uses icon + text**, never color alone. Badges always include both a Lucide icon and a label.
5. **Icon-only buttons carry `aria-label`** matching the icon's intent. Decorative icons inside labeled buttons are `aria-hidden="true"`.
6. **Every text/bg pair meets WCAG AA** (≥ 4.5:1 for body text, ≥ 3:1 for large text). The token palette in § 13 is verified at design-time; engineers re-verify before adding any new color.

### Testing checklist (run before every merge)

- Lighthouse Accessibility score ≥ 95 on every public route.
- `axe-core` zero violations via Playwright integration on every public + admin route.
- Keyboard-only walkthrough of each phase before merge: tab through every interactive, verify focus visible, verify activation works without mouse.
- Screen-reader walkthrough of one critical flow per phase (NVDA on Windows, VoiceOver on macOS) — phase 1: submit-query; phase 2: meeting record + transcript edit; phase 3: user invite + audit log.

---

## 19. Performance and 3G/offline strategy

### 19.1 Recorder

- **Local IndexedDB buffer** (key: `clientChunkId`, value: `Blob`). Survives tab close.
- **Chunked resumable upload**: 256 KB pieces, parallelized to a fixed 2 in flight. Each piece carries the `clientChunkId` + a piece index; server reassembles. Upload state survives browser refresh.
- **Persistent gold offline banner** (`bg-gold` from § 13) when `navigator.onLine === false`. Announces "Recording continues offline. Audio will upload when reconnected." The banner stays until queue is drained.
- **Sync resume** on reconnect: scan IndexedDB for unsent chunks, retry oldest first.

### 19.2 Public site

- Critical CSS inlined via Next.js automatic css-in-js extraction (Tailwind v4 produces minimal output by default).
- Fonts preloaded: Inter Subset (Latin + Filipino diacritics), Source Serif Pro (display weight only). Preload with `<link rel="preload" as="font" crossorigin>` in root layout.
- All `<img>` use `next/image` with explicit `width` + `height`; `loading="lazy"` everywhere except hero seal on P1 (`priority`).
- ISR for `/[locale]/news/[slug]` and `/[locale]/members/[id]`: `revalidate: 3600` (1 hour). Force revalidate on publish via `revalidatePath`.

### 19.3 Admin

- Server Components by default; client boundaries pushed to leaves.
- Aggressive route-segment caching where data changes infrequently (`/(app)/audit`, `/(app)/users`, `/(app)/settings`).
- Prefetch on hover for primary admin nav (Sidebar handles this via `Link prefetch`).

### 19.4 Idempotent POSTs

All write actions accept a client-supplied UUID `clientSubmissionId`. The server records this in a unique-constraint column per action surface and returns the existing result on duplicate. Applies to: `createCitizenQuery`, `replyToCitizenQuery`, `inviteUser`, `createNewsPost`, `createResolution`, `uploadResolutionPdf`, `recordMeeting.start/stop/pause`.

### 19.5 Cached-data CTAs

When a list-screen fetch fails (network or RSC error), render the last-known cached response with a banner: **"Showing cached data, X hours old."** Plus a "Refresh" button that retries. Implementation: TanStack Query for client-side lists, plus `next/cache` with `revalidate` for RSC lists. On ISR miss, render stale rather than block.

---

## 20. Observability and ops

Per `BASEPLATE.md` § 3:

- **Sentry** auto-instruments server / client / edge. `tracesSampleRate: 0.1` in production. `beforeSend` strips `submitter_email`, `submitter_name`, `message_md`, and any field matching `/email|password|token|secret/i`. Source maps uploaded by the wizard.
- **PostHog** for product analytics, session replay, and experiments. Initialized in a Client Component provider after auth resolves. Session replay disabled on routes containing PII (`/(app)/queries/*`).
- **`@vercel/flags`** for kill switches and percentage rollouts at the edge. PostHog handles cohort experiments. See `CLAUDE.md` § Feature flags.
- **Pino** structured server logs piped to a Vercel Log Drain → Axiom (or Better Stack). Redact list: `password`, `token`, `authorization`, `cookie`, `submitter_email`.
- **Vercel Analytics + Speed Insights** for Web Vitals and traffic.

### SB-Lambunao-specific dashboards (set up in PostHog or Axiom)

1. **Weekly query volume** — count of `citizen_queries.created` per week, broken down by `category`. Target: detect spam waves.
2. **Resolution publish rate** — count of `resolution.published` audit events per month vs. drafts. Target: identify stuck drafts.
3. **Transcript approval lead time** — time from `meeting.transcript.ready` to `meeting.transcript.approved`. Target: median ≤ 7 days.
4. **Locale split of public traffic** — page views grouped by `[locale]` segment. Target: confirm Hiligaynon adoption justifies the translation investment.
5. **Recorder failure rate** — failed `meeting.audio.transcribe` runs per week. Target: ≤ 2% of meetings.

Alerts (Sentry + Axiom):

- Any `audit_log_entries` insert failure (audit must always succeed).
- `citizen-query.notification` final failure (citizen never got their reply).
- ASR provider 5xx rate over 5% in any 1-hour window.

---

## 21. Phasing and milestones

Reference date: **2026-04-28** (Tuesday, ISO week 18).

### Phase 1 — Foundation (3 weeks · 2026-04-28 → 2026-05-19)

**Scope**: Public surface (P1–P8) + Admin shell + A1 Login + A2 Dashboard + A13 Queries inbox + A14 Query detail + A18 States. RBAC enforced. RA 10173 compliance complete. No recorder, no transcript editor.

**ISO weeks**: 18, 19, 20.

**Exit criteria**:

- Public surface deployed on `lambunao.gov.ph` (or staging subdomain) with all 8 public screens functional.
- Citizen can submit a query end-to-end: form → Turnstile → confirmation page → confirmation email → reference number persisted.
- Secretary can log in, see the dashboard, triage a query, reply, mark answered. Audit log records every action.
- Lighthouse Accessibility ≥ 95 on every public route.
- All RA 10173 elements live: consent notice, deletion link, retention sweeper.
- Sentry + PostHog + Vercel Analytics integrated.

### Phase 2 — Council operations (4 weeks · 2026-05-19 → 2026-06-16)

**Scope**: A3 Meetings list + A4 Meeting/Recorder (UI + chunked upload, ASR stubbed) + A5 Transcript editor (UI + editing + approval, ASR stubbed) + A6/A7/A8 Resolutions + A11/A12 News + A9/A10 Members + A15 Audit log. Inngest pipelines for resolution PDF generation and audit log rollup. **ASR provider chosen and integrated by end of phase.**

**ISO weeks**: 21, 22, 23, 24.

**Exit criteria**:

- Secretary can record a meeting in the browser, chunked upload survives a network drop, transcript appears in the editor (real ASR by end of phase).
- Editor supports per-segment edits with auto-save and approval.
- Resolution can be drafted, sponsored, uploaded as PDF, published; PDF visible to public.
- News post can be composed in MDX, published, visible on public news feed.
- Member directory editable; committee assignments work.
- Audit log shows every state transition.

### Phase 3 — Admin polish + scale (2 weeks · 2026-06-16 → 2026-06-30)

**Scope**: A16 User management + A17 Settings + minutes auto-extraction (AI SDK + Anthropic) + Supabase Realtime upgrade for queries inbox and REC indicator + i18n full coverage (real translations replacing `[TL]` / `[HIL]` placeholders).

**ISO weeks**: 25, 26.

**Exit criteria**:

- Secretary can invite users by email; new users set passwords on first login.
- Settings page exposes tenant info, retention overrides, locale defaults.
- Approving a transcript triggers AI minutes extraction; Secretary reviews and publishes minutes as a news post.
- Queries inbox updates in real-time when a citizen submits or staff replies.
- All public-surface UI and content available in EN, TL, HIL with at least machine-drafted translations reviewed by a human translator.
- Total: 9 weeks · ends 2026-06-30.

### Cross-phase

- Each phase ends with a code-review pass per `code-review:code-review` skill, an a11y audit, a Lighthouse scan, and an `axe-core` zero-violation gate.
- A retro is scheduled for the Friday of the last week of each phase to surface scope changes and update PROJECT.md if conventions evolve.

---

## 22. Open questions and references

### 22.1 Open questions (RESEARCH NEEDED)

#### ASR provider selection

**What's needed to close**:

- **Cost ceiling**: max acceptable monthly spend at projected volume (~30 hours of audio per month — 2 sessions per week, 3 hours each).
- **Hiligaynon accuracy requirement**: minimum word-error-rate (WER) on a Hiligaynon-only sample meeting. If no provider hits the bar, decide between (a) human transcription with ASR-assisted draft (b) Hiligaynon-specific fine-tuning (cost-prohibitive at this scale) (c) accept lower accuracy for Hiligaynon and post-edit aggressively.
- **Data residency**: does audio of public council sessions need to remain in-Philippines? (Consult with the Office of the Mayor and DPO.)
- **Speaker diarization**: is it bundled or separate? Cost implication if separate.

**Candidates**:

- **OpenAI Whisper API** — cheap (~$0.006/min), strong English/Tagalog, weak/untested Hiligaynon. Built-in language detection. No diarization (need a separate step).
- **Deepgram** (Nova-2 / Aura) — paid, multilingual, has Tagalog, no published Hiligaynon. Built-in diarization. Streaming-friendly.
- **AssemblyAI** — paid, strong diarization, no published Hiligaynon. Async-only.

**Holding pattern until decided**: `lib/services/asr/stub.ts` returns a fixture transcript. Recorder UI and editor UI develop end-to-end without a real provider. The `transcripts.asr_provider` column persists which provider produced each transcript so retroactive comparisons are possible.

#### Translation strategy (AI-draft vs. human-only)

**What's needed to close**:

- **Content volume estimate**: how many news posts, resolutions, and member bios per month need to ship in all three locales?
- **Budget**: cost ceiling for human-translator time at standard rates (~₱2 per word).
- **Acceptable quality bar for first draft**: is AI-draft + light human review acceptable, or is it human-only from start? (Council leadership's preference matters.)
- **Liability**: are there any resolutions or notices that have legal weight in their translated form? If so, those must be human-translated and approved.

**Candidate paths**:

- (a) **AI-draft + human-reviewed**: every record's `en` field translates to `tl` + `hil` via an Anthropic-backed `translate` service. The draft persists with `translator_kind='ai_draft'`; a human translator reviews and updates `translator_kind='human'` + `reviewed_by` + `reviewed_at`. Public surface displays `[TL]` / `[HIL]` if `translator_kind='ai_draft'` and a config flag forces human-only display.
- (b) **Human-only with placeholders**: untranslated content renders as `[TL] <english>` until a human translator submits the localized text. Slower to roll out, fewer machine-translation errors.

**Holding pattern until decided**: `lib/services/translation/stub.ts` returns the source text wrapped in `[TL]` / `[HIL]` brackets. The `translations` table accepts both `ai_draft` and `human` rows; the production decision flips a config flag, not schema.

#### Real-time vs. fetch-on-interval

**What's needed to close**:

- **Measure actual queries-inbox latency** in phase 1 production: how long does the Secretary wait between a citizen submission and visible inbox update with a 30-second fetch interval?
- **User complaints**: track Secretary feedback; if "I missed the query for an hour" comes up, real-time wins.
- **Cost of Supabase Realtime** at our scale: negligible, but verify against current pricing.

**Decision deadline**: end of phase 2. If real-time is needed, phase 3 enables `supabase.channel(...).on('postgres_changes', ...)` for `citizen_queries` and the in-progress recorder REC indicator.

### 22.2 References

| Reference                     | Path / URL                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| Stack rationale               | `BASEPLATE.md`                                                     |
| Stack rules and conventions   | `CLAUDE.md`                                                        |
| Wireframe HTML (clean export) | `sb/project/SB Lambunao Wireframes.html` (internal handoff bundle) |
| Wireframe print version       | `sb/project/SB Lambunao Wireframes-print.html`                     |
| Wireframe chat transcript     | `sb/chats/chat1.md`                                                |
| Lambunao seal asset           | `public/seal/lambunao-seal.png`                                    |
| Data privacy act              | Republic Act No. 10173, Data Privacy Act of 2012 (Philippines)     |
| Cloudflare Turnstile docs     | https://developers.cloudflare.com/turnstile/                       |
| `next-intl` docs              | https://next-intl-docs.vercel.app/                                 |
| `@react-pdf/renderer` docs    | https://react-pdf.org/                                             |
| Supabase RLS guide            | https://supabase.com/docs/guides/auth/row-level-security           |
| Inngest Next.js adapter       | https://www.inngest.com/docs/learn/serving-inngest-functions       |
| WCAG 2.1 AA                   | https://www.w3.org/TR/WCAG21/                                      |
