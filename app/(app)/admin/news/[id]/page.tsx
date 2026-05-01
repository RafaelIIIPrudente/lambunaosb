import 'server-only';

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { format } from 'date-fns';
import { ChevronRight, ImageIcon, Pin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { FALLBACK_TENANT, getCurrentTenantId } from '@/lib/db/queries/tenant';
import { committees, newsPosts, profiles } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';
import {
  NEWS_CATEGORY_LABELS,
  NEWS_STATUS_LABELS,
  NEWS_VISIBILITY_LABELS,
} from '@/lib/validators/news-post';

import { NewsActionsBar } from './_actions-bar';

export const metadata = { title: 'News post' };

const STATUS_BADGE_VARIANT = {
  draft: 'warn',
  scheduled: 'outline',
  published: 'success',
  archived: 'destructive',
} as const;

export default async function NewsPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const tenantId = await safeBuildtimeQuery(() => getCurrentTenantId(), FALLBACK_TENANT.id);

  const row = await safeBuildtimeQuery(
    () =>
      db
        .select({
          post: newsPosts,
          authorName: profiles.fullName,
          committeeName: committees.name,
        })
        .from(newsPosts)
        .leftJoin(profiles, eq(profiles.id, newsPosts.authorId))
        .leftJoin(committees, eq(committees.id, newsPosts.committeeId))
        .where(
          and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, id), isNull(newsPosts.deletedAt)),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
    null,
  );
  if (!row) notFound();

  const post = row.post;
  const author = row.authorName ?? 'Office of the Secretary';
  const committeeName = row.committeeName;

  const adminClient = createAdminClient();
  const [signedDownloadUrl, gallerySignedUrls] = await Promise.all([
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
        return { storagePath: p.storagePath, altText: p.altText, signedUrl: url ?? undefined };
      }),
    ),
  ]);

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-2 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/news" className="hover:text-rust">
          News
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink line-clamp-1">{post.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-ink font-script text-3xl leading-tight">{post.title}</h1>
        {post.excerpt && <p className="text-ink-soft mt-2 text-base italic">{post.excerpt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[post.status]}>
            {NEWS_STATUS_LABELS[post.status]}
          </Badge>
          <Badge variant="outline">{NEWS_VISIBILITY_LABELS[post.visibility]}</Badge>
          <Badge variant="outline">{NEWS_CATEGORY_LABELS[post.category]}</Badge>
          {post.pinned && (
            <Badge variant="success" className="inline-flex items-center gap-1">
              <Pin className="size-3" aria-hidden="true" />
              Pinned
            </Badge>
          )}
        </div>
      </header>

      <div className="mb-6">
        <NewsActionsBar
          postId={post.id}
          slug={post.slug}
          status={post.status}
          visibility={post.visibility}
          userRole={ctx.profile.role}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <article className="border-ink/15 overflow-hidden rounded-md border">
            <div className="bg-paper-2 relative flex h-64 w-full items-center justify-center sm:h-80 lg:h-96">
              {signedDownloadUrl ? (
                <Image
                  src={signedDownloadUrl}
                  alt={`Cover image for ${post.title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="text-ink-faint size-8" aria-hidden="true" />
                  <span className="text-ink-faint font-mono text-[11px]">No cover uploaded</span>
                </div>
              )}
            </div>
          </article>

          <article className="border-ink/15 rounded-md border p-6">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Body
            </p>
            <div className="text-ink prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
              {post.bodyMdx}
            </div>
          </article>

          {post.photos.length > 0 && (
            <article className="border-ink/15 rounded-md border p-6">
              <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Photo gallery · {post.photos.length} {post.photos.length === 1 ? 'photo' : 'photos'}
              </p>
              <ol className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {gallerySignedUrls.map((p, i) => (
                  <li key={p.storagePath}>
                    <figure className="border-ink/15 flex flex-col gap-2 rounded-md border p-2">
                      <div className="bg-paper-2 relative aspect-video w-full overflow-hidden rounded">
                        {p.signedUrl ? (
                          <Image
                            src={p.signedUrl}
                            alt={p.altText ?? `Photo ${i + 1}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="text-ink-faint flex h-full items-center justify-center font-mono text-[11px]">
                            (preview unavailable)
                          </div>
                        )}
                      </div>
                      {p.altText && (
                        <figcaption className="text-ink-soft text-xs italic">
                          {p.altText}
                        </figcaption>
                      )}
                    </figure>
                  </li>
                ))}
              </ol>
            </article>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata
            </p>
            <dl className="text-ink-soft grid grid-cols-[100px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Author</dt>
              <dd>{author}</dd>
              <dt className="text-ink-faint">Slug</dt>
              <dd className="font-mono break-all">{post.slug}</dd>
              <dt className="text-ink-faint">Category</dt>
              <dd>{NEWS_CATEGORY_LABELS[post.category]}</dd>
              {committeeName && (
                <>
                  <dt className="text-ink-faint">Committee</dt>
                  <dd>{committeeName}</dd>
                </>
              )}
              <dt className="text-ink-faint">Created</dt>
              <dd className="font-mono">{format(post.createdAt, 'MMM d, yyyy · h:mm a')}</dd>
              {post.publishedAt && (
                <>
                  <dt className="text-ink-faint">Published</dt>
                  <dd className="font-mono">{format(post.publishedAt, 'MMM d, yyyy · h:mm a')}</dd>
                </>
              )}
              <dt className="text-ink-faint">Updated</dt>
              <dd className="font-mono">{format(post.updatedAt, 'MMM d, yyyy · h:mm a')}</dd>
            </dl>
          </section>

          {post.tags.length > 0 && (
            <section className="border-ink/15 rounded-md border p-5">
              <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Tags
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
