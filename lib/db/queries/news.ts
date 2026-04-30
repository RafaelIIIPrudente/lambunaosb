import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { newsPosts, type NewsPost, profiles } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type NewsCategory = NewsPost['category'];
export type NewsStatus = NewsPost['status'];
export type NewsVisibility = NewsPost['visibility'];

export type NewsCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: NewsCategory;
  publishedAt: Date;
  author: string;
  coverStoragePath: string | null;
};

export type NewsPostDetail = NewsCardData & {
  bodyMdx: string;
  visibility: NewsVisibility;
  status: NewsStatus;
};

export type GetPublishedNewsOptions = {
  limit?: number;
  category?: NewsCategory;
};

export async function getPublishedNews(
  options: GetPublishedNewsOptions = {},
): Promise<NewsCardData[]> {
  const tenantId = await getCurrentTenantId();
  const conditions = [
    eq(newsPosts.tenantId, tenantId),
    eq(newsPosts.status, 'published'),
    eq(newsPosts.visibility, 'public'),
    isNull(newsPosts.deletedAt),
  ];
  if (options.category) {
    conditions.push(eq(newsPosts.category, options.category));
  }

  const baseQuery = db
    .select({
      id: newsPosts.id,
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      category: newsPosts.category,
      publishedAt: newsPosts.publishedAt,
      coverStoragePath: newsPosts.coverStoragePath,
      authorName: profiles.fullName,
    })
    .from(newsPosts)
    .leftJoin(profiles, eq(profiles.id, newsPosts.authorId))
    .where(and(...conditions))
    .orderBy(desc(newsPosts.publishedAt));

  const rows = await (options.limit ? baseQuery.limit(options.limit) : baseQuery);

  return rows.flatMap((row) =>
    row.publishedAt
      ? [
          {
            id: row.id,
            slug: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            category: row.category,
            publishedAt: row.publishedAt,
            coverStoragePath: row.coverStoragePath,
            author: row.authorName ?? 'Office of the Secretary',
          },
        ]
      : [],
  );
}

export async function getFeaturedNews(limit = 3): Promise<NewsCardData[]> {
  return getPublishedNews({ limit });
}

export async function getNewsBySlug(slug: string): Promise<NewsPostDetail | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      id: newsPosts.id,
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      bodyMdx: newsPosts.bodyMdx,
      category: newsPosts.category,
      status: newsPosts.status,
      visibility: newsPosts.visibility,
      publishedAt: newsPosts.publishedAt,
      coverStoragePath: newsPosts.coverStoragePath,
      authorName: profiles.fullName,
    })
    .from(newsPosts)
    .leftJoin(profiles, eq(profiles.id, newsPosts.authorId))
    .where(
      and(
        eq(newsPosts.tenantId, tenantId),
        eq(newsPosts.slug, slug),
        eq(newsPosts.status, 'published'),
        eq(newsPosts.visibility, 'public'),
        isNull(newsPosts.deletedAt),
      ),
    )
    .limit(1);

  if (!row || !row.publishedAt) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyMdx: row.bodyMdx,
    category: row.category,
    status: row.status,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    coverStoragePath: row.coverStoragePath,
    author: row.authorName ?? 'Office of the Secretary',
  };
}

export async function getAllPublishedNewsSlugs(): Promise<{ slug: string }[]> {
  const tenantId = await getCurrentTenantId();
  return db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(
      and(
        eq(newsPosts.tenantId, tenantId),
        eq(newsPosts.status, 'published'),
        eq(newsPosts.visibility, 'public'),
        isNull(newsPosts.deletedAt),
      ),
    );
}

export type AdminNewsRowData = {
  id: string;
  title: string;
  excerpt: string | null;
  bodyMdx: string;
  category: NewsCategory;
  status: NewsStatus;
  visibility: NewsVisibility;
  pinned: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  authorName: string;
  coverStoragePath: string | null;
};

export async function getAdminNewsList(): Promise<AdminNewsRowData[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      bodyMdx: newsPosts.bodyMdx,
      category: newsPosts.category,
      status: newsPosts.status,
      visibility: newsPosts.visibility,
      pinned: newsPosts.pinned,
      publishedAt: newsPosts.publishedAt,
      scheduledAt: newsPosts.scheduledAt,
      coverStoragePath: newsPosts.coverStoragePath,
      authorName: profiles.fullName,
    })
    .from(newsPosts)
    .leftJoin(profiles, eq(profiles.id, newsPosts.authorId))
    .where(and(eq(newsPosts.tenantId, tenantId), isNull(newsPosts.deletedAt)))
    .orderBy(desc(newsPosts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    bodyMdx: row.bodyMdx,
    category: row.category,
    status: row.status,
    visibility: row.visibility,
    pinned: row.pinned,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    coverStoragePath: row.coverStoragePath,
    authorName: row.authorName ?? 'Office of the Secretary',
  }));
}
