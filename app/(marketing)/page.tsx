import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarClock, MapPin, Newspaper } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { FacebookIcon } from '@/components/icons/facebook';
import { CoverHero } from '@/components/marketing/cover-hero';
import { PhotoBand } from '@/components/marketing/photo-band';
import { PhotoCarousel } from '@/components/marketing/photo-carousel';
import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS } from '@/lib/constants/social';
import { getActiveMembers } from '@/lib/db/queries/members';
import { getUpcomingMeetings } from '@/lib/db/queries/meetings';
import { getFeaturedNews } from '@/lib/db/queries/news';
import { getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;
const PAGE_TITLE = 'Sangguniang Bayan ng Lambunao | Official Site';
const PAGE_DESCRIPTION =
  'The official site of the Sangguniang Bayan ng Lambunao — the legislative council of Lambunao, Iloilo. Read our resolutions, follow sessions, meet your council, and submit a query.';

const CATEGORY_LABELS: Record<string, string> = {
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
    getActiveMembers({ showOnPublicOnly: true }),
    getCurrentTenant(),
  ]);

  const previewMembers = allPublicMembers.slice(0, 4);
  const upcomingMeeting = upcomingMeetings[0] ?? null;

  const supabase = createAdminClient();
  const [newsCoverUrls, memberPhotoUrls] = await Promise.all([
    Promise.all(
      featuredNews.map((post) =>
        getCompressedImageUrl({
          supabase,
          bucket: 'news-covers',
          prefix: post.coverStoragePath,
          size: pickSizeForSurface('thumb'),
        }),
      ),
    ),
    Promise.all(
      previewMembers.map((m) =>
        getCompressedImageUrl({
          supabase,
          bucket: 'members-portraits',
          prefix: m.photoStoragePath,
          size: pickSizeForSurface('thumb'),
        }),
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

  const [leadNews, ...secondaryNews] = featuredNews;
  const [leadMember, ...sideMembers] = previewMembers;

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

      {/* HERO — full-bleed cover photograph */}
      <CoverHero
        src="/lambunao/municipal-hall.png"
        alt="Municipal Hall of Lambunao at golden hour, Iloilo"
        eyebrow={`Official · Established ${tenant.establishedYear ?? 1948}`}
        headline={
          <>
            The voice of the people of <em className="font-display italic">Lambunao</em>.
          </>
        }
        dateline="The Sangguniang Bayan is the legislative body of the municipality. Read our resolutions, follow our sessions, meet your council, reach us directly."
      >
        <Button
          size="lg"
          asChild
          className="font-script shadow-e2 text-base transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
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
          className="border-paper/60 text-paper hover:bg-paper/10 hover:text-paper text-base transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
        >
          <Link href="/news">
            <Newspaper />
            Latest news
          </Link>
        </Button>
        <a
          href={SOCIAL_LINKS.facebook}
          target="_blank"
          rel="noreferrer noopener"
          className="text-paper/85 hover:text-paper ml-1 inline-flex items-center gap-1.5 font-mono text-xs tracking-wide transition-colors"
        >
          <FacebookIcon className="size-3.5" aria-hidden="true" />
          @lambunaoipadayaw
        </a>
      </CoverHero>

      {/* MISSION — editorial column with framed inset */}
      <section className="bg-paper relative">
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-4 py-24 sm:px-8 md:py-32 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <FadeUp as="div">
            <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
              Our mandate
            </p>
            <span
              aria-hidden="true"
              className="text-rust font-display -mb-2 block text-7xl leading-[0.7] select-none md:-mb-4 md:text-9xl"
            >
              &ldquo;
            </span>
            <blockquote className="text-navy-primary font-display max-w-[22ch] text-4xl leading-[1.05] font-medium md:text-5xl lg:text-6xl">
              To enact responsive ordinances, exercise transparent oversight of municipal affairs,
              and faithfully represent the voice of every Lambunaonon —{' '}
              <em className="font-display italic">
                kabataan, kababaihan, magbubukid, kag mga senior.
              </em>
            </blockquote>
            <Link
              href="/about"
              className="font-script text-ink hover:text-rust gold-underline mt-10 inline-flex items-center gap-1.5 text-xl"
            >
              Read our full mandate
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </FadeUp>

          <FadeUp as="aside" delay={0.15} className="flex flex-col gap-3">
            <div className="border-ink/25 rounded-md border border-dashed p-1.5">
              <div className="bg-paper-2 relative aspect-[4/5] w-full overflow-hidden rounded-md">
                <Image
                  src="/lambunao/plaza-church-2.png"
                  alt="The plaza and parish church at the heart of Lambunao's poblacion"
                  fill
                  sizes="(min-width: 1024px) 380px, 80vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
              </div>
            </div>
            <p className="text-ink-faint font-mono text-[11px] tracking-wide italic">
              Plaza Rizal &amp; the parish church — Brgy. Poblacion.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* PHOTOGRAPHIC PUNCTUATION — plaza */}
      <PhotoBand
        src="/lambunao/plaza-church.png"
        alt="The plaza of Lambunao at dusk"
        eyebrow="Where we gather"
        caption="Every session is open. Every voice is on the record. Padayon ang Lambunao."
        height="md"
      />

      {/* UPCOMING SESSION — editorial card */}
      <section className="bg-paper-2 border-ink/12 border-y">
        <FadeUp as="div" className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-[auto_1fr] md:gap-16">
            <div>
              <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
                Next regular session
              </p>
              <p className="font-script text-ink-soft max-w-[26ch] text-2xl md:text-3xl">
                The chamber convenes weekly. Public seating is open.
              </p>
            </div>

            {upcomingMeeting ? (
              <article className="border-ink/30 bg-paper relative flex flex-col gap-5 rounded-md border border-dashed p-8 md:p-10">
                <CalendarClock
                  className="text-rust bg-paper absolute -top-4 -left-4 size-9 rounded-full p-1.5"
                  aria-hidden="true"
                />
                <h2 className="text-ink font-display text-3xl leading-snug font-bold md:text-4xl">
                  {upcomingMeeting.title}
                </h2>
                <p className="text-navy-primary font-display flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl italic">
                  {format(new Date(upcomingMeeting.date), 'EEEE, d MMMM yyyy · h:mm a')}
                </p>
                <p className="text-ink-soft flex items-center gap-2 font-mono text-sm">
                  <MapPin className="text-ink-faint size-4" aria-hidden="true" />
                  {upcomingMeeting.location}
                </p>
              </article>
            ) : (
              <article className="border-ink/30 bg-paper rounded-md border border-dashed p-8 md:p-10">
                <p className="text-ink-soft font-script text-2xl">
                  No upcoming session scheduled. Check back soon.
                </p>
              </article>
            )}
          </div>
        </FadeUp>
      </section>

      {/* PHOTO CAROUSEL — scenes of Lambunao */}
      <PhotoCarousel />

      {/* LATEST NEWS — wide spread (1 lead + N supporting) */}
      <section className="bg-paper">
        <FadeUp as="div" className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 md:py-28">
          <header className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
                Bulletin
              </p>
              <h2 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
                Latest news
              </h2>
            </div>
            <Link
              href="/news"
              className="font-script text-ink hover:text-rust gold-underline group/seeall inline-flex items-center gap-1.5 self-start text-xl md:self-end"
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
            <Stagger as="div" className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              {/* Lead story */}
              {leadNews && (
                <StaggerItem>
                  <Link
                    href={`/news/${leadNews.slug}`}
                    className="group/news focus-visible:ring-rust flex h-full flex-col gap-5 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {newsCoverByPostId.get(leadNews.id) ? (
                      <div className="bg-paper-2 border-ink/15 relative aspect-[16/10] w-full overflow-hidden rounded-md border">
                        <Image
                          src={newsCoverByPostId.get(leadNews.id)!}
                          alt={`Cover image for ${leadNews.title}`}
                          fill
                          loading="lazy"
                          sizes="(min-width: 1024px) 720px, 100vw"
                          className="object-cover transition-transform duration-500 group-hover/news:scale-[1.015]"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <ImagePlaceholder ratio="16:9" />
                    )}
                    <div className="flex flex-col gap-3">
                      <p className="text-rust font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                        {CATEGORY_LABELS[leadNews.category] ?? leadNews.category}
                      </p>
                      <h3 className="text-ink font-display group-hover/news:text-rust max-w-[22ch] text-3xl leading-snug font-bold md:text-4xl">
                        {leadNews.title}
                      </h3>
                      {leadNews.excerpt && (
                        <p className="text-navy-primary font-display max-w-[60ch] text-lg leading-relaxed italic">
                          {leadNews.excerpt}
                        </p>
                      )}
                      <p className="text-ink-faint font-mono text-xs">
                        {format(new Date(leadNews.publishedAt), 'd MMM yyyy')} ·{' '}
                        {formatDistanceToNow(new Date(leadNews.publishedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              )}

              {/* Secondary stack */}
              <StaggerItem className="flex flex-col gap-6">
                {secondaryNews.map((post, idx) => {
                  const coverUrl = newsCoverByPostId.get(post.id);
                  return (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}`}
                      className={cn(
                        'group/news border-ink/15 hover:border-ink/35 focus-visible:ring-rust grid grid-cols-[112px_1fr] gap-4 rounded-md border-t pt-6 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:grid-cols-[160px_1fr]',
                        idx === 0 && 'border-t-0 pt-0',
                      )}
                    >
                      {coverUrl ? (
                        <div className="bg-paper-2 relative aspect-square w-full overflow-hidden rounded-md">
                          <Image
                            src={coverUrl}
                            alt={`Cover image for ${post.title}`}
                            fill
                            loading="lazy"
                            sizes="(min-width: 640px) 160px, 112px"
                            className="object-cover transition-transform duration-500 group-hover/news:scale-[1.03]"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <ImagePlaceholder ratio="1:1" />
                      )}
                      <div className="flex flex-col gap-2">
                        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </p>
                        <h3 className="text-ink font-display group-hover/news:text-rust text-base leading-snug font-semibold md:text-lg">
                          {post.title}
                        </h3>
                        <p className="text-ink-faint font-mono text-[11px]">
                          {format(new Date(post.publishedAt), 'd MMM yyyy')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </StaggerItem>
            </Stagger>
          )}
        </FadeUp>
      </section>

      {/* COUNCIL MEMBERS — wide spread */}
      <section className="bg-paper-2 border-ink/12 border-t">
        <FadeUp as="div" className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 md:py-28">
          <header className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
                <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
                Meet your council · {termLabel}
              </p>
              <h2 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
                Lambunao SB
              </h2>
            </div>
            <Link
              href="/members"
              className="font-script text-ink hover:text-rust gold-underline group/seeall inline-flex items-center gap-1.5 self-start text-xl md:self-end"
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
            <Stagger as="div" className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-12">
              {/* Lead member */}
              {leadMember && (
                <StaggerItem>
                  <Link
                    href={`/members/${leadMember.id}`}
                    className="group/lead border-ink/25 hover:border-ink/45 focus-visible:ring-rust bg-paper relative flex flex-col gap-4 rounded-md border border-dashed p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {memberPhotoById.get(leadMember.id) ? (
                      <div className="bg-paper-2 relative aspect-[3/4] w-full overflow-hidden rounded-md">
                        <Image
                          src={memberPhotoById.get(leadMember.id)!}
                          alt={`Portrait of ${leadMember.honorific} ${leadMember.fullName}`}
                          fill
                          loading="lazy"
                          sizes="(min-width: 1024px) 300px, 80vw"
                          className="object-cover transition-transform duration-500 group-hover/lead:scale-[1.02]"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <ImagePlaceholder ratio="3:4" label={leadMember.initials} />
                    )}
                    <div className="flex flex-col gap-1.5 px-3 pb-4">
                      <p className="text-rust font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
                        {POSITION_LABELS[leadMember.position] ?? leadMember.position}
                      </p>
                      <h3 className="text-ink font-display group-hover/lead:text-rust text-2xl leading-tight font-bold">
                        {leadMember.honorific} {leadMember.fullName}
                      </h3>
                      {leadMember.committees.length > 0 && (
                        <p className="text-ink-soft font-display line-clamp-2 text-sm leading-relaxed italic">
                          {leadMember.committees.slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </div>
                  </Link>
                </StaggerItem>
              )}

              {/* Side members */}
              <StaggerItem className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:content-start">
                {sideMembers.map((member) => {
                  const photoUrl = memberPhotoById.get(member.id);
                  return (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="group/member border-ink/25 hover:border-ink/45 focus-visible:ring-rust bg-paper flex h-full flex-col gap-3 rounded-md border border-dashed p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {photoUrl ? (
                        <div className="bg-paper-2 relative aspect-[3/4] w-full overflow-hidden rounded-md">
                          <Image
                            src={photoUrl}
                            alt={`Portrait of ${member.honorific} ${member.fullName}`}
                            fill
                            loading="lazy"
                            sizes="(min-width: 1024px) 200px, 40vw"
                            className="object-cover transition-transform duration-500 group-hover/member:scale-[1.03]"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <ImagePlaceholder ratio="3:4" label={member.initials} />
                      )}
                      <div className="flex flex-col gap-1 px-3 pb-3">
                        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                          {POSITION_LABELS[member.position] ?? member.position}
                        </p>
                        <h3 className="text-ink font-display group-hover/member:text-rust text-base leading-snug font-semibold">
                          {member.honorific} {member.fullName}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </StaggerItem>
            </Stagger>
          )}
        </FadeUp>
      </section>
    </>
  );
}
