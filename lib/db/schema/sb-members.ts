import { sql } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './tenants';

export const memberPosition = pgEnum('member_position', [
  'mayor',
  'vice_mayor',
  'sb_member',
  'sk_chairperson',
  'liga_president',
  'ipmr',
]);

export const sbMembers = pgTable('sb_members', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  honorific: text('honorific').notNull().default('Hon.'),
  position: memberPosition('position').notNull(),
  termStartYear: integer('term_start_year').notNull(),
  termEndYear: integer('term_end_year').notNull(),
  seniority: text('seniority'),
  photoStoragePath: text('photo_storage_path'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  bioMd: text('bio_md'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  showOnPublic: boolean('show_on_public').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type SBMember = typeof sbMembers.$inferSelect;
export type NewSBMember = typeof sbMembers.$inferInsert;
