import { sql } from 'drizzle-orm';
import { inet, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { citizenQueries } from './citizen-queries';
import { tenants } from './tenants';

export const deletionRequests = pgTable('deletion_requests', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  queryId: uuid('query_id')
    .notNull()
    .references(() => citizenQueries.id, { onDelete: 'cascade' }),
  requestToken: text('request_token').notNull().unique(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipInet: inet('ip_inet'),
});

export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type NewDeletionRequest = typeof deletionRequests.$inferInsert;
