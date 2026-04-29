import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { meetings } from './meetings';
import { profiles } from './profiles';
import { tenants } from './tenants';

export const transcriptStatus = pgEnum('transcript_status', [
  'awaiting_asr',
  'asr_failed',
  'in_review',
  'approved',
  'rejected',
]);

export const transcripts = pgTable('transcripts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' })
    .unique(),
  primaryLocale: text('primary_locale').notNull().default('hil'),
  asrProvider: text('asr_provider'),
  asrJobId: text('asr_job_id'),
  status: transcriptStatus('status').notNull().default('awaiting_asr'),
  approvedBy: uuid('approved_by').references(() => profiles.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
