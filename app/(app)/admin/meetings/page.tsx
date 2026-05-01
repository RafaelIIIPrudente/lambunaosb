import 'server-only';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Edit3, Eye, Plus, Search, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import {
  getMeetingsList,
  getMeetingStatusCounts,
  getMeetingYears,
  type MeetingStatus,
} from '@/lib/db/queries/meetings';
import { cn } from '@/lib/utils';
import {
  MEETING_STATUS_LABELS,
  MEETING_STATUSES,
  type MeetingStatusValue,
  MEETING_TYPE_LABELS,
  MEETING_TYPES,
  type MeetingTypeValue,
} from '@/lib/validators/meeting';

export const metadata = { title: 'Meetings' };

type StatusFilter = MeetingStatusValue | 'all';
type TypeFilter = MeetingTypeValue | 'all';

const STATUS_BADGE_VARIANT: Record<
  MeetingStatusValue,
  'success' | 'outline' | 'warn' | 'destructive' | 'new'
> = {
  scheduled: 'outline',
  in_progress: 'new',
  awaiting_transcript: 'outline',
  transcript_in_review: 'warn',
  transcript_approved: 'success',
  minutes_published: 'success',
  cancelled: 'destructive',
};

function isStatusFilter(value: string | undefined): value is StatusFilter {
  if (!value) return false;
  if (value === 'all') return true;
  return (MEETING_STATUSES as readonly string[]).includes(value);
}

function isTypeFilter(value: string | undefined): value is TypeFilter {
  if (!value) return false;
  if (value === 'all') return true;
  return (MEETING_TYPES as readonly string[]).includes(value);
}

type FilterState = {
  status: StatusFilter;
  type: TypeFilter;
  year: string;
  q: string;
  cursor: string | null;
};

function buildHref(base: FilterState, patch: Partial<FilterState>): string {
  const next = { ...base, ...patch };
  const params = new URLSearchParams();
  if (next.status !== 'all') params.set('status', next.status);
  if (next.type !== 'all') params.set('type', next.type);
  if (next.year) params.set('year', next.year);
  if (next.q) params.set('q', next.q);
  if (next.cursor) params.set('cursor', next.cursor);
  const qs = params.toString();
  return qs ? `/admin/meetings?${qs}` : '/admin/meetings';
}

function parseCursor(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function MeetingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type?: string;
    year?: string;
    q?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const status: StatusFilter = isStatusFilter(params.status) ? params.status : 'all';
  const type: TypeFilter = isTypeFilter(params.type) ? params.type : 'all';
  const yearParam = params.year?.trim() ?? '';
  const yearNumber = /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined;
  const q = (params.q ?? '').trim();
  const cursorDate = parseCursor(params.cursor);
  const cursorString = cursorDate?.toISOString() ?? null;

  const baseFilters: FilterState = {
    status,
    type,
    year: yearNumber ? String(yearNumber) : '',
    q,
    cursor: cursorString,
  };

  const [{ rows, nextCursor }, statusCounts, years] = await Promise.all([
    getMeetingsList({
      ...(status !== 'all' ? { status: status as MeetingStatus } : {}),
      ...(type !== 'all' ? { type: type as MeetingTypeValue } : {}),
      ...(yearNumber ? { year: yearNumber } : {}),
      ...(q ? { q } : {}),
      ...(cursorDate ? { cursor: cursorDate } : {}),
    }),
    getMeetingStatusCounts(),
    getMeetingYears(),
  ]);

  const totalCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  const statusFilterOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: totalCount },
    ...MEETING_STATUSES.map((s) => ({
      value: s,
      label: MEETING_STATUS_LABELS[s],
      count: statusCounts[s],
    })),
  ];

  const hasFilters = status !== 'all' || type !== 'all' || !!yearNumber || q.length > 0;

  return (
    <div>
      <AdminPageHeader
        title="Meetings"
        accessory={
          <div className="flex items-center gap-3">
            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
              {totalCount} total
            </span>
            <Button className="font-script text-base" asChild>
              <Link href="/admin/meetings/new" aria-label="Schedule a new meeting">
                <Plus />
                New meeting
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Status
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {statusFilterOptions.map((opt) => {
              const active = status === opt.value;
              return (
                <li key={opt.value}>
                  <Link
                    href={buildHref(baseFilters, { status: opt.value, cursor: null })}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'hover:bg-paper-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                      active ? 'bg-paper-2 text-ink' : 'text-ink-soft hover:text-ink',
                    )}
                  >
                    <span className="font-script text-base">{opt.label}</span>
                    <span className="text-ink-faint font-mono text-[11px] tabular-nums">
                      {opt.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <form
            action="/admin/meetings"
            method="get"
            className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
            role="search"
            aria-label="Search and filter meetings"
          >
            {status !== 'all' && <input type="hidden" name="status" value={status} />}
            <div className="relative">
              <Search
                className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by title or location…"
                aria-label="Search meetings"
                className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
              />
            </div>
            <select
              name="type"
              defaultValue={type === 'all' ? '' : type}
              aria-label="Filter by meeting type"
              className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-10 rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-2"
            >
              <option value="">All types</option>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEETING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              name="year"
              defaultValue={yearParam}
              aria-label="Filter by year"
              className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-10 rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-2"
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="sm" className="font-medium">
                Apply
              </Button>
              {hasFilters && (
                <Button asChild type="button" variant="ghost" size="sm" className="font-medium">
                  <Link href="/admin/meetings" aria-label="Clear filters">
                    <X />
                  </Link>
                </Button>
              )}
            </div>
          </form>

          {rows.length === 0 ? (
            <Card className="max-w-xl">
              <CardEyebrow>{hasFilters ? 'No matches' : 'No meetings yet'}</CardEyebrow>
              <CardTitle>
                {hasFilters
                  ? 'No meetings match these filters.'
                  : 'No meetings have been scheduled yet.'}
              </CardTitle>
              <CardDescription>
                {hasFilters
                  ? 'Try clearing the filters, or check back later.'
                  : 'Schedule the first session — title, type, date, agenda. Recording, transcription, and minutes happen on the detail page once the meeting begins.'}
              </CardDescription>
              <CardFooter>
                {hasFilters ? (
                  <Button asChild variant="outline" className="font-medium">
                    <Link href="/admin/meetings">
                      <X />
                      Clear filters
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="font-medium">
                    <Link href="/admin/meetings/new">
                      <Plus />
                      Schedule the first meeting
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <>
              <ul className="flex flex-col gap-3 md:hidden">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/meetings/${row.id}`}
                      className="border-ink/15 hover:bg-paper-2/60 focus-visible:ring-rust/40 block rounded-md border p-4 transition-colors outline-none focus-visible:ring-2"
                    >
                      <p className="text-ink-soft font-mono text-xs">
                        {format(row.date, 'MMM d, yyyy · h:mm a')}
                      </p>
                      <p className="text-ink font-script mt-1 text-base leading-snug">
                        {row.title}
                      </p>
                      <div className="text-ink-soft mt-2 flex flex-wrap items-center gap-2 text-xs italic">
                        <Badge variant={STATUS_BADGE_VARIANT[row.rawStatus]}>
                          {MEETING_STATUS_LABELS[row.rawStatus]}
                        </Badge>
                        <span>{MEETING_TYPE_LABELS[row.type]}</span>
                        {row.audioLength && (
                          <span className="font-mono not-italic">{row.audioLength}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <table className="hidden w-full text-sm md:table">
                <thead>
                  <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
                    <th scope="col" className="w-40 py-3 pr-2 text-left font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-3 pr-2 text-left font-medium">
                      Title
                    </th>
                    <th scope="col" className="w-32 py-3 pr-2 text-left font-medium">
                      Type
                    </th>
                    <th scope="col" className="w-28 py-3 pr-2 text-left font-medium">
                      Audio
                    </th>
                    <th scope="col" className="w-32 py-3 pr-2 text-left font-medium">
                      Transcript
                    </th>
                    <th scope="col" className="w-40 py-3 pr-2 text-left font-medium">
                      Status
                    </th>
                    <th scope="col" className="w-24 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-ink/15 hover:bg-paper-2/60 border-b border-dashed transition-colors"
                    >
                      <td className="text-ink-soft py-3.5 pr-2 font-mono text-xs">
                        {format(row.date, 'MMM d, yyyy · h:mm a')}
                      </td>
                      <td className="py-3.5 pr-2">
                        <Link
                          href={`/admin/meetings/${row.id}`}
                          className="text-ink hover:text-rust focus-visible:ring-rust/40 font-script rounded text-base outline-none focus-visible:ring-2"
                        >
                          {row.title}
                        </Link>
                        <p className="text-ink-faint mt-0.5 font-mono text-[10px]">
                          № {row.sequenceNumber} · {row.location}
                        </p>
                      </td>
                      <td className="text-ink-soft py-3.5 pr-2 text-xs italic">
                        {MEETING_TYPE_LABELS[row.type]}
                      </td>
                      <td className="text-ink-soft py-3.5 pr-2 font-mono text-xs tabular-nums">
                        {row.audioLength ?? '—'}
                      </td>
                      <td className="text-ink-soft font-script py-3.5 pr-2 text-sm italic">
                        {row.transcript ?? '—'}
                      </td>
                      <td className="py-3.5 pr-2">
                        <Badge variant={STATUS_BADGE_VARIANT[row.rawStatus]}>
                          {MEETING_STATUS_LABELS[row.rawStatus]}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label={`Open ${row.title}`}
                          >
                            <Link href={`/admin/meetings/${row.id}`}>
                              <Eye />
                            </Link>
                          </Button>
                          {row.rawStatus === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`Edit ${row.title}`}
                            >
                              <Link href={`/admin/meetings/${row.id}/edit`}>
                                <Edit3 />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(cursorString || nextCursor) && (
                <nav
                  aria-label="Pagination"
                  className="mt-3 flex items-center justify-between gap-2"
                >
                  {cursorString ? (
                    <Button asChild variant="ghost" size="sm" className="font-medium">
                      <Link
                        href={buildHref(baseFilters, { cursor: null })}
                        aria-label="Jump to the most recent page"
                      >
                        <ArrowLeft />
                        First page
                      </Link>
                    </Button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  {nextCursor ? (
                    <Button asChild variant="outline" size="sm" className="font-medium">
                      <Link
                        href={buildHref(baseFilters, { cursor: nextCursor })}
                        aria-label="Load older meetings"
                      >
                        Older meetings
                        <ArrowRight />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-ink-faint font-mono text-[11px] italic">
                      End of results
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
