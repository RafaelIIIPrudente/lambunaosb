import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PageHero } from '@/components/marketing/page-hero';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { env } from '@/env';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getActiveMembers, type MemberCardData } from '@/lib/db/queries/members';
import { FALLBACK_TENANT, getCurrentTenant } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

const POSITION_LABELS: Record<string, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

const POSITION_ORDER: Record<string, number> = {
  vice_mayor: 0,
  sb_member: 8,
  sk_chairperson: 2,
  liga_president: 3,
  ipmr: 4,
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
    safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT),
    safeBuildtimeQuery(() => getActiveMembers({ showOnPublicOnly: true }), []),
  ]);
  const term = deriveTermLabel(members);
  const title = `Members · ${tenant.displayName}`;
  const description = `Meet the elected members of ${tenant.displayName} serving the ${term} term.`;
  return {
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
    safeBuildtimeQuery(() => getActiveMembers({ showOnPublicOnly: true }), []),
    safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT),
  ]);

  const supabase = createAdminClient();
  const photoUrls = await Promise.all(
    members.map((m) =>
      getCompressedImageUrl({
        supabase,
        bucket: 'members-portraits',
        prefix: m.photoStoragePath,
        size: pickSizeForSurface('thumb'),
      }),
    ),
  );
  const memberPhotoById = new Map<string, string>();
  members.forEach((m, i) => {
    const url = photoUrls[i];
    if (url) memberPhotoById.set(m.id, url);
  });

  const sortedMembers = [...members].sort((a, b) => {
    const oa = POSITION_ORDER[a.position] ?? 99;
    const ob = POSITION_ORDER[b.position] ?? 99;
    return oa - ob;
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

      <PageHero
        src="/lambunao/plaza-church-2.png"
        alt="The plaza of Lambunao — civic gathering place"
        eyebrow={`Your council · ${term}`}
        title={
          <>
            Meet your <em className="font-display italic">SB Members</em>.
          </>
        }
        lede={
          hasViceMayor
            ? `Composed of the Vice Mayor (presiding officer) and ${sbMemberCount} elected members serving three-year terms.`
            : `Composed of ${sbMemberCount} elected members serving three-year terms.`
        }
        caption="Plaza Rizal · Lambunao"
      />

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 md:py-28">
          {sortedMembers.length === 0 ? (
            <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
              <p className="text-ink-soft font-script text-lg">
                Council roster will appear here once members are seeded.
              </p>
            </div>
          ) : (
            <Stagger
              as="ul"
              className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {sortedMembers.map((member) => {
                const photoUrl = memberPhotoById.get(member.id);
                return (
                  <StaggerItem as="li" key={member.id}>
                    <Link
                      href={`/members/${member.id}`}
                      className="group/member focus-visible:ring-rust block focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <article className="flex h-full flex-col gap-4">
                        <div className="border-ink/25 hover:border-ink/45 rounded-md border border-dashed p-1.5 transition-colors">
                          {photoUrl ? (
                            <div className="bg-paper-2 relative aspect-[3/4] w-full overflow-hidden rounded-md">
                              <Image
                                src={photoUrl}
                                alt={`Portrait of ${member.honorific} ${member.fullName}`}
                                fill
                                loading="lazy"
                                sizes="(min-width: 1280px) 280px, (min-width: 1024px) 33vw, 50vw"
                                className="object-cover transition-transform duration-500 group-hover/member:scale-[1.02]"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <ImagePlaceholder ratio="3:4" label={member.initials} />
                          )}
                        </div>
                        <div className="flex flex-col gap-2 px-1">
                          <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                            {POSITION_LABELS[member.position]}
                          </p>
                          <h2 className="text-ink font-display group-hover/member:text-rust text-xl leading-tight font-bold">
                            {member.honorific} {member.fullName}
                          </h2>
                          {member.committees.length > 0 && (
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {member.committees.slice(0, 3).map((committee) => (
                                <li
                                  key={committee}
                                  className="border-ink/30 text-ink-soft rounded-pill inline-flex items-center border px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase"
                                >
                                  {committee}
                                </li>
                              ))}
                              {member.committees.length > 3 && (
                                <li className="text-ink-faint font-mono text-[10px]">
                                  +{member.committees.length - 3} more
                                </li>
                              )}
                            </ul>
                          )}
                          <span className="font-script text-ink-faint group-hover/member:text-rust mt-3 inline-flex items-center gap-1 text-base transition-colors">
                            View profile
                            <ArrowRight
                              className="size-3.5 transition-transform group-hover/member:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </article>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </div>
      </section>
    </>
  );
}
