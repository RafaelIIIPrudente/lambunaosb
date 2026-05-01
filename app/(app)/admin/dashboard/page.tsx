import Link from 'next/link';
import { ArrowRight, Calendar, Eye, FileText, Mic } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';
import { type DashboardData, getDashboardData } from '@/lib/db/queries/dashboard';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';

export const metadata = {
  title: 'Dashboard',
};

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function greetingPrefix(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function relativeDay(target: Date, now: Date): string {
  const days = Math.round((target.getTime() - now.getTime()) / ONE_DAY_MS);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${Math.abs(days)} days ago`;
}

function humanizeAction(action: string): string {
  const verb = action.split('.')[1] ?? action;
  return verb.replace(/_/g, ' ');
}

function humanizeTargetType(targetType: string): string {
  return targetType.replace(/_/g, ' ');
}

export default async function DashboardPage() {
  const ctx = await requireUser();
  const data = await safeBuildtimeQuery<DashboardData>(() => getDashboardData(), {
    upcomingMeeting: null,
    pendingQueriesCount: 0,
    queryCounts: {
      all: 0,
      new: 0,
      in_progress: 0,
      awaiting_citizen: 0,
      answered: 0,
      closed: 0,
      spam: 0,
    },
    recentResolution: null,
    recentActivity: [],
  });
  const now = new Date();

  const upcoming = data.upcomingMeeting;
  const recentResolution = data.recentResolution;
  const recentActivity = data.recentActivity;
  const pendingCount = data.pendingQueriesCount;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-ink-faint mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          {format(now, 'EEE · d MMM yyyy')}
        </p>
        <h1 className="text-ink font-script text-4xl leading-tight">
          {greetingPrefix(now)}, {firstName(ctx.profile.fullName)}.
        </h1>
        <p className="text-ink-soft mt-1 text-sm italic">
          {pendingCount === 0
            ? 'Inbox is clear. Quiet day ahead.'
            : pendingCount === 1
              ? '1 citizen query needs your attention today.'
              : `${pendingCount} citizen queries need your attention today.`}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* RUST attention card — Upcoming meeting */}
        <Card variant="attention">
          <CardEyebrow>
            <Calendar className="mr-1.5 inline size-3" aria-hidden="true" />
            {upcoming ? `Upcoming · ${relativeDay(upcoming.date, now)}` : 'Upcoming'}
          </CardEyebrow>
          {upcoming ? (
            <>
              <CardTitle className="font-script text-3xl">{upcoming.title}</CardTitle>
              <CardDescription>
                {format(upcoming.date, 'EEEE · h:mm a')} · {upcoming.type.replace(/_/g, ' ')}{' '}
                session.
              </CardDescription>
              <CardFooter>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="bg-paper text-ink hover:bg-paper/85"
                >
                  <Link
                    href={`/admin/meetings/${upcoming.id}`}
                    aria-label={`View agenda for ${upcoming.title}`}
                  >
                    <Eye />
                    Agenda
                  </Link>
                </Button>
                <Link
                  href={`/admin/meetings/${upcoming.id}`}
                  className="text-paper hover:text-paper/85 focus-visible:ring-paper/40 inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                  aria-label={`Open recorder for ${upcoming.title}`}
                >
                  <Mic className="size-3.5" aria-hidden="true" />
                  Open recorder
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardTitle className="font-script text-3xl">No sessions scheduled.</CardTitle>
              <p className="text-paper/85 font-mono text-xs">
                The next regular session will appear here once it&apos;s on the calendar.
              </p>
              <CardFooter>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="bg-paper text-ink hover:bg-paper/85"
                >
                  <Link href="/admin/meetings/new" aria-label="Schedule a new meeting">
                    <Calendar />
                    Schedule meeting
                  </Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Pending queries */}
        <Card>
          <CardEyebrow>
            Pending queries · {pendingCount} {pendingCount === 1 ? 'open' : 'open'}
          </CardEyebrow>
          {pendingCount === 0 ? (
            <>
              <CardTitle>No citizen queries waiting.</CardTitle>
              <p className="text-ink-faint font-mono text-xs">
                All queries answered or closed. Inbox is clear.
              </p>
              <CardFooter>
                <Button variant="outline" size="sm" asChild className="font-medium">
                  <Link href="/admin/queries" aria-label="Open citizen queries inbox">
                    Open inbox
                    <ArrowRight />
                  </Link>
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardTitle>
                {pendingCount === 1
                  ? '1 citizen is waiting on a reply.'
                  : `${pendingCount} citizens are waiting on a reply.`}
              </CardTitle>
              <CardDescription>
                {data.queryCounts.new} new · {data.queryCounts.in_progress} in progress ·{' '}
                {data.queryCounts.answered} answered.
              </CardDescription>
              <CardFooter>
                <Button variant="outline" size="sm" asChild className="font-medium">
                  <Link href="/admin/queries" aria-label="Open citizen queries inbox">
                    Open inbox
                    <ArrowRight />
                  </Link>
                </Button>
                <span className="text-ink-faint font-mono text-xs">SLA: 3 days</span>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Recent resolution */}
        <Card>
          <CardEyebrow>Recent resolution</CardEyebrow>
          {recentResolution ? (
            <>
              <CardTitle>
                {recentResolution.number} · {recentResolution.title}
              </CardTitle>
              <CardDescription>
                {recentResolution.publishedAt
                  ? `Published ${format(recentResolution.publishedAt, 'MMM d, yyyy')}`
                  : recentResolution.dateFiled
                    ? `Filed ${recentResolution.dateFiled}`
                    : `Status: ${recentResolution.status.replace(/_/g, ' ')}`}
                {recentResolution.primarySponsorName
                  ? ` · sponsored by ${recentResolution.primarySponsorName}`
                  : ''}
                {recentResolution.coSponsorCount > 0
                  ? ` +${recentResolution.coSponsorCount} co-sponsor${recentResolution.coSponsorCount === 1 ? '' : 's'}`
                  : ''}
                .
              </CardDescription>
              <CardFooter>
                <Button variant="outline" size="sm" asChild className="font-medium">
                  <Link
                    href={`/admin/resolutions/${recentResolution.id}`}
                    aria-label={`Open resolution ${recentResolution.number}`}
                  >
                    <FileText />
                    Open
                  </Link>
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardTitle>No resolutions yet.</CardTitle>
              <p className="text-ink-faint font-mono text-xs">
                Drafts and approved resolutions will appear here once filed.
              </p>
              <CardFooter>
                <Button variant="outline" size="sm" asChild className="font-medium">
                  <Link href="/admin/resolutions/new" aria-label="Draft a new resolution">
                    <FileText />
                    Draft new
                  </Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <CardEyebrow>Recent activity · last 24h</CardEyebrow>
          {recentActivity.length === 0 ? (
            <p className="text-ink-faint font-mono text-xs">No activity in the audit log yet.</p>
          ) : (
            <ul className="text-ink mt-1 flex flex-col gap-1.5 text-sm">
              {recentActivity.map((event) => (
                <li key={event.id} className="grid grid-cols-[auto_1fr] items-start gap-3">
                  <span className="text-ink-faint mt-0.5 font-mono text-[11px] tabular-nums">
                    {format(event.createdAt, 'HH:mm')}
                  </span>
                  <span className="leading-snug">
                    <span className="text-ink font-semibold">{event.actorName ?? 'System'}</span>{' '}
                    {humanizeAction(event.action)}{' '}
                    <span className="font-mono text-[12px]">
                      {humanizeTargetType(event.targetType)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link href="/admin/audit" aria-label="Open the full audit log">
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
