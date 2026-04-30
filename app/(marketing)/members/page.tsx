import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { getActiveMembers, type MemberCardData } from '@/lib/db/queries/members';
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

function deriveTermLabel(members: MemberCardData[]): string {
  if (members.length === 0) return 'Current term';
  const counts = new Map<string, number>();
  for (const m of members) {
    if (m.termStartYear && m.termEndYear) {
      const key = `${m.termStartYear}-${m.termEndYear}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return 'Current term';
  let bestKey = '';
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      bestKey = k;
      bestCount = v;
    }
  }
  const [start, end] = bestKey.split('-');
  return `Term ${start}–${end}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const [tenant, members] = await Promise.all([
    getCurrentTenant(),
    getActiveMembers({ excludePositions: ['mayor'], showOnPublicOnly: true }),
  ]);
  const term = deriveTermLabel(members);
  const title = `Members · ${tenant.displayName}`;
  const description = `Meet the elected members of ${tenant.displayName} serving the ${term} term.`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: '/members' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/members',
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

export default async function MembersPage() {
  const [members, tenant] = await Promise.all([
    getActiveMembers({ excludePositions: ['mayor'], showOnPublicOnly: true }),
    getCurrentTenant(),
  ]);

  const supabase = createAdminClient();
  const photoUrls = await Promise.all(
    members.map((m) => createSignedStorageUrl(supabase, 'sb-member-photos', m.photoStoragePath)),
  );
  const memberPhotoById = new Map<string, string>();
  members.forEach((m, i) => {
    const url = photoUrls[i];
    if (url) memberPhotoById.set(m.id, url);
  });

  const term = deriveTermLabel(members);
  const sbMemberCount = members.filter((m) => m.position === 'sb_member').length;
  const hasViceMayor = members.some((m) => m.position === 'vice_mayor');

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Members of ${tenant.displayName}`,
    itemListElement: members.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/members/${m.id}`,
      name: `${m.honorific} ${m.fullName}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
        <FadeUp as="header" className="mb-12">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Your council · {term}
          </p>
          <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
            Meet your SB Members
          </h1>
          <p className="text-ink-soft font-script mt-6 max-w-2xl text-xl leading-snug">
            {hasViceMayor
              ? `The Sangguniang Bayan is composed of the Vice Mayor (presiding officer) and ${sbMemberCount} elected members who serve three-year terms.`
              : `The Sangguniang Bayan is composed of ${sbMemberCount} elected members who serve three-year terms.`}
          </p>
        </FadeUp>

        {members.length === 0 ? (
          <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
            <p className="text-ink-soft font-script text-lg">
              Council roster will appear here once members are seeded.
            </p>
          </div>
        ) : (
          <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member) => {
              const photoUrl = memberPhotoById.get(member.id);
              return (
                <StaggerItem as="li" key={member.id}>
                  <article className="border-ink/30 hover:border-ink/50 hover:shadow-e1 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-4 transition-all hover:-translate-y-0.5">
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
                    <div className="flex flex-col gap-2.5 px-1 pb-1">
                      <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                        {POSITION_LABELS[member.position]}
                      </p>
                      <h2 className="text-ink font-display text-xl leading-snug font-semibold">
                        {member.honorific} {member.fullName}
                      </h2>
                      {member.committees.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                          {member.committees.map((committee) => (
                            <li
                              key={committee}
                              className="border-ink/35 text-ink-soft rounded-pill inline-flex items-center border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase"
                            >
                              {committee}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/members/${member.id}`}
                        className="border-ink/30 text-ink hover:border-ink hover:bg-paper-2 font-script rounded-pill mt-2 inline-flex h-9 w-fit items-center gap-1.5 border border-dashed px-4 text-sm transition-colors"
                      >
                        View profile
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>
    </>
  );
}
