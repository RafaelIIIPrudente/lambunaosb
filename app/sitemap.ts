import type { MetadataRoute } from 'next';
import { and, eq, isNull } from 'drizzle-orm';

import { env } from '@/env';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { newsPosts, sbMembers } from '@/lib/db/schema';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();

  const [publishedNews, publicMembers] = await Promise.all([
    safeBuildtimeQuery(
      async () => {
        const tenantId = await getCurrentTenantId();
        return db
          .select({ slug: newsPosts.slug, updatedAt: newsPosts.updatedAt })
          .from(newsPosts)
          .where(
            and(
              eq(newsPosts.tenantId, tenantId),
              eq(newsPosts.status, 'published'),
              eq(newsPosts.visibility, 'public'),
              isNull(newsPosts.deletedAt),
            ),
          );
      },
      [] as { slug: string; updatedAt: Date }[],
    ),
    safeBuildtimeQuery(
      async () => {
        const tenantId = await getCurrentTenantId();
        return db
          .select({ id: sbMembers.id, updatedAt: sbMembers.updatedAt })
          .from(sbMembers)
          .where(
            and(
              eq(sbMembers.tenantId, tenantId),
              eq(sbMembers.active, true),
              eq(sbMembers.showOnPublic, true),
              isNull(sbMembers.deletedAt),
            ),
          );
      },
      [] as { id: string; updatedAt: Date }[],
    ),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/members`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/committees`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    {
      url: `${baseUrl}/submit-query`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const newsEntries: MetadataRoute.Sitemap = publishedNews.map((p) => ({
    url: `${baseUrl}/news/${p.slug}`,
    lastModified: p.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const memberEntries: MetadataRoute.Sitemap = publicMembers.map((m) => ({
    url: `${baseUrl}/members/${m.id}`,
    lastModified: m.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...newsEntries, ...memberEntries];
}
