import 'server-only';

import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, ArrowRight, Inbox, Search, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';
import {
  getAssignmentCounts,
  getCitizenQueries,
  getCitizenQueryStatusCounts,
  type CitizenQueryStatus,
} from '@/lib/db/queries/citizen-queries';
import { cn } from '@/lib/utils';
import { CITIZEN_QUERY_CATEGORY_LABELS } from '@/lib/validators/citizen-query';
import {
  CITIZEN_QUERY_STATUSES,
  CITIZEN_QUERY_STATUS_LABELS,
} from '@/lib/validators/citizen-query-admin';

export const metadata = { title: 'Citizen queries' };

type StatusFilter = CitizenQueryStatus | 'all';
type AssignedFilter = 'all' | 'mine' | 'unassigned';

const STATUS_BADGE_VARIANT: Record<
  CitizenQueryStatus,
  'new' | 'outline' | 'success' | 'warn' | 'destructive'
> = {
  new: 'new',
  in_progress: 'warn',
  awaiting_citizen: 'outline',
  answered: 'success',
  closed: 'outline',
  spam: 'destructive',
};

function isStatusFilter(value: string | undefined): value is StatusFilter {
  if (!value) return false;
  if (value === 'all') return true;
  return (CITIZEN_QUERY_STATUSES as readonly string[]).includes(value);
}

function isAssignedFilter(value: string | undefined): value is AssignedFilter {
  return value === 'all' || value === 'mine' || value === 'unassigned';
}

type FilterState = {
  status: StatusFilter;
  assigned: AssignedFilter;
  q: string;
  cursor: string | null;
};

function buildHref(base: FilterState, patch: Partial<FilterState>): string {
  const next = { ...base, ...patch };
  const params = new URLSearchParams();
  if (next.status !== 'all') params.set('status', next.status);
  if (next.assigned !== 'all') params.set('assigned', next.assigned);
  if (next.q) params.set('q', next.q);
  if (next.cursor) params.set('cursor', next.cursor);
  const qs = params.toString();
  return qs ? `/admin/queries?${qs}` : '/admin/queries';
}

function parseCursor(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function QueriesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assigned?: string; q?: string; cursor?: string }>;
}) {
  const ctx = await requireUser();
  const params = await searchParams;
  const status: StatusFilter = isStatusFilter(params.status) ? params.status : 'all';
  const assigned: AssignedFilter = isAssignedFilter(params.assigned) ? params.assigned : 'all';
  const q = (params.q ?? '').trim();
  const cursorDate = parseCursor(params.cursor);
  const cursorString = cursorDate?.toISOString() ?? null;
  const baseFilters: FilterState = { status, assigned, q, cursor: cursorString };

  const [{ rows, nextCursor }, statusCounts, assignmentCounts] = await Promise.all([
    getCitizenQueries({
      status: status === 'all' ? undefined : status,
      assignedTo:
        assigned === 'unassigned' ? 'unassigned' : assigned === 'mine' ? ctx.userId : undefined,
      q: q || undefined,
      cursor: cursorDate ?? undefined,
    }),
    getCitizenQueryStatusCounts(),
    getAssignmentCounts(ctx.userId),
  ]);

  const statusFilterOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: statusCounts.all },
    ...CITIZEN_QUERY_STATUSES.map((s) => ({
      value: s,
      label: CITIZEN_QUERY_STATUS_LABELS[s],
      count: statusCounts[s],
    })),
  ];

  const assignedFilterOptions: { value: AssignedFilter; label: string; count: number | null }[] = [
    { value: 'all', label: 'Anyone', count: null },
    { value: 'mine', label: 'Assigned to me', count: assignmentCounts.mine },
    { value: 'unassigned', label: 'Unassigned', count: assignmentCounts.unassigned },
  ];

  const hasFilters = status !== 'all' || assigned !== 'all' || q.length > 0;

  return (
    <div>
      <AdminPageHeader
        title="Citizen queries"
        accessory={
          <span className="text-ink-faint font-mono text-[11px] tracking-wide">
            {statusCounts.new > 0 && (
              <span className="text-rust mr-3 font-semibold">{statusCounts.new} new ·</span>
            )}
            {statusCounts.all} total
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-6">
          <div>
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
          </div>

          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Assigned
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {assignedFilterOptions.map((opt) => {
                const active = assigned === opt.value;
                return (
                  <li key={opt.value}>
                    <Link
                      href={buildHref(baseFilters, { assigned: opt.value, cursor: null })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'hover:bg-paper-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                        active ? 'bg-paper-2 text-ink' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      <span className="font-script text-base">{opt.label}</span>
                      {opt.count !== null && (
                        <span className="text-ink-faint font-mono text-[11px] tabular-nums">
                          {opt.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <form action="/admin/queries" method="get" className="flex items-center gap-2">
            {status !== 'all' && <input type="hidden" name="status" value={status} />}
            {assigned !== 'all' && <input type="hidden" name="assigned" value={assigned} />}
            <div className="relative flex-1">
              <Search
                className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by ref, subject, name, or email…"
                aria-label="Search queries"
                className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="font-medium">
              Search
            </Button>
            {hasFilters && (
              <Button asChild type="button" variant="ghost" size="sm" className="font-medium">
                <Link href="/admin/queries">
                  <X />
                  Clear
                </Link>
              </Button>
            )}
          </form>

          {rows.length === 0 ? (
            <Card className="max-w-xl">
              <CardEyebrow>{hasFilters ? 'No matches' : 'Inbox is empty'}</CardEyebrow>
              <CardTitle>
                {hasFilters
                  ? 'No queries match these filters.'
                  : 'No citizen queries have come in yet.'}
              </CardTitle>
              <CardDescription>
                {hasFilters
                  ? 'Try clearing the filters, or check back later.'
                  : 'New submissions from /submit-query will land here. The Office of the Sanggunian aims to reply within 1–3 business days.'}
              </CardDescription>
              <CardFooter>
                {hasFilters ? (
                  <Button asChild variant="outline" className="font-medium">
                    <Link href="/admin/queries">
                      <X />
                      Clear filters
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="font-medium">
                    <Link href="/submit-query" target="_blank" rel="noopener noreferrer">
                      <Inbox />
                      View public submission form
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <>
              <ul className="border-ink/15 divide-ink/10 flex flex-col divide-y rounded-md border">
                {rows.map((row) => {
                  const isUnread = row.status === 'new';
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        'hover:bg-paper-2/60 transition-colors',
                        isUnread && 'bg-rust/5',
                      )}
                    >
                      <Link
                        href={`/admin/queries/${row.id}`}
                        className="focus-visible:bg-paper-2 focus-visible:ring-rust/30 grid items-center gap-3 px-3 py-3 outline-none focus-visible:ring-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-4"
                        aria-label={`Open ${row.ref} — ${row.subject}`}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mt-1.5 size-2 rounded-full sm:mt-0',
                            row.status === 'new' && 'bg-rust',
                            row.status === 'in_progress' && 'bg-gold',
                            row.status === 'awaiting_citizen' && 'bg-ink-ghost',
                            row.status === 'answered' && 'bg-success',
                            (row.status === 'closed' || row.status === 'spam') && 'bg-ink-ghost',
                          )}
                        />

                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
                              {row.ref}
                            </span>
                            <span className={cn('text-ink truncate', isUnread && 'font-semibold')}>
                              {row.subject}
                            </span>
                          </div>
                          <div className="text-ink-faint flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
                            <span className="truncate">{row.submitterName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{row.submitterEmail}</span>
                            <span aria-hidden="true">·</span>
                            <span>{CITIZEN_QUERY_CATEGORY_LABELS[row.category]}</span>
                            {row.assignedToName && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>→ {row.assignedToName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                          {CITIZEN_QUERY_STATUS_LABELS[row.status]}
                        </Badge>

                        <span
                          className="text-ink-faint font-mono text-[11px] whitespace-nowrap tabular-nums"
                          title={format(row.submittedAt, 'PPpp')}
                        >
                          {formatDistanceToNowStrict(row.submittedAt, { addSuffix: true })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

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
                        aria-label="Load older queries"
                      >
                        Older queries
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
