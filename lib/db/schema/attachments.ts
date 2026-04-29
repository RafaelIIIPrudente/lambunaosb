import { sql } from 'drizzle-orm';
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { tenants } from './tenants';

export const attachmentOwnerType = pgEnum('attachment_owner_type', [
  'resolution',
  'citizen_query_reply',
  'news_post',
  'meeting',
  'member',
]);

export const attachments = pgTable('attachments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ownerType: attachmentOwnerType('owner_type').notNull(),
  ownerId: uuid('owner_id').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  originalFilename: text('original_filename').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
