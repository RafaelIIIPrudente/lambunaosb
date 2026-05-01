import 'server-only';

import type { Metadata } from 'next';

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
      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
        <FadeUp as="header" className="mb-12">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Council structure
          </p>
          <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
            Committees
          </h1>
          <p className="text-ink-soft font-script mt-6 max-w-2xl text-xl leading-snug">
            Resolutions and ordinances pass through committees before reaching the floor. The{' '}
            {tenant.displayName} maintains {standing.length} standing committee
            {standing.length === 1 ? '' : 's'} with continuing jurisdiction and {special.length}{' '}
            special committee
            {special.length === 1 ? '' : 's'} convened for time-limited concerns.
          </p>
        </FadeUp>

        {committees.length === 0 ? (
          <div className="border-ink/15 bg-paper-2 rounded-md border p-8">
            <p className="text-ink-soft font-script text-lg">
              The committee roster will appear here once seeded.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            <CommitteeGroup eyebrow="Standing" committees={standing} />
            {special.length > 0 && <CommitteeGroup eyebrow="Special" committees={special} />}
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
      <header className="border-ink/15 mb-6 flex items-baseline justify-between border-b pb-3">
        <h2
          id={`committees-${eyebrow.toLowerCase()}-heading`}
          className="text-rust font-mono text-[11px] font-semibold tracking-[0.22em] uppercase"
        >
          {eyebrow} · {committees.length}
        </h2>
      </header>
      <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {committees.map((c) => (
          <StaggerItem as="li" key={c.id}>
            <article className="border-ink/30 hover:border-ink/50 hover:shadow-e1 bg-paper flex h-full flex-col gap-2 rounded-md border border-dashed p-5 transition-all hover:-translate-y-0.5">
              <h3 className="text-ink font-display text-lg leading-snug font-semibold">{c.name}</h3>
              {c.description && (
                <p className="text-ink-soft text-sm leading-relaxed italic">{c.description}</p>
              )}
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </FadeUp>
  );
}
