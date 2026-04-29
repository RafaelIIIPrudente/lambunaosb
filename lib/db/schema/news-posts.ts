import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';
import { tenants } from './tenants';

export const newsCategory = pgEnum('news_category', [
  'health',
  'notice',
  'hearing',
  'event',
  'announcement',
  'press_release',
]);

export const newsStatus = pgEnum('news_status', ['draft', 'scheduled', 'published', 'archived']);
export const newsVisibility = pgEnum('news_visibility', ['public', 'admin_only']);

export const newsPosts = pgTable('news_posts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  bodyMdx: text('body_mdx').notNull(),
  category: newsCategory('category').notNull(),
  status: newsStatus('status').notNull().default('draft'),
  visibility: newsVisibility('visibility').notNull().default('public'),
  pinned: boolean('pinned').notNull().default(false),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  coverStoragePath: text('cover_storage_path'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type NewsPost = typeof newsPosts.$inferSelect;
export type NewNewsPost = typeof newsPosts.$inferInsert;
