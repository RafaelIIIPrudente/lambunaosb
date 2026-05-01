import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { FacebookIcon } from '@/components/icons/facebook';
import { PageHero } from '@/components/marketing/page-hero';
import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { env } from '@/env';
import { SOCIAL_LINKS } from '@/lib/constants/social';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getActiveMembers } from '@/lib/db/queries/members';
import { FALLBACK_TENANT, getCurrentTenant } from '@/lib/db/queries/tenant';
import { RETENTION_YEARS } from '@/lib/validators/citizen-query';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

const LAMBUNAO_COORDS = { lat: 11.05, lng: 122.4833 };

function naturalListJoin(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, and ${tail}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT);
  const title = `About · ${tenant.displayName}`;
  const description = `About ${tenant.displayName} — our mandate, office, and contacts.`;
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/about',
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

export default async function AboutPage() {
  const [tenant, members] = await Promise.all([
    safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT),
    safeBuildtimeQuery(
      () => getActiveMembers({ excludePositions: ['mayor'], showOnPublicOnly: true }),
      [],
    ),
  ]);

  const sbMemberCount = members.filter((m) => m.position === 'sb_member').length;
  const hasViceMayor = members.some((m) => m.position === 'vice_mayor');
  const exOfficio: string[] = [];
  if (members.some((m) => m.position === 'sk_chairperson')) exOfficio.push('the youth');
  if (members.some((m) => m.position === 'liga_president')) exOfficio.push('the barangay captains');
  if (members.some((m) => m.position === 'ipmr'))
    exOfficio.push('the Indigenous Peoples Mandatory Representative');

  const compositionSentence =
    `It is composed of ` +
    (hasViceMayor ? 'the Vice Mayor as presiding officer, ' : '') +
    `${sbMemberCount} elected member${sbMemberCount === 1 ? '' : 's'}` +
    (exOfficio.length > 0
      ? `, and ${exOfficio.length} ex-officio member${exOfficio.length === 1 ? '' : 's'} representing ${naturalListJoin(exOfficio)}`
      : '') +
    '.';

  const { lat, lng } = LAMBUNAO_COORDS;
  const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
  const osmEmbedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const osmLargeHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${tenant.displayName}`,
    url: `${SITE_URL}/about`,
    mainEntity: { '@id': `${SITE_URL}#organization` },
  };

  const hasOfficeHours = Boolean(tenant.officeHoursMd && tenant.officeHoursMd.trim().length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />

      <PageHero
        src="/lambunao/plaza-church.png"
        alt="Plaza Rizal and the parish church at the heart of Lambunao"
        eyebrow={`About${tenant.establishedYear ? ` · Established ${tenant.establishedYear}` : ''}`}
        title={
          <>
            The Sangguniang Bayan <em className="font-display italic">of Lambunao</em>.
          </>
        }
        lede="Twenty-two committees. Weekly sessions. One mandate — to faithfully represent every Lambunaonon."
        caption="Plaza Rizal · Brgy. Poblacion"
      />

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-20 sm:px-8 md:py-28">
          <Stagger as="div" className="grid gap-12 md:grid-cols-[1.4fr_1fr]">
            <StaggerItem className="text-navy-primary font-display flex flex-col gap-6 text-xl leading-relaxed italic md:text-[22px]">
              <p>
                The <strong className="font-semibold not-italic">Sangguniang Bayan</strong>{' '}
                (&ldquo;Municipal Council&rdquo;) is the legislative body of the Municipality of
                Lambunao. {compositionSentence}
              </p>
              <p>
                Our regular sessions are open to the public and held weekly at the Session Hall, 2/F
                Municipal Hall.
              </p>
            </StaggerItem>

            <StaggerItem as="aside" className="flex flex-col gap-5">
              <div className="border-ink/25 rounded-md border p-6">
                <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                  Office
                </p>
                {tenant.officeAddress ? (
                  <p className="text-navy-primary font-display text-base leading-relaxed break-words whitespace-pre-line italic">
                    {tenant.officeAddress}
                  </p>
                ) : (
                  <p className="text-ink-soft font-display text-base italic">
                    Office address coming soon.
                  </p>
                )}
                <hr className="border-ink/15 my-4 border-t border-dashed" />
                <ul className="text-ink-soft flex flex-col gap-2 text-sm">
                  {tenant.contactPhone && (
                    <li className="flex items-center gap-2.5">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-display italic">{tenant.contactPhone}</span>
                    </li>
                  )}
                  <li className="flex min-w-0 items-center gap-2.5">
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    <a
                      href={`mailto:${tenant.contactEmail}`}
                      className="text-navy-primary font-display min-w-0 break-words italic hover:underline"
                    >
                      {tenant.contactEmail}
                    </a>
                  </li>
                  <li className="flex min-w-0 items-center gap-2.5">
                    <FacebookIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    <a
                      href={SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-navy-primary font-display min-w-0 break-words italic hover:underline"
                    >
                      facebook.com/lambunaoipadayaw
                    </a>
                  </li>
                </ul>
                <p className="text-rust mt-5 mb-1 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                  Office hours
                </p>
                {hasOfficeHours ? (
                  <div className="text-navy-primary font-display text-base leading-relaxed italic">
                    <MDXRemote
                      source={tenant.officeHoursMd!}
                      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                    />
                  </div>
                ) : (
                  <p className="text-ink-soft font-display text-base italic">
                    Office hours coming soon.
                  </p>
                )}
              </div>

              <div className="border-ink/30 flex flex-col gap-2 rounded-md border border-dashed p-1.5">
                <iframe
                  src={osmEmbedSrc}
                  title="Map of Lambunao Municipal Hall, Iloilo"
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-md border-0"
                />
                <a
                  href={osmLargeHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-rust px-2 pb-1 font-mono text-xs hover:underline"
                >
                  Open larger map ↗
                </a>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Oath-taking ceremony — full-bleed editorial */}
      <FadeUp as="figure" className="relative isolate w-full overflow-hidden">
        <div className="bg-paper-2 relative aspect-[16/9] w-full md:aspect-[21/9]">
          <Image
            src="/about/oath-taking-2025.png"
            alt="Oath-taking and turnover ceremony of newly elected officials, Municipality of Lambunao."
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="from-ink/60 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
          />
        </div>
        <figcaption className="text-paper/95 absolute bottom-0 left-0 w-full max-w-[1240px] px-4 pb-6 sm:px-8 md:pb-10">
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase">
            <span className="bg-gold mr-3 inline-block h-px w-6 align-middle" />
            On the record
          </span>
          <p className="font-script mt-2 text-xl md:text-2xl">
            Oath-taking and turnover ceremony of newly elected officials.
          </p>
        </figcaption>
      </FadeUp>

      <FadeUp as="section" id="privacy" className="bg-rust/8 border-rust/20 border-t border-b">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-8 md:py-16">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            <span className="bg-rust mr-3 inline-block h-px w-8 align-middle" />
            Data Privacy Act notice
          </p>
          <p className="text-navy-primary font-display max-w-4xl text-lg leading-relaxed break-words italic md:text-xl">
            In accordance with the Data Privacy Act of 2012 (RA 10173), the LGU collects only the
            personal information necessary to fulfill its mandate. Submitted queries store name +
            email, retained for {RETENTION_YEARS} years. You may request deletion at{' '}
            <a
              href={`mailto:${tenant.dpoEmail}`}
              className="text-rust font-medium break-words not-italic hover:underline"
            >
              {tenant.dpoEmail}
            </a>
            .
          </p>
        </div>
      </FadeUp>
    </>
  );
}
