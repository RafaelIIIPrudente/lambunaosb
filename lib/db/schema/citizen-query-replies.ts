import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { citizenQueries } from './citizen-queries';
import { profiles } from './profiles';
import { tenants } from './tenants';

export const citizenQueryReplies = pgTable('citizen_query_replies', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  queryId: uuid('query_id')
    .notNull()
    .references(() => citizenQueries.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'restrict' }),
  bodyMd: text('body_md').notNull(),
  sentToEmail: text('sent_to_email').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CitizenQueryReply = typeof citizenQueryReplies.$inferSelect;
export type NewCitizenQueryReply = typeof citizenQueryReplies.$inferInsert;
