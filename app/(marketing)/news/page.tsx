import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { getPublishedNews, type NewsCategory } from '@/lib/db/queries/news';
import { getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSignedStorageUrl } from '@/lib/supabase/signed-urls';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as NewsCategory[];

const FILTER_BASE_CLASS =
  'font-script rounded-pill inline-flex h-9 items-center border px-4 text-sm transition-colors';
const FILTER_ACTIVE_CLASS = 'bg-ink text-paper border-ink';
const FILTER_INACTIVE_CLASS = 'border-ink/30 text-ink hover:border-ink';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const title = `News · ${tenant.displayName}`;
  const description = `Bulletins, public hearings, and announcements from ${tenant.displayName}.`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: '/news' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/news',
      siteName: tenant.displayName,
      title,
      description,
      images: [
        {
          url: '/seal/lamb-logo.png',
          width: 1024,
          height: 1024,
          alt: `Official seal of the Municipality of Lambunao, Province of ${tenant.province}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/seal/lamb-logo.png'],
    },
  };
}

function isNewsCategory(value: string): value is NewsCategory {
  return value in CATEGORY_LABELS;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const category = rawCategory && isNewsCategory(rawCategory) ? rawCategory : undefined;

  const [items, tenant] = await Promise.all([getPublishedNews({ category }), getCurrentTenant()]);

  const supabase = createAdminClient();
  const coverUrls = await Promise.all(
    items.map((post) => createSignedStorageUrl(supabase, 'news-covers', post.coverStoragePath)),
  );
  const coverByPostId = new Map<string, string>();
  items.forEach((post, i) => {
    const url = coverUrls[i];
    if (url) coverByPostId.set(post.id, url);
  });

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `News from ${tenant.displayName}`,
    itemListElement: items.map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/news/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
        <header className="mb-10">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Bulletin
          </p>
          <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
            News &amp; Updates
          </h1>
        </header>

        <div role="group" aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
          <Link
            href="/news"
            aria-current={!category ? 'page' : undefined}
            className={`${FILTER_BASE_CLASS} ${!category ? FILTER_ACTIVE_CLASS : FILTER_INACTIVE_CLASS}`}
          >
            All
          </Link>
          {CATEGORY_KEYS.map((key) => {
            const isActive = key === category;
            return (
              <Link
                key={key}
                href={`/news?category=${key}`}
                aria-current={isActive ? 'page' : undefined}
                className={`${FILTER_BASE_CLASS} ${isActive ? FILTER_ACTIVE_CLASS : FILTER_INACTIVE_CLASS}`}
              >
                {CATEGORY_LABELS[key]}
              </Link>
            );
          })}
        </div>

        {items.length === 0 ? (
          <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
            <p className="text-ink-soft font-script text-lg">
              No posts in this category yet. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-8 lg:grid-cols-2">
              {items.map((post) => {
                const coverUrl = coverByPostId.get(post.id);
                return (
                  <li key={post.id}>
                    <article className="border-ink/30 hover:border-ink/50 hover:shadow-e1 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-6 transition-all">
                      <Link
                        href={`/news/${post.slug}`}
                        className="focus-visible:ring-rust block focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {coverUrl ? (
                          <div className="bg-paper-2 relative aspect-[16/9] w-full overflow-hidden rounded-md">
                            <Image
                              src={coverUrl}
                              alt={`Cover image for ${post.title}`}
                              fill
                              loading="lazy"
                              sizes="(min-width: 1024px) 480px, 100vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <ImagePlaceholder ratio="16:9" />
                        )}
                      </Link>
                      <div className="flex flex-col gap-3 px-1">
                        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                          {CATEGORY_LABELS[post.category]}
                        </p>
                        <h2 className="text-ink font-display text-2xl leading-snug font-semibold">
                          <Link href={`/news/${post.slug}`} className="hover:text-rust">
                            {post.title}
                          </Link>
                        </h2>
                        <p className="text-ink-faint font-mono text-xs">
                          {format(new Date(post.publishedAt), 'd MMM yyyy')} ·{' '}
                          {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: false })}{' '}
                          ago
                        </p>
                        {post.excerpt && (
                          <p className="text-ink-soft font-script text-base italic">
                            {post.excerpt}
                          </p>
                        )}
                        <Link
                          href={`/news/${post.slug}`}
                          className="border-ink/30 text-ink hover:border-ink hover:bg-paper-2 font-script rounded-pill mt-2 inline-flex h-9 w-fit items-center gap-1.5 border border-dashed px-4 text-sm transition-colors"
                        >
                          Read more
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            {items.length === 24 && (
              <p className="text-ink-faint mt-10 font-mono text-xs italic">
                Showing latest 24 posts. Older posts will be reachable via pagination.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
