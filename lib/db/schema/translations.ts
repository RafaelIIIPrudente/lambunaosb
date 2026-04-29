import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { tenants } from './tenants';

export const translatorKind = pgEnum('translator_kind', ['human', 'ai_draft', 'system']);

export const translations = pgTable('translations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sourceTable: text('source_table').notNull(),
  sourceId: uuid('source_id').notNull(),
  sourceField: text('source_field').notNull(),
  locale: text('locale').notNull(),
  value: text('value').notNull(),
  translatorKind: translatorKind('translator_kind').notNull(),
  translatedBy: uuid('translated_by').references(() => profiles.id, { onDelete: 'set null' }),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;
