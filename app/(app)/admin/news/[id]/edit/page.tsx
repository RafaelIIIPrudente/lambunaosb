import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';

import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getCommittees } from '@/lib/db/queries/committees';
import { FALLBACK_TENANT, getCurrentTenantId } from '@/lib/db/queries/tenant';
import { newsPosts } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

import { CoverSection } from './_cover-section';
import { NewsEditorForm } from './_form';
import { GallerySection } from './_gallery-section';

export const metadata = { title: 'Edit news post' };

const PUBLISH_ROLES = ['secretary', 'vice_mayor', 'mayor'] as const;

export default async function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  const tenantId = await safeBuildtimeQuery(() => getCurrentTenantId(), FALLBACK_TENANT.id);
  const post = await safeBuildtimeQuery(
    () =>
      db
        .select()
        .from(newsPosts)
        .where(
          and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, id), isNull(newsPosts.deletedAt)),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
    null,
  );
  if (!post) notFound();

  const isAuthor = post.authorId === ctx.userId;
  const isEditor = (PUBLISH_ROLES as readonly string[]).includes(ctx.profile.role);
  if (!isAuthor && !isEditor) notFound();

  const adminClient = createAdminClient();

  const [signedDownloadUrl, galleryPhotos, committees] = await Promise.all([
    getCompressedImageUrl({
      supabase: adminClient,
      bucket: 'news-covers',
      prefix: post.coverStoragePath,
      size: pickSizeForSurface('inline'),
    }),
    Promise.all(
      post.photos.map(async (p) => {
        const url = await getCompressedImageUrl({
          supabase: adminClient,
          bucket: 'news-galleries',
          prefix: p.storagePath,
          size: pickSizeForSurface('inline'),
        });
        return {
          storagePath: p.storagePath,
          altText: p.altText,
          byteSize: p.byteSize,
          signedUrl: url ?? undefined,
        };
      }),
    ),
    safeBuildtimeQuery(() => getCommittees(), []),
  ]);

  const committeeOptions = committees.map((c) => ({
    id: c.id,
    label: c.name,
    isStanding: c.isStanding,
  }));

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-2 flex flex-wrap items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/news" className="hover:text-rust">
          News
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
        <Link href={`/admin/news/${post.id}`} className="hover:text-rust min-w-0 break-words">
          {post.title}
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
        <span className="text-ink">Edit</span>
      </nav>

      <header className="mb-6 min-w-0">
        <h1 className="text-ink font-script text-3xl leading-tight break-words">Edit post</h1>
        <p className="text-ink-soft mt-1 text-sm break-words italic">{post.title}</p>
      </header>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="min-w-0">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Cover image
            </p>
            <CoverSection
              postId={post.id}
              tenantId={tenantId}
              title={post.title}
              coverStoragePath={post.coverStoragePath}
              signedDownloadUrl={signedDownloadUrl}
              canUpload={isAuthor || isEditor}
            />
          </aside>

          <NewsEditorForm
            postId={post.id}
            slugLocked={post.status === 'published'}
            committeeOptions={committeeOptions}
            initialValues={{
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt ?? '',
              bodyMdx: post.bodyMdx,
              category: post.category,
              committeeId: post.committeeId,
              visibility: post.visibility,
              pinned: post.pinned,
              tags: post.tags,
            }}
          />
        </div>

        <section className="border-ink/15 rounded-md border p-5">
          <header className="mb-4">
            <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Photo gallery
            </p>
            <p className="text-ink-soft mt-1 text-xs italic">
              Up to 15 photos. The first photo becomes the cover automatically if no cover is set.
            </p>
          </header>
          <GallerySection
            postId={post.id}
            tenantId={tenantId}
            initialPhotos={galleryPhotos}
            canEdit={isAuthor || isEditor}
          />
        </section>
      </div>
    </div>
  );
}
