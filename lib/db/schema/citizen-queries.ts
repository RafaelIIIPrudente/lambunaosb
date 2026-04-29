import { sql } from 'drizzle-orm';
import {
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { tenants } from './tenants';

export const citizenQueryStatus = pgEnum('citizen_query_status', [
  'new',
  'in_progress',
  'awaiting_citizen',
  'answered',
  'closed',
  'spam',
]);

export const citizenQueryCategory = pgEnum('citizen_query_category', [
  'general',
  'permits',
  'health',
  'roads_infrastructure',
  'public_safety',
  'environment',
  'social_services',
]);

export const citizenQueries = pgTable('citizen_queries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ref: text('ref').notNull(),
  year: integer('year').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  submitterName: text('submitter_name').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  subject: text('subject').notNull(),
  messageMd: text('message_md').notNull(),
  category: citizenQueryCategory('category').notNull().default('general'),
  status: citizenQueryStatus('status').notNull().default('new'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  assignedTo: uuid('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  ipInet: inet('ip_inet'),
  userAgent: text('user_agent'),
  turnstileScore: numeric('turnstile_score', { precision: 3, scale: 2 }),
  honeypotTripped: text('honeypot_tripped'),
  retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }).notNull(),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  deletionConfirmedAt: timestamp('deletion_confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CitizenQuery = typeof citizenQueries.$inferSelect;
export type NewCitizenQuery = typeof citizenQueries.$inferInsert;
