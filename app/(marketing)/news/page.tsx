import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { PageHero } from '@/components/marketing/page-hero';
import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { cn } from '@/lib/utils';
import { getPublishedNews, type NewsCategory } from '@/lib/db/queries/news';
import { getCurrentTenant } from '@/lib/db/queries/tenant';
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

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as NewsCategory[];

const FILTER_BASE_CLASS =
  'font-script rounded-pill inline-flex h-10 items-center border px-5 text-base transition-colors';
const FILTER_ACTIVE_CLASS = 'bg-ink text-paper border-ink';
const FILTER_INACTIVE_CLASS = 'border-ink/30 text-ink hover:border-ink hover:bg-paper-2';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const title = `News · ${tenant.displayName}`;
  const description = `Bulletins, public hearings, and announcements from ${tenant.displayName}.`;
  return {
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
    items.map((post) =>
      getCompressedImageUrl({
        supabase,
        bucket: 'news-covers',
        prefix: post.coverStoragePath,
        size: pickSizeForSurface('thumb'),
      }),
    ),
  );
  const coverByPostId = new Map<string, string>();
  items.forEach((post, i) => {
    const url = coverUrls[i];
    if (url) coverByPostId.set(post.id, url);
  });

  const [leadPost, ...restPosts] = items;

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

      <PageHero
        src="/lambunao/cec-infocenter.png"
        alt="The Citizens Engagement Center of Lambunao"
        eyebrow="Bulletin"
        title={
          <>
            News &amp; <em className="font-display italic">updates</em>.
          </>
        }
        lede="Public hearings, ordinances, ceremonies, and the small announcements that make up the working life of the council."
        caption="Citizens Engagement Center · Lambunao"
      />

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-8 md:py-24">
          <FadeUp as="div" className="mb-12">
            <p className="text-rust mb-4 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              <span className="bg-gold mr-3 inline-block h-px w-6 align-middle" />
              Filter by section
            </p>
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
              <Link
                href="/news"
                aria-current={!category ? 'page' : undefined}
                className={cn(
                  FILTER_BASE_CLASS,
                  !category ? FILTER_ACTIVE_CLASS : FILTER_INACTIVE_CLASS,
                )}
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
                    className={cn(
                      FILTER_BASE_CLASS,
                      isActive ? FILTER_ACTIVE_CLASS : FILTER_INACTIVE_CLASS,
                    )}
                  >
                    {CATEGORY_LABELS[key]}
                  </Link>
                );
              })}
            </div>
          </FadeUp>

          {items.length === 0 ? (
            <div className="border-ink/15 bg-paper-2 rounded-md border p-12 text-center">
              <p className="text-ink-soft font-script text-2xl">
                No posts in this category yet. Check back soon.
              </p>
            </div>
          ) : (
            <>
              {/* LEAD STORY — full-width editorial cover */}
              {leadPost && !category && (
                <FadeUp as="article" className="border-ink/15 mb-16 border-b pb-16">
                  <Link
                    href={`/news/${leadPost.slug}`}
                    className="group/lead focus-visible:ring-rust grid gap-8 focus-visible:ring-2 focus-visible:outline-none lg:grid-cols-[1.3fr_1fr] lg:gap-12"
                  >
                    {coverByPostId.get(leadPost.id) ? (
                      <div className="bg-paper-2 border-ink/15 relative aspect-[16/10] w-full overflow-hidden rounded-md border">
                        <Image
                          src={coverByPostId.get(leadPost.id)!}
                          alt={`Cover image for ${leadPost.title}`}
                          fill
                          priority
                          sizes="(min-width: 1024px) 720px, 100vw"
                          className="object-cover transition-transform duration-700 group-hover/lead:scale-[1.015]"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <ImagePlaceholder ratio="16:9" />
                    )}
                    <div className="flex flex-col justify-center gap-4">
                      <p className="text-rust font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                        <span className="bg-gold mr-3 inline-block h-px w-6 align-middle" />
                        Lead · {CATEGORY_LABELS[leadPost.category]}
                      </p>
                      <h2 className="text-ink font-display group-hover/lead:text-rust max-w-[20ch] text-4xl leading-tight font-bold tracking-tight md:text-5xl">
                        {leadPost.title}
                      </h2>
                      {leadPost.excerpt && (
                        <p className="text-navy-primary font-display max-w-[55ch] text-lg leading-relaxed italic md:text-xl">
                          {leadPost.excerpt}
                        </p>
                      )}
                      <p className="text-ink-faint font-mono text-xs">
                        {format(new Date(leadPost.publishedAt), 'd MMMM yyyy')} ·{' '}
                        {formatDistanceToNow(new Date(leadPost.publishedAt), { addSuffix: true })}
                      </p>
                      <span className="font-script text-ink group-hover/lead:text-rust gold-underline mt-2 inline-flex w-fit items-center gap-1.5 text-lg">
                        Read the full story
                        <ArrowRight className="size-4 transition-transform group-hover/lead:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </FadeUp>
              )}

              {/* GRID */}
              <Stagger as="ul" className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {(category ? items : restPosts).map((post) => {
                  const coverUrl = coverByPostId.get(post.id);
                  return (
                    <StaggerItem as="li" key={post.id}>
                      <article className="flex h-full flex-col gap-4">
                        <Link
                          href={`/news/${post.slug}`}
                          className="group/news focus-visible:ring-rust block focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {coverUrl ? (
                            <div className="bg-paper-2 border-ink/15 relative aspect-[4/3] w-full overflow-hidden rounded-md border">
                              <Image
                                src={coverUrl}
                                alt={`Cover image for ${post.title}`}
                                fill
                                loading="lazy"
                                sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                                className="object-cover transition-transform duration-500 group-hover/news:scale-[1.03]"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <ImagePlaceholder ratio="4:3" />
                          )}
                          <div className="mt-5 flex flex-col gap-2.5">
                            <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                              {CATEGORY_LABELS[post.category]}
                            </p>
                            <h3 className="text-ink font-display group-hover/news:text-rust text-2xl leading-tight font-semibold">
                              {post.title}
                            </h3>
                            <p className="text-ink-faint font-mono text-[11px]">
                              {format(new Date(post.publishedAt), 'd MMM yyyy')}
                            </p>
                            {post.excerpt && (
                              <p className="text-navy-primary font-display mt-1 line-clamp-3 text-base leading-relaxed italic">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </Link>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
              {items.length === 24 && (
                <p className="text-ink-faint mt-12 font-mono text-xs italic">
                  Showing latest 24 posts. Older posts will be reachable via pagination.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
