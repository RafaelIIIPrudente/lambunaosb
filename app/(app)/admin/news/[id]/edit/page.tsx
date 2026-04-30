import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';

import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { newsPosts } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';

import { CoverSection } from './_cover-section';
import { NewsEditorForm } from './_form';
import { GallerySection } from './_gallery-section';

export const metadata = { title: 'Edit news post' };

const COVER_BUCKET = 'news-covers';
const GALLERY_BUCKET = 'news-galleries';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PUBLISH_ROLES = ['secretary', 'vice_mayor', 'mayor'] as const;

export default async function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  const tenantId = await getCurrentTenantId();
  const [post] = await db
    .select()
    .from(newsPosts)
    .where(and(eq(newsPosts.tenantId, tenantId), eq(newsPosts.id, id), isNull(newsPosts.deletedAt)))
    .limit(1);
  if (!post) notFound();

  const isAuthor = post.authorId === ctx.userId;
  const isEditor = (PUBLISH_ROLES as readonly string[]).includes(ctx.profile.role);
  if (!isAuthor && !isEditor) notFound();

  const adminClient = createAdminClient();

  const [signedDownloadUrl, galleryPhotos] = await Promise.all([
    post.coverStoragePath
      ? adminClient.storage
          .from(COVER_BUCKET)
          .createSignedUrl(post.coverStoragePath, SIGNED_URL_TTL_SECONDS)
          .then((res) => res.data?.signedUrl ?? null)
      : Promise.resolve(null),
    Promise.all(
      post.photos.map(async (p) => {
        const { data } = await adminClient.storage
          .from(GALLERY_BUCKET)
          .createSignedUrl(p.storagePath, SIGNED_URL_TTL_SECONDS);
        return {
          storagePath: p.storagePath,
          altText: p.altText,
          byteSize: p.byteSize,
          signedUrl: data?.signedUrl,
        };
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
        <Link href={`/admin/news/${post.id}`} className="hover:text-rust">
          {post.title}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Edit</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-ink font-script text-3xl leading-tight">Edit post</h1>
        <p className="text-ink-soft mt-1 text-sm italic">{post.title}</p>
      </header>

      <div className="flex flex-col gap-6">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside>
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
            initialValues={{
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt ?? '',
              bodyMdx: post.bodyMdx,
              category: post.category,
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
