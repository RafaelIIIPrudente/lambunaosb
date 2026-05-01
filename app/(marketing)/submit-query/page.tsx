import 'server-only';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock4, Mail, Shield } from 'lucide-react';

import { FadeUp } from '@/components/motion/fade-up';
import { env } from '@/env';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { FALLBACK_TENANT, getCurrentTenant } from '@/lib/db/queries/tenant';

import { SubmitQueryForm } from './_form';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await safeBuildtimeQuery(() => getCurrentTenant(), FALLBACK_TENANT);
  const title = `Submit a query · ${tenant.displayName}`;
  const description = `Send ${tenant.displayName} a question or request. Acknowledged within 24 hours.`;
  return {
    title,
    description,
    alternates: { canonical: '/submit-query' },
    openGraph: {
      type: 'website',
      locale: 'en_PH',
      url: '/submit-query',
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

export default function SubmitQueryPage() {
  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: `${SITE_URL}/submit-query`,
    mainEntity: { '@id': `${SITE_URL}#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />

      {/* Compact photo header — image left, lede right */}
      <section className="bg-paper-2 border-ink/12 border-b">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 pt-28 pb-12 sm:px-8 md:grid-cols-[1fr_1.2fr] md:items-end md:gap-16 md:pt-36 md:pb-16">
          <FadeUp as="figure" className="relative">
            <div className="border-ink/30 rounded-md border border-dashed p-1.5">
              <div className="bg-paper-2 relative aspect-[4/3] w-full overflow-hidden rounded-md">
                <Image
                  src="/lambunao/cec-infocenter.png"
                  alt="The Citizens Engagement Center of Lambunao — where queries are received"
                  fill
                  priority
                  sizes="(min-width: 768px) 520px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
            <figcaption className="text-ink-faint mt-2 font-mono text-[11px] tracking-wide italic">
              Citizens Engagement Center · where every query is logged.
            </figcaption>
          </FadeUp>

          <FadeUp as="div" delay={0.1}>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="text-ink-faint flex items-center gap-2 font-mono text-xs">
                <li>
                  <Link href="/" className="hover:text-rust">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3" />
                </li>
                <li className="text-ink" aria-current="page">
                  Submit a query
                </li>
              </ol>
            </nav>

            <p className="text-rust mb-4 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
              We read every message
            </p>
            <h1 className="text-ink font-display text-5xl leading-[1.0] font-bold tracking-tight md:text-6xl lg:text-7xl">
              Submit a <em className="font-display italic">query</em>.
            </h1>
            <p className="text-navy-primary font-display mt-6 max-w-[44ch] text-xl leading-relaxed italic md:text-2xl">
              Question, suggestion, complaint, or request for a public document. Replies are usually
              sent within 1–3 business days.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              <li className="border-ink/25 flex items-start gap-3 rounded-md border p-4">
                <Clock4 className="text-rust mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-ink-faint font-mono text-[10px] tracking-[0.18em] uppercase">
                    Acknowledged
                  </p>
                  <p className="text-ink font-display text-sm leading-tight italic">within 24 hr</p>
                </div>
              </li>
              <li className="border-ink/25 flex items-start gap-3 rounded-md border p-4">
                <Mail className="text-rust mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-ink-faint font-mono text-[10px] tracking-[0.18em] uppercase">
                    Replied
                  </p>
                  <p className="text-ink font-display text-sm leading-tight italic">
                    1–3 business days
                  </p>
                </div>
              </li>
              <li className="border-ink/25 flex items-start gap-3 rounded-md border p-4">
                <Shield className="text-rust mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-ink-faint font-mono text-[10px] tracking-[0.18em] uppercase">
                    Privacy
                  </p>
                  <p className="text-ink font-display text-sm leading-tight italic">RA 10173</p>
                </div>
              </li>
            </ul>
          </FadeUp>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[820px] px-4 py-16 sm:px-8 md:py-24">
        <SubmitQueryForm />
      </section>
    </>
  );
}
