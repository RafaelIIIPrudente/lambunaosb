import { z } from 'zod';

export const NEWS_CATEGORIES = [
  'health',
  'notice',
  'hearing',
  'event',
  'announcement',
  'press_release',
] as const;

export const NEWS_CATEGORY_LABELS: Record<(typeof NEWS_CATEGORIES)[number], string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

export const NEWS_VISIBILITIES = ['public', 'admin_only'] as const;

export const createNewsPostSchema = z.object({
  title: z.string().min(5, 'Headline is too short.').max(280),
  excerpt: z.string().max(280).optional(),
  bodyMdx: z.string().min(20, 'Add some body copy.'),
  category: z.enum(NEWS_CATEGORIES),
  visibility: z.enum(NEWS_VISIBILITIES).default('public'),
  pinned: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  coverStoragePath: z.string().optional(),
  publishImmediately: z.boolean().default(false),
  scheduledAt: z.iso.datetime().optional(),
});

export type CreateNewsPostInput = z.infer<typeof createNewsPostSchema>;

export const updateNewsPostSchema = createNewsPostSchema.extend({
  postId: z.uuid(),
});

export type UpdateNewsPostInput = z.infer<typeof updateNewsPostSchema>;

export const publishNewsPostSchema = z.object({
  postId: z.uuid(),
});

export type PublishNewsPostInput = z.infer<typeof publishNewsPostSchema>;
