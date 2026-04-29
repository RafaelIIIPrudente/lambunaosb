import { sql } from 'drizzle-orm';
import { boolean, inet, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles, userRole } from './profiles';
import { tenants } from './tenants';

export const auditCategory = pgEnum('audit_category', [
  'resolution',
  'meeting',
  'query',
  'user',
  'member',
  'security',
  'system',
]);

export const auditLogEntries = pgTable('audit_log_entries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
  actorRoleSnapshot: userRole('actor_role_snapshot'),
  action: text('action').notNull(),
  category: auditCategory('category').notNull().default('system'),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  alert: boolean('alert').notNull().default(false),
  ipInet: inet('ip_inet'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLogEntries.$inferSelect;
export type NewAuditLogEntry = typeof auditLogEntries.$inferInsert;
export type AuditCategory = (typeof auditCategory.enumValues)[number];
