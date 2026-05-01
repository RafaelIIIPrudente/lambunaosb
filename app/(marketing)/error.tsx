'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';

export default function MarketingLandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: 'marketing/landing' },
    });
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-4 py-24 sm:px-8 md:py-32">
      <p className="text-rust font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
        Something went wrong
      </p>
      <h1 className="text-ink font-display text-4xl leading-tight font-bold md:text-5xl">
        We couldn&apos;t load the homepage.
      </h1>
      <p className="text-ink-soft font-script max-w-2xl text-xl leading-snug">
        Our team has been notified. Please try again — the site is fine, this is just an unexpected
        hiccup.
      </p>
      {error.digest ? (
        <p className="text-ink-faint font-mono text-xs tracking-wide">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button onClick={() => reset()} className="font-script text-base">
          <RefreshCw />
          Try again
        </Button>
        <Link
          href="/submit-query"
          className="font-script text-ink hover:text-rust gold-underline inline-flex items-center gap-1.5 text-lg"
        >
          If this keeps happening, contact us
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
