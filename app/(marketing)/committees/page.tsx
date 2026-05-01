import 'server-only';

import type { Metadata } from 'next';

import { DEFAULT_LAMBUNAO_SLIDES, PhotoCarousel } from '@/components/marketing/photo-carousel';
import { FadeUp } from '@/components/motion/fade-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { getCommittees } from '@/lib/db/queries/committees';
import { getCurrentTenant } from '@/lib/db/queries/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const title = `Committees · ${tenant.displayName}`;
  const description = `The standing and special committees of the ${tenant.displayName}, organised by jurisdiction and policy focus.`;
  return {
    title,
    description,
    alternates: { canonical: '/committees' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/committees',
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

export default async function CommitteesPage() {
  const [committees, tenant] = await Promise.all([getCommittees(), getCurrentTenant()]);

  const standing = committees.filter((c) => c.isStanding);
  const special = committees.filter((c) => !c.isStanding);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Committees of ${tenant.displayName}`,
    itemListElement: committees.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* Editorial type-led hero — committees is structural, not photographic */}
      <section className="bg-paper-2 border-ink/12 border-b">
        <FadeUp
          as="div"
          className="mx-auto w-full max-w-[1240px] px-4 pt-32 pb-20 sm:px-8 md:pt-40 md:pb-28"
        >
          <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
            Council structure · {committees.length} committees
          </p>
          <h1 className="text-ink font-display text-6xl leading-[0.95] font-bold tracking-tight md:text-7xl lg:text-[96px]">
            Where the work
            <br />
            <em className="font-display italic">happens</em>.
          </h1>
          <p className="text-navy-primary font-display mt-10 max-w-[58ch] text-xl leading-relaxed italic md:text-2xl">
            Resolutions and ordinances pass through committees before reaching the floor. The{' '}
            {tenant.displayName} maintains {standing.length} standing committee
            {standing.length === 1 ? '' : 's'} with continuing jurisdiction and {special.length}{' '}
            special committee
            {special.length === 1 ? '' : 's'} convened for time-limited concerns.
          </p>
        </FadeUp>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 md:py-28">
        {committees.length === 0 ? (
          <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
            <p className="text-ink-soft font-script text-lg">
              The committee roster will appear here once seeded.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-20">
            <CommitteeGroup eyebrow="Standing" committees={standing} />
            {special.length > 0 && (
              <>
                <PhotoCarousel
                  eyebrow="Mga eksena · between sessions"
                  slides={DEFAULT_LAMBUNAO_SLIDES.slice(0, 4)}
                />
                <CommitteeGroup eyebrow="Special" committees={special} />
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function CommitteeGroup({
  eyebrow,
  committees,
}: {
  eyebrow: string;
  committees: Awaited<ReturnType<typeof getCommittees>>;
}) {
  return (
    <FadeUp as="section" aria-labelledby={`committees-${eyebrow.toLowerCase()}-heading`}>
      <header className="border-ink/15 mb-10 flex items-baseline justify-between border-b pb-4">
        <h2
          id={`committees-${eyebrow.toLowerCase()}-heading`}
          className="text-rust font-mono text-[11px] font-semibold tracking-[0.22em] uppercase"
        >
          <span className="bg-gold mr-3 inline-block h-px w-6 align-middle" />
          {eyebrow} · {committees.length}
        </h2>
        <span className="text-ink-faint font-script text-lg italic">
          {eyebrow === 'Standing' ? 'Continuing jurisdiction' : 'Time-limited'}
        </span>
      </header>
      <Stagger as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {committees.map((c, idx) => (
          <StaggerItem as="li" key={c.id}>
            <article className="border-ink/30 hover:border-ink/55 hover:shadow-e1 bg-paper relative flex h-full flex-col gap-3 rounded-md border border-dashed p-6 transition-all hover:-translate-y-0.5">
              <span className="text-ink-faint absolute top-4 right-5 font-mono text-[10px] tracking-[0.18em]">
                №&nbsp;{String(idx + 1).padStart(2, '0')}
              </span>
              <h3 className="text-ink font-display max-w-[20ch] pr-12 text-xl leading-snug font-semibold">
                {c.name}
              </h3>
              {c.description && (
                <p className="text-navy-primary font-display text-base leading-relaxed italic">
                  {c.description}
                </p>
              )}
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </FadeUp>
  );
}
