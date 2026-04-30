'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

export default function MembersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: 'admin/members' },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md" role="alert">
        <CardEyebrow>Members error</CardEyebrow>
        <CardTitle>We couldn&apos;t load the members surface.</CardTitle>
        <CardDescription>
          The data layer returned an unexpected error. Your work is safe — try again, or reload the
          page. If this keeps happening, send the reference below to{' '}
          <a
            href="mailto:it@lambunao.gov.ph"
            className="text-rust focus-visible:ring-rust/40 rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            it@lambunao.gov.ph
          </a>
          .
        </CardDescription>
        {error.digest ? (
          <p className="text-ink-faint font-mono text-[11px] tracking-wide">
            Reference: {error.digest}
          </p>
        ) : null}
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => reset()} className="font-medium">
            <RefreshCw />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
