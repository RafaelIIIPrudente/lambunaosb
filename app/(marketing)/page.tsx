import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarClock, MapPin, Newspaper } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { FacebookIcon } from '@/components/icons/facebook';
import { FadeUp } from '@/components/motion/fade-up';
import { Floating } from '@/components/motion/floating';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { SOCIAL_LINKS } from '@/lib/constants/social';
import { getActiveMembers } from '@/lib/db/queries/members';
import { getUpcomingMeetings } from '@/lib/db/queries/meetings';
import { getFeaturedNews } from '@/lib/db/queries/news';
import { getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSignedStorageUrl } from '@/lib/supabase/signed-urls';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;
const PAGE_TITLE = 'Sangguniang Bayan ng Lambunao | Official Site';
const PAGE_DESCRIPTION =
  'The official site of the Sangguniang Bayan ng Lambunao — the legislative council of Lambunao, Iloilo. Read our resolutions, follow sessions, meet your council, and submit a query.';

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

const POSITION_LABELS: Record<string, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    metadataBase: new URL(SITE_URL),
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/',
      siteName: tenant.displayName,
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
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
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: ['/seal/lamb-logo.png'],
    },
  };
}

export default async function LandingPage() {
  const [featuredNews, upcomingMeetings, allPublicMembers, tenant] = await Promise.all([
    getFeaturedNews(3),
    getUpcomingMeetings(1),
    getActiveMembers({ excludePositions: ['mayor'], showOnPublicOnly: true }),
    getCurrentTenant(),
  ]);

  const previewMembers = allPublicMembers.slice(0, 4);
  const upcomingMeeting = upcomingMeetings[0] ?? null;

  const supabase = createAdminClient();
  const [newsCoverUrls, memberPhotoUrls] = await Promise.all([
    Promise.all(
      featuredNews.map((post) =>
        createSignedStorageUrl(supabase, 'news-covers', post.coverStoragePath),
      ),
    ),
    Promise.all(
      previewMembers.map((m) =>
        createSignedStorageUrl(supabase, 'sb-member-photos', m.photoStoragePath),
      ),
    ),
  ]);

  const newsCoverByPostId = new Map<string, string>();
  featuredNews.forEach((post, i) => {
    const url = newsCoverUrls[i];
    if (url) newsCoverByPostId.set(post.id, url);
  });
  const memberPhotoById = new Map<string, string>();
  previewMembers.forEach((member, i) => {
    const url = memberPhotoUrls[i];
    if (url) memberPhotoById.set(member.id, url);
  });

  const firstMember = previewMembers[0];
  const termLabel =
    firstMember && firstMember.termStartYear && firstMember.termEndYear
      ? `Term ${firstMember.termStartYear}–${firstMember.termEndYear}`
      : 'Current term';

  const landingJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'GovernmentOrganization',
        '@id': `${SITE_URL}#organization`,
        name: tenant.displayName,
        url: SITE_URL,
        logo: `${SITE_URL}/seal/lambunao-seal.png`,
        email: tenant.contactEmail,
        ...(tenant.contactPhone ? { telephone: tenant.contactPhone } : {}),
        ...(tenant.officeAddress
          ? {
              address: {
                '@type': 'PostalAddress',
                streetAddress: tenant.officeAddress,
                addressRegion: tenant.province,
                addressCountry: 'PH',
              },
            }
          : {}),
        ...(tenant.establishedYear ? { foundingDate: String(tenant.establishedYear) } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: tenant.displayName,
        publisher: { '@id': `${SITE_URL}#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/news?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}#latest-news`,
        name: 'Latest news from the Sangguniang Bayan ng Lambunao',
        itemListElement: featuredNews.map((post, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/news/${post.slug}`,
          name: post.title,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />

      {/* HERO — asymmetric: text left, seal right */}
      <section className="border-ink/12 flex min-h-[100dvh] items-center border-b">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Stagger as="div" className="flex flex-col">
            <StaggerItem>
              <p className="text-rust mb-6 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                Official · Municipal Council · Established {tenant.establishedYear ?? 1948}
              </p>
            </StaggerItem>
            <StaggerItem>
              <h1 className="text-ink font-display text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl lg:text-[64px]">
                The voice of the people of <span className="gold-underline">Lambunao</span>.
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="text-ink-soft font-script mt-8 max-w-xl text-2xl leading-snug">
                The Sangguniang Bayan is the legislative body of the municipality. Read our
                resolutions, follow our sessions, meet your council, and reach us directly.
              </p>
            </StaggerItem>
            <StaggerItem className="mt-10 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                asChild
                className="font-script text-base transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
              >
                <Link href="/submit-query">
                  Submit a query
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="font-script text-base transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
              >
                <Link href="/news">
                  <Newspaper />
                  Latest news
                </Link>
              </Button>
            </StaggerItem>
            <StaggerItem>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-soft hover:text-rust mt-6 inline-flex items-center gap-1.5 font-mono text-xs tracking-wide transition-colors"
              >
                <FacebookIcon className="size-3.5" aria-hidden="true" />
                Follow us on Facebook · @lambunaoipadayaw
              </a>
            </StaggerItem>
          </Stagger>

          <aside className="flex flex-col items-center justify-center gap-3 lg:items-end">
            <Floating>
              <Image
                src="/seal/lamb-logo.png"
                width={400}
                height={400}
                alt={`Official seal of the Municipality of Lambunao, Province of Iloilo`}
                priority
                sizes="(min-width: 1024px) 360px, 80vw"
                className="h-auto w-full max-w-[360px]"
              />
            </Floating>
            <p className="text-ink-faint max-w-[360px] text-right font-mono text-[11px] tracking-wide">
              Official seal of the Municipality of Lambunao
            </p>
          </aside>
        </div>
      </section>

      {/* MISSION BAND */}
      <section className="bg-paper-2 border-ink/12 flex min-h-[50dvh] items-center border-b">
        <FadeUp as="div" className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 md:py-28">
          <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Our mission
          </p>
          <blockquote className="text-navy-primary font-display max-w-4xl text-2xl leading-snug font-medium italic md:text-3xl">
            &ldquo;To enact responsive ordinances, exercise transparent oversight of municipal
            affairs, and faithfully represent the voice of every Lambunaonon — kabataan, kababaihan,
            magbubukid, kag mga senior.&rdquo;
          </blockquote>
          <Link
            href="/about"
            className="font-script text-ink hover:text-rust gold-underline mt-6 inline-flex items-center gap-1.5 text-lg"
          >
            Read our full mission
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </FadeUp>
      </section>

      {/* UPCOMING SESSION */}
      <section className="border-ink/12 flex min-h-[50dvh] items-center border-b">
        <FadeUp as="div" className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 md:py-28">
          <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Next regular session
          </p>
          {upcomingMeeting ? (
            <article className="bg-paper-2 border-ink/12 flex flex-col gap-4 rounded-md border p-6 md:p-8">
              <h2 className="text-ink font-display text-3xl leading-snug font-bold md:text-4xl">
                {upcomingMeeting.title}
              </h2>
              <p className="text-ink-soft font-script flex flex-wrap items-center gap-x-2 gap-y-1 text-xl">
                <CalendarClock className="text-rust size-5" aria-hidden="true" />
                <span>{format(new Date(upcomingMeeting.date), 'EEEE, d MMMM yyyy · h:mm a')}</span>
              </p>
              <p className="text-ink-soft flex items-center gap-2 font-mono text-sm">
                <MapPin className="text-ink-faint size-4" aria-hidden="true" />
                {upcomingMeeting.location}
              </p>
            </article>
          ) : (
            <article className="bg-paper-2 border-ink/12 rounded-md border p-6 md:p-8">
              <p className="text-ink-soft font-script text-xl">
                No upcoming session scheduled. Check back soon.
              </p>
            </article>
          )}
        </FadeUp>
      </section>

      {/* LATEST NEWS */}
      <section className="flex min-h-[100dvh] items-center">
        <FadeUp as="div" className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 md:py-28">
          <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-ink font-display text-3xl font-bold md:text-4xl">Latest news</h2>
            <Link
              href="/news"
              className="font-script text-ink hover:text-rust gold-underline group/seeall inline-flex items-center gap-1.5 self-start text-lg sm:self-end"
            >
              See all news
              <ArrowRight className="size-4 transition-transform group-hover/seeall:translate-x-0.5" />
            </Link>
          </header>

          {featuredNews.length === 0 ? (
            <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
              <p className="text-ink-soft font-script text-lg">
                No published news yet. Check back soon.
              </p>
            </div>
          ) : (
            <Stagger as="ul" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredNews.map((post) => {
                const coverUrl = newsCoverByPostId.get(post.id);
                return (
                  <StaggerItem as="li" key={post.id}>
                    <Link
                      href={`/news/${post.slug}`}
                      className="group/news border-ink/15 hover:border-ink/35 hover:shadow-e1 focus-visible:ring-rust bg-paper flex h-full flex-col gap-4 rounded-md border p-4 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {coverUrl ? (
                        <div className="bg-paper-2 relative aspect-[16/9] w-full overflow-hidden rounded-md">
                          <Image
                            src={coverUrl}
                            alt={`Cover image for ${post.title}`}
                            fill
                            loading="lazy"
                            sizes="(min-width: 1024px) 384px, (min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <ImagePlaceholder ratio="16:9" />
                      )}
                      <div className="flex flex-col gap-2 px-1 pb-1">
                        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </p>
                        <h3 className="text-ink font-display group-hover/news:text-rust text-lg leading-snug font-semibold">
                          {post.title}
                        </h3>
                        <p className="text-ink-faint font-mono text-xs">
                          {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })} ·{' '}
                          {format(new Date(post.publishedAt), 'd MMM yyyy')}
                        </p>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </FadeUp>
      </section>

      {/* COUNCIL MEMBERS PREVIEW */}
      <section className="bg-paper-2 border-ink/12 flex min-h-[100dvh] items-center border-t">
        <FadeUp as="div" className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 md:py-28">
          <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                Meet your council
              </p>
              <h2 className="text-ink font-display text-3xl font-bold md:text-4xl">
                Lambunao SB · {termLabel}
              </h2>
            </div>
            <Link
              href="/members"
              className="font-script text-ink hover:text-rust gold-underline group/seeall inline-flex items-center gap-1.5 self-start text-lg sm:self-end"
            >
              See all members
              <ArrowRight className="size-4 transition-transform group-hover/seeall:translate-x-0.5" />
            </Link>
          </header>

          {previewMembers.length === 0 ? (
            <div className="border-ink/15 bg-paper rounded-md border p-8">
              <p className="text-ink-soft font-script text-lg">
                Council roster will appear here once members are seeded.
              </p>
            </div>
          ) : (
            <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {previewMembers.map((member) => {
                const photoUrl = memberPhotoById.get(member.id);
                return (
                  <StaggerItem as="li" key={member.id}>
                    <Link
                      href={`/members/${member.id}`}
                      className="group/member border-ink/15 hover:border-ink/35 hover:shadow-e1 focus-visible:ring-rust bg-paper flex h-full flex-col gap-4 rounded-md border p-4 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {photoUrl ? (
                        <div className="bg-paper-2 relative aspect-square w-full overflow-hidden rounded-md">
                          <Image
                            src={photoUrl}
                            alt={`Portrait of ${member.honorific} ${member.fullName}`}
                            fill
                            loading="lazy"
                            sizes="(min-width: 1024px) 280px, 50vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <ImagePlaceholder ratio="1:1" label={member.initials} />
                      )}
                      <div className="flex flex-col gap-1.5 px-1 pb-1">
                        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                          {POSITION_LABELS[member.position] ?? member.position}
                        </p>
                        <h3 className="text-ink font-display group-hover/member:text-rust text-base leading-snug font-semibold">
                          {member.honorific} {member.fullName}
                        </h3>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </FadeUp>
      </section>
    </>
  );
}
