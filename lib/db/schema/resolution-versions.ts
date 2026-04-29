import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { resolutions } from './resolutions';
import { tenants } from './tenants';

export const resolutionVersions = pgTable('resolution_versions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  resolutionId: uuid('resolution_id')
    .notNull()
    .references(() => resolutions.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  label: text('label').notNull(),
  bodyMdSnapshot: text('body_md_snapshot').notNull(),
  pdfStoragePath: text('pdf_storage_path'),
  authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ResolutionVersion = typeof resolutionVersions.$inferSelect;
export type NewResolutionVersion = typeof resolutionVersions.$inferInsert;
