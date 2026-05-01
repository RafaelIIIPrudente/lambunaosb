import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { meetings } from './meetings';
import { tenants } from './tenants';

export const audioChunks = pgTable('audio_chunks', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  clientChunkId: uuid('client_chunk_id').notNull().unique(),
  sequenceIndex: integer('sequence_index').notNull(),
  durationMs: integer('duration_ms').notNull(),
  byteSize: integer('byte_size').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull().default('audio/webm;codecs=opus'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AudioChunk = typeof audioChunks.$inferSelect;
export type NewAudioChunk = typeof audioChunks.$inferInsert;
