import { sql } from 'drizzle-orm';
import { date, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { committees } from './committees';
import { meetings } from './meetings';
import { profiles } from './profiles';
import { sbMembers } from './sb-members';
import { tenants } from './tenants';

export const resolutionStatus = pgEnum('resolution_status', [
  'draft',
  'pending',
  'approved',
  'withdrawn',
  'published',
]);

export const resolutionType = pgEnum('resolution_type', ['ordinance', 'resolution']);

export const resolutions = pgTable('resolutions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  number: text('number').notNull(),
  year: integer('year').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  type: resolutionType('type').notNull().default('resolution'),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull().default(''),
  primarySponsorId: uuid('primary_sponsor_id').references(() => sbMembers.id, {
    onDelete: 'set null',
  }),
  coSponsorIds: jsonb('co_sponsor_ids').$type<string[]>().notNull().default([]),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  committeeId: uuid('committee_id').references(() => committees.id, { onDelete: 'set null' }),
  status: resolutionStatus('status').notNull().default('draft'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  pdfStoragePath: text('pdf_storage_path'),
  pdfPageCount: integer('pdf_page_count'),
  pdfByteSize: integer('pdf_byte_size'),
  dateFiled: date('date_filed'),
  firstReadingAt: date('first_reading_at'),
  secondReadingAt: date('second_reading_at'),
  voteSummary: text('vote_summary'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Resolution = typeof resolutions.$inferSelect;
export type NewResolution = typeof resolutions.$inferInsert;
