import { z } from 'zod';

export const NEWS_CATEGORIES = [
  'health',
  'notice',
  'hearing',
  'event',
  'announcement',
  'press_release',
] as const;

export type NewsCategoryValue = (typeof NEWS_CATEGORIES)[number];

export const NEWS_CATEGORY_LABELS: Record<NewsCategoryValue, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

export const NEWS_VISIBILITIES = ['public', 'admin_only'] as const;

export type NewsVisibilityValue = (typeof NEWS_VISIBILITIES)[number];

export const NEWS_VISIBILITY_LABELS: Record<NewsVisibilityValue, string> = {
  public: 'Public',
  admin_only: 'Admin only',
};

export const NEWS_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;

export type NewsStatusValue = (typeof NEWS_STATUSES)[number];

export const NEWS_STATUS_LABELS: Record<NewsStatusValue, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Cover image storage path is intentionally NOT in this schema. It's owned
// exclusively by updateNewsPostCover (and the auto-cover branch in
// replaceNewsPostPhotos). Including it here let the editor form's stale
// defaultValues clobber a freshly uploaded cover on save.
export const newsPostSchema = z.object({
  title: z.string().min(5, 'Headline must be at least 5 characters.').max(280),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters.')
    .max(120)
    .regex(SLUG_REGEX, 'Slug must be kebab-case (lowercase letters, numbers, hyphens).'),
  excerpt: z.string().max(280).optional(),
  bodyMdx: z.string().min(20, 'Body must be at least 20 characters.'),
  category: z.enum(NEWS_CATEGORIES),
  visibility: z.enum(NEWS_VISIBILITIES),
  pinned: z.boolean(),
  tags: z.array(z.string().min(1).max(60)).max(20),
});

export type NewsPostInput = z.infer<typeof newsPostSchema>;

export const updateNewsPostSchema = newsPostSchema.extend({
  postId: z.uuid(),
});

export type UpdateNewsPostInput = z.infer<typeof updateNewsPostSchema>;

export const publishNewsPostSchema = z.object({
  postId: z.uuid(),
});

export type PublishNewsPostInput = z.infer<typeof publishNewsPostSchema>;

export const unpublishNewsPostSchema = z.object({
  postId: z.uuid(),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters.')
    .max(500, 'Reason must be at most 500 characters.'),
});

export type UnpublishNewsPostInput = z.infer<typeof unpublishNewsPostSchema>;

export const archiveNewsPostSchema = z.object({
  postId: z.uuid(),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters.')
    .max(500, 'Reason must be at most 500 characters.'),
});

export type ArchiveNewsPostInput = z.infer<typeof archiveNewsPostSchema>;

export const updateNewsPostCoverSchema = z.object({
  postId: z.uuid(),
  storagePath: z.string().min(1),
  byteSize: z.number().int().min(0).optional(),
});

export type UpdateNewsPostCoverInput = z.infer<typeof updateNewsPostCoverSchema>;

export const MAX_GALLERY_PHOTOS = 15;

export const newsPostPhotoSchema = z.object({
  storagePath: z.string().min(1),
  altText: z.string().max(280).nullable(),
  byteSize: z.number().int().min(0).nullable(),
});

export type NewsPostPhotoInput = z.infer<typeof newsPostPhotoSchema>;

export const replaceNewsPostPhotosSchema = z.object({
  postId: z.uuid(),
  photos: z
    .array(newsPostPhotoSchema)
    .max(MAX_GALLERY_PHOTOS, `At most ${MAX_GALLERY_PHOTOS} photos per post.`),
});

export type ReplaceNewsPostPhotosInput = z.infer<typeof replaceNewsPostPhotosSchema>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}
