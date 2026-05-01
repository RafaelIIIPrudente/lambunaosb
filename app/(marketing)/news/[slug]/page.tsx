import 'server-only';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { NewsCarousel } from '@/components/marketing/news-carousel';
import { NewsSharePrint } from '@/components/marketing/news-share-print';
import { env } from '@/env';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getAllPublishedNewsSlugs, getNewsBySlug, type NewsCategory } from '@/lib/db/queries/news';
import { FALLBACK_TENANT, getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

const DESCRIPTION_MAX = 140;

export async function generateStaticParams() {
  return safeBuildtimeQuery(() => getAllPublishedNewsSlugs(), []);
}

function summarizeBody(md: string): string {
  const stripped = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length === 0) return '';
  if (stripped.length <= DESCRIPTION_MAX) return stripped;
  return `${stripped.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

function computeInitials(author: string): string {
  return author
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, tenant] = await Promise.all([
    safeBuildtimeQuery(() => getNewsBySlug(slug), null),
    safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT),
  ]);
  if (!post) {
    return {
      title: `Post not found · ${tenant.displayName}`,
      robots: { index: false, follow: false },
    };
  }

  const description = post.excerpt?.trim() || summarizeBody(post.bodyMdx) || tenant.displayName;
  const title = `${post.title} · ${tenant.displayName}`;

  const supabase = createAdminClient();
  const coverUrl = await getCompressedImageUrl({
    supabase,
    bucket: 'news-covers',
    prefix: post.coverStoragePath,
    size: pickSizeForSurface('hero-desktop'),
  });

  const ogImage = coverUrl
    ? { url: coverUrl, width: 1200, height: 630, alt: `Cover image for ${post.title}` }
    : {
        url: '/seal/lamb-logo.png',
        width: 1024,
        height: 1024,
        alt: `Official seal of the Municipality of Lambunao, Province of ${tenant.province}`,
      };

  return {
    title,
    description,
    alternates: { canonical: `/news/${slug}` },
    openGraph: {
      type: 'article',
      locale: 'en_PH',
      url: `/news/${slug}`,
      siteName: tenant.displayName,
      title,
      description,
      publishedTime: post.publishedAt.toISOString(),
      authors: [post.author],
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await safeBuildtimeQuery(() => getNewsBySlug(slug), null);
  if (!post) notFound();

  const supabase = createAdminClient();
  const [coverUrl, photoUrls] = await Promise.all([
    getCompressedImageUrl({
      supabase,
      bucket: 'news-covers',
      prefix: post.coverStoragePath,
      size: pickSizeForSurface('hero-desktop'),
    }),
    Promise.all(
      post.photos.map((photo) =>
        getCompressedImageUrl({
          supabase,
          bucket: 'news-galleries',
          prefix: photo.storagePath,
          size: pickSizeForSurface('inline'),
        }),
      ),
    ),
  ]);
  const carouselImages: { url: string; alt: string; isCover: boolean }[] = [
    ...(coverUrl
      ? [{ url: coverUrl, alt: `Cover image for ${post.title}`, isCover: true as const }]
      : []),
    ...post.photos
      .map((photo, i) => {
        const url = photoUrls[i];
        if (!url) return null;
        return {
          url,
          alt: photo.altText ?? `Photo ${i + 1} for ${post.title}`,
          isCover: false as const,
        };
      })
      .filter((entry): entry is { url: string; alt: string; isCover: false } => entry !== null),
  ];

  const wordCount = post.bodyMdx.split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  const initials = computeInitials(post.author);

  const description = post.excerpt?.trim() || summarizeBody(post.bodyMdx) || post.title;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description,
    image: coverUrl ?? `${SITE_URL}/seal/lamb-logo.png`,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@id': `${SITE_URL}#organization` },
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.publishedAt.toISOString(),
    articleSection: CATEGORY_LABELS[post.category],
    url: `${SITE_URL}/news/${slug}`,
    inLanguage: 'en',
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${SITE_URL}/news` },
      { '@type': 'ListItem', position: 3, name: CATEGORY_LABELS[post.category] },
    ],
  };

  const hasBody = post.bodyMdx.trim().length > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <article className="mx-auto w-full max-w-[860px] px-4 pt-28 pb-16 sm:px-8 md:pt-36 md:pb-24">
        <Stagger as="div">
          <StaggerItem>
            <nav aria-label="Breadcrumb" className="mb-10">
              <ol className="text-ink-faint flex items-center gap-2 font-mono text-xs">
                <li>
                  <Link href="/" className="hover:text-rust">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3" />
                </li>
                <li>
                  <Link href="/news" className="hover:text-rust">
                    News
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3" />
                </li>
                <li
                  className="text-rust font-semibold tracking-[0.12em] uppercase"
                  aria-current="page"
                >
                  {CATEGORY_LABELS[post.category]}
                </li>
              </ol>
            </nav>
          </StaggerItem>

          <StaggerItem>
            <p className="text-rust mb-4 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
              {CATEGORY_LABELS[post.category]}
            </p>
            <h1 className="text-ink font-display text-4xl leading-[1.05] font-bold tracking-tight md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-navy-primary font-display mt-6 max-w-[55ch] text-xl leading-relaxed italic md:text-2xl">
                {post.excerpt}
              </p>
            )}
          </StaggerItem>

          <StaggerItem className="border-ink/15 mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {initials && (
                <span
                  aria-hidden="true"
                  className="bg-paper-2 border-ink/20 text-ink font-script mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-sm"
                >
                  {initials}
                </span>
              )}
              <div className="flex flex-col leading-tight">
                <span className="font-script text-ink text-base">{post.author}</span>
                <span className="text-ink-faint mt-0.5 font-mono text-[11px]">
                  Posted {format(new Date(post.publishedAt), 'MMM d, yyyy')} · {readingMinutes} min
                  read
                </span>
              </div>
            </div>

            <NewsSharePrint title={post.title} url={`${SITE_URL}/news/${slug}`} />
          </StaggerItem>

          <StaggerItem className="mt-10">
            {carouselImages.length > 0 ? (
              <NewsCarousel images={carouselImages} title={post.title} />
            ) : (
              <ImagePlaceholder ratio="16:9" label="No photos available" />
            )}
          </StaggerItem>
        </Stagger>

        {hasBody ? (
          <FadeUp
            as="div"
            className="text-navy-primary font-display prose-news mt-12 flex flex-col gap-6 text-xl leading-relaxed italic md:text-[22px]"
          >
            <MDXRemote
              source={post.bodyMdx}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </FadeUp>
        ) : post.excerpt ? (
          <FadeUp
            as="p"
            className="text-navy-primary font-display mt-10 text-lg leading-relaxed italic"
          >
            {post.excerpt}
          </FadeUp>
        ) : null}
      </article>
    </>
  );
}
