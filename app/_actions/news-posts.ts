'use server';

import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { newsPosts } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  createNewsPostSchema,
  publishNewsPostSchema,
  updateNewsPostSchema,
} from '@/lib/validators/news-post';

const AUTHOR_ROLES = ['secretary', 'vice_mayor', 'mayor', 'sb_member'] as const;
const PUBLISH_ROLES = ['secretary', 'vice_mayor', 'mayor'] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export async function createNewsPost(raw: unknown): Promise<Result<{ id: string; slug: string }>> {
  const parsed = createNewsPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!AUTHOR_ROLES.includes(ctx.profile.role as (typeof AUTHOR_ROLES)[number])) {
    return err('You do not have permission to author news posts.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const slug = slugify(parsed.data.title);
    const status =
      parsed.data.publishImmediately &&
      PUBLISH_ROLES.includes(ctx.profile.role as (typeof PUBLISH_ROLES)[number])
        ? 'published'
        : parsed.data.scheduledAt
          ? 'scheduled'
          : 'draft';

    const [row] = await db
      .insert(newsPosts)
      .values({
        tenantId,
        slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? null,
        bodyMdx: parsed.data.bodyMdx,
        category: parsed.data.category,
        status,
        visibility: parsed.data.visibility,
        pinned: parsed.data.pinned,
        tags: parsed.data.tags,
        coverStoragePath: parsed.data.coverStoragePath ?? null,
        publishedAt: status === 'published' ? new Date() : null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        authorId: ctx.userId,
      })
      .returning({ id: newsPosts.id, slug: newsPosts.slug });

    if (!row) return err('Failed to create post.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news_post.created',
      category: 'system',
      targetType: 'news_post',
      targetId: row.id,
      metadata: { title: parsed.data.title, status },
    });

    revalidatePath('/admin/news');
    if (status === 'published' && parsed.data.visibility === 'public') {
      revalidatePath('/news');
      revalidatePath('/');
    }
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
      .select({ authorId: newsPosts.authorId })
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
    const isEditor = ['secretary', 'vice_mayor', 'mayor'].includes(ctx.profile.role);
    if (!isAuthor && !isEditor) {
      return err('You can only edit your own posts.', 'E_FORBIDDEN');
    }

    const result = await db
      .update(newsPosts)
      .set({
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? null,
        bodyMdx: parsed.data.bodyMdx,
        category: parsed.data.category,
        visibility: parsed.data.visibility,
        pinned: parsed.data.pinned,
        tags: parsed.data.tags,
        coverStoragePath: parsed.data.coverStoragePath ?? null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .returning({ id: newsPosts.id });

    if (result.length === 0) return err('Post not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news_post.updated',
      category: 'system',
      targetType: 'news_post',
      targetId: parsed.data.postId,
      metadata: { title: parsed.data.title },
    });

    revalidatePath('/admin/news');
    revalidatePath('/news');
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
  if (!PUBLISH_ROLES.includes(ctx.profile.role as (typeof PUBLISH_ROLES)[number])) {
    return err('You do not have permission to publish.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const publishedAt = new Date();
    const result = await db
      .update(newsPosts)
      .set({ status: 'published', publishedAt, updatedAt: publishedAt })
      .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, parsed.data.postId)))
      .returning({ id: newsPosts.id });

    if (result.length === 0) return err('Post not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'news_post.published',
      category: 'system',
      targetType: 'news_post',
      targetId: parsed.data.postId,
      metadata: { publishedAt: publishedAt.toISOString() },
    });

    revalidatePath('/admin/news');
    revalidatePath('/news');
    revalidatePath('/');
    return ok({ publishedAt: publishedAt.toISOString() });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to publish post.', 'E_UNKNOWN');
  }
}
