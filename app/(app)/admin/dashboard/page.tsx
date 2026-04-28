import Link from 'next/link';
import { ArrowRight, Calendar, Eye, FileText, Mic } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

const TODAY = new Date('2026-06-14T08:30:00+08:00');

const ACTIVITY = [
  { time: '09:32', actor: '[Secretary]', action: 'published', target: 'RES-2026-014' },
  {
    time: '08:14',
    actor: '[Vice Mayor]',
    action: 'approved transcript for',
    target: 'Session #13',
  },
  { time: '07:50', actor: 'System', action: 'auto-saved', target: '6 transcript revisions' },
  { time: 'Yest', actor: '[Member 5]', action: 'uploaded', target: 'RES-2026-013.pdf' },
];

export const metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <header>
        <p className="text-ink-faint mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          {format(TODAY, 'EEE · d MMM yyyy')}
        </p>
        <h1 className="text-ink font-script text-4xl leading-tight">Good morning, [Secretary].</h1>
        <p className="text-ink-soft mt-1 text-sm italic">4 things need your attention today.</p>
      </header>

      {/* 2×2 grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* RUST attention card — single per page */}
        <Card variant="attention">
          <CardEyebrow>
            <Calendar className="mr-1.5 inline size-3" aria-hidden="true" />
            Upcoming · in 2 days
          </CardEyebrow>
          <CardTitle className="font-script text-3xl">Regular Session #14</CardTitle>
          <CardDescription>Monday · 9:00 AM · Session Hall. 14 members confirmed.</CardDescription>
          <CardFooter>
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="bg-paper text-ink hover:bg-paper/85"
            >
              <Link href="/meetings/mtg-014">
                <Eye />
                Agenda
              </Link>
            </Button>
            <Link
              href="/meetings/mtg-014"
              className="text-paper hover:text-paper/85 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <Mic className="size-3.5" aria-hidden="true" />
              Open recorder
            </Link>
          </CardFooter>
        </Card>

        {/* Pending queries */}
        <Card>
          <CardEyebrow>Pending queries · 4 new</CardEyebrow>
          <CardTitle>4 citizens are waiting on a reply.</CardTitle>
          <CardDescription>Oldest: 2 days ago · Avg reply: 1.2 days.</CardDescription>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link href="/queries">
                Open inbox
                <ArrowRight />
              </Link>
            </Button>
            <span className="text-ink-faint font-mono text-xs">SLA: 3 days</span>
          </CardFooter>
        </Card>

        {/* Recent resolution */}
        <Card>
          <CardEyebrow>Recent resolution</CardEyebrow>
          <CardTitle>RES-2026-014 · Tricycle franchising</CardTitle>
          <CardDescription>
            Approved Jun 12 · sponsored by Hon. [Member 3] +1. Awaiting Mayor&apos;s signature.
          </CardDescription>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link href="/resolutions/res-2026-014">
                <FileText />
                Open PDF
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="font-script text-sm">
              <Link href="/resolutions/res-2026-014/history">Version history</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardEyebrow>Recent activity · last 24h</CardEyebrow>
          <ul className="text-ink mt-1 flex flex-col gap-1.5 text-sm">
            {ACTIVITY.map((event, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] items-start gap-3">
                <span className="text-ink-faint mt-0.5 font-mono text-[11px] tabular-nums">
                  {event.time}
                </span>
                <span className="leading-snug">
                  <span className="text-ink font-semibold">{event.actor}</span> {event.action}{' '}
                  <span className="font-mono text-[12px]">{event.target}</span>
                </span>
              </li>
            ))}
          </ul>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link href="/audit">
                Full audit log
                <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
