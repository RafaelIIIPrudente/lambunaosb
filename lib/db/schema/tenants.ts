import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  province: text('province').notNull(),
  establishedYear: integer('established_year'),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  dpoEmail: text('dpo_email').notNull(),
  officeAddress: text('office_address'),
  officeHoursMd: text('office_hours_md'),
  sealStoragePath: text('seal_storage_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
