import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getAllMemberIds, getMemberById, type CommitteeMembership } from '@/lib/db/queries/members';
import { getRecentSponsorshipsByMember } from '@/lib/db/queries/resolutions';
import { getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSignedStorageUrl } from '@/lib/supabase/signed-urls';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

const POSITION_LABELS: Record<string, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

const ROLE_LABELS: Record<CommitteeMembership['role'], string> = {
  chair: 'Chair',
  vice_chair: 'Vice Chair',
  member: 'Member',
};

const SPONSORSHIP_KIND_LABELS: Record<'sponsored' | 'co_sponsored', string> = {
  sponsored: 'Sponsored',
  co_sponsored: 'Co-sponsored',
};

const DESCRIPTION_MAX = 140;

export async function generateStaticParams() {
  return safeBuildtimeQuery(() => getAllMemberIds(), []);
}

function summarizeBio(bioMd: string | null): string | null {
  if (!bioMd) return null;
  const stripped = bioMd
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length === 0) return null;
  if (stripped.length <= DESCRIPTION_MAX) return stripped;
  return `${stripped.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [member, tenant] = await Promise.all([getMemberById(id), getCurrentTenant()]);
  if (!member) {
    return {
      metadataBase: new URL(SITE_URL),
      title: `Member not found · ${tenant.displayName}`,
      robots: { index: false, follow: false },
    };
  }

  const fullName = `${member.honorific} ${member.fullName}`;
  const title = `${fullName} · ${tenant.displayName}`;
  const description =
    summarizeBio(member.bioMd) ??
    `${fullName}, ${POSITION_LABELS[member.position] ?? 'Member'} of ${tenant.displayName}.`;

  const supabase = createAdminClient();
  const photoUrl = await createSignedStorageUrl(
    supabase,
    'sb-member-photos',
    member.photoStoragePath,
  );

  const ogImage = photoUrl
    ? { url: photoUrl, width: 1200, height: 1600, alt: `Portrait of ${fullName}` }
    : {
        url: '/seal/lamb-logo.png',
        width: 1024,
        height: 1024,
        alt: `Official seal of the Municipality of Lambunao, Province of ${tenant.province}`,
      };

  const base: Metadata = {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: `/members/${id}` },
    openGraph: {
      type: 'profile',
      locale: 'en_PH',
      url: `/members/${id}`,
      siteName: tenant.displayName,
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
  };

  if (!member.showOnPublic) {
    return { ...base, robots: { index: false, follow: false } };
  }
  return base;
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member || !member.showOnPublic) notFound();

  const [tenant, sponsorships] = await Promise.all([
    getCurrentTenant(),
    getRecentSponsorshipsByMember(member.id, 5),
  ]);

  const supabase = createAdminClient();
  const photoUrl = await createSignedStorageUrl(
    supabase,
    'sb-member-photos',
    member.photoStoragePath,
  );

  const fullName = `${member.honorific} ${member.fullName}`;

  const eyebrowParts = [
    POSITION_LABELS[member.position]?.toUpperCase(),
    member.position === 'vice_mayor' ? 'PRESIDING OFFICER' : null,
    `TERM ${member.termStartYear}–${member.termEndYear}`,
  ].filter(Boolean);

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    jobTitle: POSITION_LABELS[member.position] ?? 'Council member',
    affiliation: { '@id': `${SITE_URL}#organization` },
    url: `${SITE_URL}/members/${member.id}`,
    ...(photoUrl ? { image: photoUrl } : {}),
    ...(member.contactEmail ? { email: member.contactEmail } : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Members', item: `${SITE_URL}/members` },
      { '@type': 'ListItem', position: 3, name: fullName },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="text-ink-faint flex flex-wrap items-center gap-2 font-mono text-xs">
            <li>
              <Link href="/" className="hover:text-rust">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li>
              <Link href="/members" className="hover:text-rust">
                Members
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li className="text-ink" aria-current="page">
              {fullName}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 md:grid-cols-[280px_1fr] md:gap-12">
          {/* Left column — portrait + office */}
          <aside className="flex flex-col gap-5">
            <div className="border-ink/30 rounded-md border border-dashed p-1.5">
              {photoUrl ? (
                <div className="bg-paper-2 relative aspect-[3/4] w-full overflow-hidden rounded-md">
                  <Image
                    src={photoUrl}
                    alt={`Portrait of ${fullName}`}
                    fill
                    sizes="(min-width: 768px) 280px, 80vw"
                    className="object-cover"
                    unoptimized
                    priority
                  />
                </div>
              ) : (
                <ImagePlaceholder ratio="3:4" label={member.initials} />
              )}
            </div>

            <div className="border-ink/25 rounded-md border p-5">
              <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                Office
              </p>
              <p className="text-ink font-display text-sm leading-relaxed italic">
                {tenant.officeAddress ?? 'Lambunao Municipal Hall'}
              </p>
              {tenant.contactPhone && (
                <p className="text-ink-soft mt-2 font-mono text-xs">{tenant.contactPhone}</p>
              )}
              {member.contactEmail && (
                <Button asChild variant="outline" className="font-script mt-4 w-full text-base">
                  <Link href={`mailto:${member.contactEmail}`}>
                    <Mail />
                    Email directly
                  </Link>
                </Button>
              )}
              {/* TODO: re-enable ?to=${member.id} once /submit-query consumes the param. */}
              <Button asChild className="font-script mt-3 w-full text-base">
                <Link href="/submit-query">
                  <Mail />
                  Contact via form
                </Link>
              </Button>
            </div>
          </aside>

          {/* Right column — name, badges, bio, activity */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
                {eyebrowParts.join(' · ')}
              </p>
              <h1 className="text-ink font-display text-5xl leading-tight font-bold tracking-tight md:text-6xl">
                {fullName}
              </h1>
            </div>

            {member.committeeAssignments.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {member.committeeAssignments.map((assignment) => (
                  <li key={assignment.committee.id}>
                    <Badge
                      variant={assignment.role === 'chair' ? 'destructive' : 'outline'}
                      className="h-7 px-3"
                    >
                      {assignment.committee.name} ({ROLE_LABELS[assignment.role]})
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <section>
              <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                Biography
              </p>
              {member.bioMd && member.bioMd.trim().length > 0 ? (
                <div className="prose-bio text-navy-primary font-display max-w-[60ch] text-lg leading-relaxed italic">
                  <MDXRemote
                    source={member.bioMd}
                    options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                  />
                </div>
              ) : (
                <p className="text-ink-soft font-display text-lg italic">Biography coming soon.</p>
              )}
            </section>

            {sponsorships.length > 0 && (
              <section>
                <p className="text-rust mb-4 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                  Recent activity
                </p>
                <ul className="divide-ink/15 divide-y divide-dashed">
                  {sponsorships.map((s) => (
                    <li
                      key={s.id}
                      className="grid grid-cols-[110px_1fr_auto] items-baseline gap-4 py-3 text-sm"
                    >
                      <span className="font-script text-ink-soft text-base italic">
                        {SPONSORSHIP_KIND_LABELS[s.kind]}
                      </span>
                      <span className="text-navy-primary font-display italic">
                        {s.number} — {s.title}
                      </span>
                      <span className="text-ink-faint font-mono text-xs">
                        {s.publishedAt ? format(s.publishedAt, 'd MMM') : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
