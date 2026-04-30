import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { sbMembers } from './sb-members';
import { tenants } from './tenants';

export const userRole = pgEnum('user_role', [
  'secretary',
  'mayor',
  'vice_mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
  'other_lgu',
]);

export type NotificationChannelPrefs = { email: boolean; push: boolean };

export type NotificationPreferences = {
  newCitizenQuery?: NotificationChannelPrefs;
  transcriptReadyForApproval?: NotificationChannelPrefs;
  resolutionRequiresSignature?: NotificationChannelPrefs;
};

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  role: userRole('role').notNull(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  honorific: text('honorific').default('Hon.'),
  title: text('title'),
  phone: text('phone'),
  avatarStoragePath: text('avatar_storage_path'),
  memberId: uuid('member_id').references(() => sbMembers.id, { onDelete: 'set null' }),
  uiLocale: text('ui_locale').notNull().default('en'),
  timeZone: text('time_zone').notNull().default('Asia/Manila'),
  notificationPreferences: jsonb('notification_preferences')
    .$type<NotificationPreferences>()
    .notNull()
    .default({}),
  active: boolean('active').notNull().default(true),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
