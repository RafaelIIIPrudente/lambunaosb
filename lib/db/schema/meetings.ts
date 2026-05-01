import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { sbMembers } from './sb-members';
import { tenants } from './tenants';

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

export type AgendaItem = {
  id: string;
  order: number;
  title: string;
  presenter?: string;
  durationMinutes?: number;
};

export const meetings = pgTable('meetings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: meetingType('type').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  title: text('title').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  presiderId: uuid('presider_id').references(() => sbMembers.id, { onDelete: 'set null' }),
  location: text('location').notNull().default('Session Hall, 2/F Municipal Hall'),
  agendaJson: jsonb('agenda_json').$type<AgendaItem[]>().notNull().default([]),
  primaryLocale: text('primary_locale').notNull().default('hil'),
  status: meetingStatus('status').notNull().default('scheduled'),
  audioStoragePrefix: text('audio_storage_prefix'),
  audioDurationMs: integer('audio_duration_ms'),
  // Per-meeting toggle for the Hiligaynon code-switch cleanup pass after
  // Whisper. Default false; flip on for sessions known to be HIL-heavy.
  cleanupEnabled: boolean('cleanup_enabled').notNull().default(false),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
