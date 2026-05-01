import 'server-only';

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { env } from '@/env';
import { getCurrentTenant } from '@/lib/db/queries/tenant';

import { SubmitQueryForm } from './_form';

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
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
      <section className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-8 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-8">
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

        <header className="mb-10">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            We read every message
          </p>
          <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
            Submit a query
          </h1>
          <p className="text-navy-primary font-display mt-5 max-w-2xl text-lg italic">
            Question, suggestion, complaint, or request for a public document. Replies are usually
            sent within 1–3 business days.
          </p>
        </header>

        <SubmitQueryForm />
      </section>
    </>
  );
}
