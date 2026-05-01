import { sql } from 'drizzle-orm';
import { jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { meetings } from './meetings';
import { newsPosts } from './news-posts';
import { profiles } from './profiles';
import { tenants } from './tenants';

export const meetingMinutesStatus = pgEnum('meeting_minutes_status', [
  'draft',
  'awaiting_attestation',
  'attested',
  'published',
  'archived',
]);

// One structured item from the SB minutes "Items of Business" section.
// Generated initially by gpt-4o from the approved transcript; freely
// editable by the Secretary in the minutes review UI.
//
// Name + ID pairs: gpt-4o returns names verbatim from the transcript
// (e.g. "Hon. Maria dela Cruz"). The generator post-resolves to member
// FK ids via normalised name match; if the resolution fails, *Id stays
// null and the Secretary picks the right member in the review UI.
export type MinutesItemOfBusiness = {
  id: string;
  order: number;
  topic: string;
  motionText: string | null;
  motionedByName: string | null;
  motionedById: string | null; // sb_members.id, resolved from name
  secondedByName: string | null;
  secondedById: string | null; // sb_members.id, resolved from name
  discussionSummary: string;
  disposition: 'carried' | 'denied' | 'tabled' | 'withdrawn' | 'noted';
  voteSummary: string | null; // free text e.g. "Yea 12 / Nay 1 / Abstain 1"
};

export const meetingMinutes = pgTable('meeting_minutes', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  status: meetingMinutesStatus('status').notNull().default('draft'),
  coverHeader: text('cover_header').notNull().default(''),
  attendeesText: text('attendees_text').notNull().default(''),
  itemsOfBusiness: jsonb('items_of_business')
    .$type<MinutesItemOfBusiness[]>()
    .notNull()
    .default([]),
  adjournmentSummary: text('adjournment_summary').notNull().default(''),
  draftedById: uuid('drafted_by_id').references(() => profiles.id, { onDelete: 'set null' }),
  draftedAt: timestamp('drafted_at', { withTimezone: true }),
  readyForAttestationAt: timestamp('ready_for_attestation_at', { withTimezone: true }),
  attestedById: uuid('attested_by_id').references(() => profiles.id, { onDelete: 'set null' }),
  attestedAt: timestamp('attested_at', { withTimezone: true }),
  publishedNewsPostId: uuid('published_news_post_id').references(() => newsPosts.id, {
    onDelete: 'set null',
  }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  generationCostUsd: numeric('generation_cost_usd', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type MeetingMinutes = typeof meetingMinutes.$inferSelect;
export type NewMeetingMinutes = typeof meetingMinutes.$inferInsert;
