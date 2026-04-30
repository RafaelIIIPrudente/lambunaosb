'use server';

import 'server-only';

import { and, eq, isNull, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { newsPosts } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  archiveNewsPostSchema,
  newsPostSchema,
  publishNewsPostSchema,
  replaceNewsPostPhotosSchema,
  unpublishNewsPostSchema,
  updateNewsPostCoverSchema,
  updateNewsPostSchema,
} from '@/lib/validators/news-post';

const AUTHOR_ROLES = [
  'secretary',
  'vice_mayor',
  'mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
] as const;
const PUBLISH_ROLES = ['secretary', 'vice_mayor', 'mayor'] as const;

type Role =
  | 'secretary'
  | 'mayor'
  | 'vice_mayor'
  | 'sb_member'
  | 'skmf_president'
  | 'liga_president';

function hasAuthorRole(role: string): boolean {
  return (AUTHOR_ROLES as readonly string[]).includes(role);
}

function hasPublishRole(role: string): boolean {
  return (PUBLISH_ROLES as readonly string[]).includes(role);
}

const NEWS_AUDIT_CATEGORY = 'news' as const;

function revalidateNewsRoutes(postId: string, slug?: string | null, alsoPublic = false) {
  revalidatePath('/admin/news');
  revalidatePath(`/admin/news/${postId}`);
  if (alsoPublic) {
    revalidatePath('/news');
    revalidatePath('/');
    if (slug) revalidatePath(`/news/${slug}`);
  }
}

export async function createNewsPost(raw: unknown): Promise<Result<{ id: string; slug: string }>> {
  const parsed = newsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to author news posts.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    // Slug uniqueness within tenant.
    const [collision] = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.slug, parsed.data.slug)))
      .limit(1);
    if (collision) {
      return err('That slug is already taken. Pick a different one.', 'E_SLUG_COLLISION');
    }

    const [row] = await db
      .insert(newsPosts)
      .values({
        tenantId,
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? null,
        bodyMdx: parsed.data.bodyMdx,
        category: parsed.data.category,
        committeeId: parsed.data.committeeId ?? null,
        status: 'draft',
        visibility: parsed.data.visibility,
        pinned: parsed.data.pinned,
        tags: parsed.data.tags,
        // coverStoragePath is owned by updateNewsPostCover; never set here.
        authorId: ctx.userId,
      })
      .returning({ id: newsPosts.id, slug: newsPosts.slug });

    if (!row) return err('Failed to create post.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.created',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: row.id,
      metadata: { title: parsed.data.title, slug: row.slug },
    });

    revalidateNewsRoutes(row.id, row.slug);
    return ok({ id: row.id, slug: row.slug });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create post.', 'E_UNKNOWN');
  }
}

export async function updateNewsPost(raw: unknown): Promise<Result<void>> {
  const parsed = updateNewsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        authorId: newsPosts.authorId,
        status: newsPosts.status,
        slug: newsPosts.slug,
      })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.tenantId, tenantId),
          eq(newsPosts.id, parsed.data.postId),
          isNull(newsPosts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');

    const isAuthor = existing.authorId === ctx.userId;
    const isEditor = hasPublishRole(ctx.profile.role);
    if (!isAuthor && !isEditor) {
      return err('You can only edit your own posts.', 'E_FORBIDDEN');
    }

    // Slug locked after publish.
    if (existing.status === 'published' && parsed.data.slug !== existing.slug) {
      return err(
        'Slug is locked after publishing. Unpublish first to change the URL.',
        'E_INVALID_STATE',
      );
    }

    // If slug is changing, check uniqueness against OTHER rows.
    if (parsed.data.slug !== existing.slug) {
      const [collision] = await db
        .select({ id: newsPosts.id })
        .from(newsPosts)
        .where(
          and(
            eq(newsPosts.tenantId, tenantId),
            eq(newsPosts.slug, parsed.data.slug),
            ne(newsPosts.id, parsed.data.postId),
          ),
        )
        .limit(1);
      if (collision) {
        return err('That slug is already taken. Pick a different one.', 'E_SLUG_COLLISION');
      }
    }

    const result = await db
      .update(newsPosts)
      .set({
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? null,
        bodyMdx: parsed.data.bodyMdx,
        category: parsed.data.category,
        committeeId: parsed.data.committeeId ?? null,
        visibility: parsed.data.visibility,
        pinned: parsed.data.pinned,
        tags: parsed.data.tags,
        // coverStoragePath is owned by updateNewsPostCover; never set here.
        updatedAt: new Date(),
      })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .returning({ id: newsPosts.id });

    if (result.length === 0) return err('Post not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.updated',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      metadata: { title: parsed.data.title, slug: parsed.data.slug },
    });

    revalidateNewsRoutes(parsed.data.postId, parsed.data.slug, existing.status === 'published');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update post.', 'E_UNKNOWN');
  }
}

export async function publishNewsPost(raw: unknown): Promise<Result<{ publishedAt: string }>> {
  const parsed = publishNewsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasPublishRole(ctx.profile.role)) {
    return err('Only Secretary, Vice Mayor, or Mayor can publish.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        status: newsPosts.status,
        slug: newsPosts.slug,
        publishedAt: newsPosts.publishedAt,
      })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.tenantId, tenantId),
          eq(newsPosts.id, parsed.data.postId),
          isNull(newsPosts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');
    if (existing.status === 'published') {
      return err('Post is already published.', 'E_INVALID_STATE');
    }
    if (existing.status !== 'draft' && existing.status !== 'archived') {
      return err('Only draft or archived posts can be published.', 'E_INVALID_STATE');
    }

    const now = new Date();
    // Preserve original publishedAt across unpublish→republish cycles.
    const publishedAt = existing.publishedAt ?? now;

    const result = await db
      .update(newsPosts)
      .set({ status: 'published', publishedAt, updatedAt: now })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .returning({ id: newsPosts.id, slug: newsPosts.slug });
    if (result.length === 0) return err('Post not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.published',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      alert: true,
      metadata: { publishedAt: publishedAt.toISOString(), slug: existing.slug },
    });

    revalidateNewsRoutes(parsed.data.postId, existing.slug, true);
    return ok({ publishedAt: publishedAt.toISOString() });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to publish post.', 'E_UNKNOWN');
  }
}

export async function unpublishNewsPost(raw: unknown): Promise<Result<void>> {
  const parsed = unpublishNewsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasPublishRole(ctx.profile.role)) {
    return err('Only Secretary, Vice Mayor, or Mayor can unpublish.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: newsPosts.status, slug: newsPosts.slug })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.tenantId, tenantId),
          eq(newsPosts.id, parsed.data.postId),
          isNull(newsPosts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');
    if (existing.status !== 'published') {
      return err('Only published posts can be unpublished.', 'E_INVALID_STATE');
    }

    await db
      .update(newsPosts)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.unpublished',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      alert: true,
      metadata: { reason: parsed.data.reason, slug: existing.slug },
    });

    revalidateNewsRoutes(parsed.data.postId, existing.slug, true);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to unpublish post.', 'E_UNKNOWN');
  }
}

export async function archiveNewsPost(raw: unknown): Promise<Result<void>> {
  const parsed = archiveNewsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== ('secretary' satisfies Role)) {
    return err('Only the Secretary can archive posts.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ id: newsPosts.id, slug: newsPosts.slug, status: newsPosts.status })
      .from(newsPosts)
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');

    const wasPublished = existing.status === 'published';
    const deletedAt = new Date();
    await db
      .update(newsPosts)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.archived',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      alert: true,
      metadata: { reason: parsed.data.reason, slug: existing.slug, wasPublished },
    });

    revalidateNewsRoutes(parsed.data.postId, existing.slug, wasPublished);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to archive post.', 'E_UNKNOWN');
  }
}

export async function replaceNewsPostPhotos(raw: unknown): Promise<Result<void>> {
  const parsed = replaceNewsPostPhotosSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        authorId: newsPosts.authorId,
        status: newsPosts.status,
        slug: newsPosts.slug,
        coverStoragePath: newsPosts.coverStoragePath,
        photos: newsPosts.photos,
      })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.tenantId, tenantId),
          eq(newsPosts.id, parsed.data.postId),
          isNull(newsPosts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');

    const isAuthor = existing.authorId === ctx.userId;
    const isEditor = hasPublishRole(ctx.profile.role);
    if (!isAuthor && !isEditor) {
      return err('You can only manage photos on your own posts.', 'E_FORBIDDEN');
    }

    const previousPaths = new Set(existing.photos.map((p) => p.storagePath));
    const incomingPaths = new Set(parsed.data.photos.map((p) => p.storagePath));
    const added = parsed.data.photos.map((p) => p.storagePath).filter((p) => !previousPaths.has(p));
    const removed = existing.photos.map((p) => p.storagePath).filter((p) => !incomingPaths.has(p));

    const shouldAutoSetCover = !existing.coverStoragePath && parsed.data.photos.length > 0;
    const newCoverPath = shouldAutoSetCover
      ? parsed.data.photos[0]!.storagePath
      : existing.coverStoragePath;

    await db
      .update(newsPosts)
      .set({
        photos: parsed.data.photos,
        coverStoragePath: newCoverPath,
        updatedAt: new Date(),
      })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.gallery_updated',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      metadata: {
        added,
        removed,
        photoCount: parsed.data.photos.length,
        autoCoverSet: shouldAutoSetCover,
        slug: existing.slug,
      },
    });

    revalidateNewsRoutes(parsed.data.postId, existing.slug, existing.status === 'published');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update gallery.', 'E_UNKNOWN');
  }
}

export async function updateNewsPostCover(raw: unknown): Promise<Result<void>> {
  const parsed = updateNewsPostCoverSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ authorId: newsPosts.authorId, status: newsPosts.status, slug: newsPosts.slug })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.tenantId, tenantId),
          eq(newsPosts.id, parsed.data.postId),
          isNull(newsPosts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Post not found.', 'E_NOT_FOUND');

    const isAuthor = existing.authorId === ctx.userId;
    const isEditor = hasPublishRole(ctx.profile.role);
    if (!isAuthor && !isEditor) {
      return err('You can only update covers on your own posts.', 'E_FORBIDDEN');
    }

    const result = await db
      .update(newsPosts)
      .set({ coverStoragePath: parsed.data.storagePath, updatedAt: new Date() })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .returning({ id: newsPosts.id });
    if (result.length === 0) return err('Post not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news.cover_uploaded',
      category: NEWS_AUDIT_CATEGORY,
      targetType: 'news_post',
      targetId: parsed.data.postId,
      metadata: {
        storagePath: parsed.data.storagePath,
        byteSize: parsed.data.byteSize ?? null,
        slug: existing.slug,
      },
    });

    revalidateNewsRoutes(parsed.data.postId, existing.slug, existing.status === 'published');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update cover.', 'E_UNKNOWN');
  }
}
