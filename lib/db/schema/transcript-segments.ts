import { sql } from 'drizzle-orm';
import { integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { sbMembers } from './sb-members';
import { transcripts } from './transcripts';

export const transcriptSegmentFlag = pgEnum('transcript_segment_flag', [
  'motion',
  'vote',
  'decision',
  'question',
  'quote',
  'off_record',
]);

export const transcriptSegments = pgTable('transcript_segments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transcriptId: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  sequenceIndex: integer('sequence_index').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  speakerId: uuid('speaker_id').references(() => sbMembers.id, { onDelete: 'set null' }),
  speakerLabel: text('speaker_label'),
  locale: text('locale').notNull(),
  text: text('text').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  flag: transcriptSegmentFlag('flag'),
  editedBy: uuid('edited_by').references(() => profiles.id, { onDelete: 'set null' }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type NewTranscriptSegment = typeof transcriptSegments.$inferInsert;
