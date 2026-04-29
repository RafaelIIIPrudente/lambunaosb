import { sql } from 'drizzle-orm';
import { date, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { committees } from './committees';
import { sbMembers } from './sb-members';
import { tenants } from './tenants';

export const committeeRole = pgEnum('committee_role', ['chair', 'vice_chair', 'member']);

export const committeeAssignments = pgTable('committee_assignments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => sbMembers.id, { onDelete: 'cascade' }),
  committeeId: uuid('committee_id')
    .notNull()
    .references(() => committees.id, { onDelete: 'cascade' }),
  role: committeeRole('role').notNull().default('member'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CommitteeAssignment = typeof committeeAssignments.$inferSelect;
export type NewCommitteeAssignment = typeof committeeAssignments.$inferInsert;
