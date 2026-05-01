import 'server-only';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, ArrowLeft, ArrowRight, Search, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';
import { getAlertCount, getAuditActorOptions, getAuditEntries } from '@/lib/db/queries/audit';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { SB_MEMBER_TIER_ROLES } from '@/lib/validators/user';
import { cn } from '@/lib/utils';
import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS,
  type AuditCategoryValue,
  type AuditFilterInput,
  parseAuditSearchParams,
  QUICK_DATE_RANGE_LABELS,
  QUICK_DATE_RANGES,
  type QuickDateRange,
  resolveDateRange,
  targetTypeLabel,
} from '@/lib/validators/audit';

export const metadata = { title: 'Audit log' };

const CATEGORY_BADGE_VARIANT: Record<
  AuditCategoryValue,
  'success' | 'outline' | 'warn' | 'destructive' | 'new'
> = {
  resolution: 'success',
  meeting: 'success',
  query: 'outline',
  user: 'warn',
  member: 'outline',
  news: 'new',
  security: 'destructive',
  system: 'outline',
};

const ROLE_LABELS: Record<string, string> = {
  secretary: 'Secretary',
  vice_mayor: 'Vice Mayor',
  mayor: 'Mayor',
  sb_member: 'SB Member',
};

function buildHref(base: AuditFilterInput, patch: Partial<AuditFilterInput>): string {
  const next = { ...base, ...patch };
  const params = new URLSearchParams();
  if (next.category) params.set('category', next.category);
  if (next.actorId) params.set('actor', next.actorId);
  if (next.actionContains) params.set('q', next.actionContains);
  if (next.alertOnly) params.set('alert', '1');
  if (next.range) params.set('range', next.range);
  if (next.from) params.set('from', next.from);
  if (next.to) params.set('to', next.to);
  if (next.cursor) params.set('cursor', next.cursor);
  const qs = params.toString();
  return qs ? `/admin/audit?${qs}` : '/admin/audit';
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    actor?: string;
    q?: string;
    alert?: string;
    range?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}) {
  const ctx = await requireUser();

  // Defense-in-depth UI gate. The actual RLS currently grants sb_member
  // SELECT, but per product policy only Secretary/Vice Mayor/Mayor should
  // be browsing the audit log from this UI. Tracked follow-up: tighten RLS
  // to match.
  if ((SB_MEMBER_TIER_ROLES as readonly string[]).includes(ctx.profile.role)) {
    redirect('/admin/dashboard');
  }

  const params = await searchParams;
  const filters = parseAuditSearchParams(params);
  const { since, until } = resolveDateRange({
    range: filters.range ?? undefined,
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
  });
  const cursorDate = filters.cursor ? new Date(filters.cursor) : null;

  const [{ rows, nextCursor }, actorOptions, alertCount] = await Promise.all([
    safeBuildtimeQuery(
      () =>
        getAuditEntries({
          category: filters.category,
          actorId: filters.actorId,
          actionContains: filters.actionContains,
          alertOnly: filters.alertOnly,
          since,
          until,
          cursor: cursorDate,
        }),
      { rows: [], nextCursor: null },
    ),
    safeBuildtimeQuery(() => getAuditActorOptions(), []),
    safeBuildtimeQuery(() => getAlertCount({ since }), 0),
  ]);

  const hasFilters =
    filters.category !== null ||
    filters.actorId !== null ||
    filters.actionContains !== null ||
    filters.alertOnly ||
    filters.range !== null ||
    filters.from !== null ||
    filters.to !== null;

  const activeRange: QuickDateRange | null =
    filters.range ?? (filters.from || filters.to ? 'custom' : null);

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        accessory={
          <span className="text-ink-faint font-mono text-[11px] tracking-wide">
            {alertCount > 0 && (
              <span className="text-warn mr-3 font-semibold">
                {alertCount.toLocaleString()} alert{alertCount === 1 ? '' : 's'} ·
              </span>
            )}
            Append-only · admin-only
          </span>
        }
      />

      {filters.alertOnly || alertCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={buildHref(filters, { alertOnly: !filters.alertOnly, cursor: null })}
            aria-pressed={filters.alertOnly}
            className={cn(
              'rounded-pill font-script focus-visible:ring-rust/40 inline-flex h-8 items-center gap-1.5 border px-3 text-sm transition-colors outline-none focus-visible:ring-2',
              filters.alertOnly
                ? 'bg-warn border-warn text-paper'
                : 'border-warn/40 text-warn hover:bg-warn/10',
            )}
          >
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {filters.alertOnly ? 'Showing alerts only' : `Show alerts only (${alertCount})`}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col gap-6">
          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Category
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              <li>
                <Link
                  href={buildHref(filters, { category: null, cursor: null })}
                  aria-current={filters.category === null ? 'page' : undefined}
                  className={cn(
                    'hover:bg-paper-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                    filters.category === null
                      ? 'bg-paper-2 text-ink'
                      : 'text-ink-soft hover:text-ink',
                  )}
                >
                  <span className="font-script text-base">All categories</span>
                </Link>
              </li>
              {AUDIT_CATEGORIES.map((c) => {
                const active = filters.category === c;
                return (
                  <li key={c}>
                    <Link
                      href={buildHref(filters, { category: c, cursor: null })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'hover:bg-paper-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                        active ? 'bg-paper-2 text-ink' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      <span className="font-script text-base">{AUDIT_CATEGORY_LABELS[c]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Actor
            </p>
            <form action="/admin/audit" method="get">
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {filters.actionContains && (
                <input type="hidden" name="q" value={filters.actionContains} />
              )}
              {filters.alertOnly && <input type="hidden" name="alert" value="1" />}
              {filters.range && <input type="hidden" name="range" value={filters.range} />}
              {filters.from && <input type="hidden" name="from" value={filters.from} />}
              {filters.to && <input type="hidden" name="to" value={filters.to} />}
              <select
                name="actor"
                aria-label="Filter by actor"
                defaultValue={filters.actorId ?? ''}
                className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              >
                <option value="">Anyone</option>
                {actorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.fullName} · {ROLE_LABELS[opt.role] ?? opt.role}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" className="mt-2 w-full font-medium">
                Apply actor
              </Button>
            </form>
          </div>

          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Date range
            </p>
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_DATE_RANGES.filter((r) => r !== 'custom').map((r) => {
                const active = activeRange === r;
                return (
                  <li key={r}>
                    <Link
                      href={buildHref(filters, { range: r, from: null, to: null, cursor: null })}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'rounded-pill focus-visible:ring-rust/40 inline-flex h-7 items-center border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2',
                        active
                          ? 'bg-rust border-rust text-paper'
                          : 'border-ink/30 text-ink-soft hover:border-ink',
                      )}
                    >
                      {QUICK_DATE_RANGE_LABELS[r]}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <form action="/admin/audit" method="get" className="flex flex-col gap-2">
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {filters.actorId && <input type="hidden" name="actor" value={filters.actorId} />}
              {filters.actionContains && (
                <input type="hidden" name="q" value={filters.actionContains} />
              )}
              {filters.alertOnly && <input type="hidden" name="alert" value="1" />}
              <input type="hidden" name="range" value="custom" />
              <label className="text-ink-faint flex flex-col gap-1 font-mono text-[10px] tracking-wide uppercase">
                From
                <input
                  type="date"
                  name="from"
                  defaultValue={filters.from ?? ''}
                  className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                />
              </label>
              <label className="text-ink-faint flex flex-col gap-1 font-mono text-[10px] tracking-wide uppercase">
                To
                <input
                  type="date"
                  name="to"
                  defaultValue={filters.to ?? ''}
                  className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                />
              </label>
              <Button type="submit" size="sm" variant="outline" className="font-medium">
                Apply custom range
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <form action="/admin/audit" method="get" className="flex items-center gap-2">
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            {filters.actorId && <input type="hidden" name="actor" value={filters.actorId} />}
            {filters.alertOnly && <input type="hidden" name="alert" value="1" />}
            {filters.range && <input type="hidden" name="range" value={filters.range} />}
            {filters.from && <input type="hidden" name="from" value={filters.from} />}
            {filters.to && <input type="hidden" name="to" value={filters.to} />}
            <div className="relative flex-1">
              <Search
                className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={filters.actionContains ?? ''}
                placeholder="Search action (e.g. news.published, citizen_query.replied)…"
                aria-label="Search action"
                className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="font-medium">
              Search
            </Button>
            {hasFilters && (
              <Button asChild type="button" variant="ghost" size="sm" className="font-medium">
                <Link href="/admin/audit">
                  <X />
                  Clear
                </Link>
              </Button>
            )}
          </form>

          {rows.length === 0 ? (
            <Card className="max-w-xl">
              <CardEyebrow>{hasFilters ? 'No matches' : 'No audit entries yet'}</CardEyebrow>
              <CardTitle>
                {hasFilters ? 'No audit entries match these filters.' : 'The audit log is empty.'}
              </CardTitle>
              <CardDescription>
                {hasFilters
                  ? 'Try widening the date range or clearing the actor / category filters.'
                  : 'As soon as anyone writes a resolution, replies to a query, or invites a user, the event will appear here. Audit rows are append-only and visible to Secretary, Vice Mayor, and Mayor.'}
              </CardDescription>
              {hasFilters && (
                <CardFooter>
                  <Button asChild variant="outline" className="font-medium">
                    <Link href="/admin/audit">
                      <X />
                      Clear filters
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ) : (
            <>
              <ul
                aria-label="Audit log entries"
                className="border-ink/15 divide-ink/10 flex flex-col divide-y rounded-md border"
              >
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      'hover:bg-paper-2/60 transition-colors',
                      row.alert && 'bg-warn/5',
                    )}
                  >
                    <Link
                      href={`/admin/audit/${row.id}`}
                      className="focus-visible:bg-paper-2 focus-visible:ring-rust/30 grid items-center gap-3 px-3 py-3 outline-none focus-visible:ring-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-4"
                      aria-label={`View audit entry ${row.action} on ${format(row.createdAt, 'PPpp')}`}
                    >
                      <span
                        aria-hidden={!row.alert}
                        className={cn(
                          'mt-1.5 size-2 rounded-full sm:mt-0',
                          row.alert ? 'bg-warn' : 'bg-ink-ghost',
                        )}
                      >
                        {row.alert && <span className="sr-only">Alert: yes</span>}
                      </span>

                      <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <code className="text-ink font-mono text-sm font-medium">
                            {row.action}
                          </code>
                          <span className="text-ink-faint font-mono text-[11px]">
                            on {targetTypeLabel(row.targetType)}
                          </span>
                        </div>
                        <div className="text-ink-faint flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
                          <span className="truncate">
                            {row.actorName ??
                              (row.actorId ? '(deleted user)' : 'System / anonymous')}
                          </span>
                          {row.actorRole && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{ROLE_LABELS[row.actorRole] ?? row.actorRole}</span>
                            </>
                          )}
                          {row.ipInet && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{row.ipInet}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Badge variant={CATEGORY_BADGE_VARIANT[row.category]}>
                        {AUDIT_CATEGORY_LABELS[row.category]}
                      </Badge>

                      <time
                        dateTime={row.createdAt.toISOString()}
                        className="text-ink-faint font-mono text-[11px] whitespace-nowrap tabular-nums"
                        title={format(row.createdAt, 'PPpp')}
                      >
                        {formatDistanceToNowStrict(row.createdAt, { addSuffix: true })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>

              {(filters.cursor || nextCursor) && (
                <nav
                  aria-label="Pagination"
                  className="mt-3 flex items-center justify-between gap-2"
                >
                  {filters.cursor ? (
                    <Button asChild variant="ghost" size="sm" className="font-medium">
                      <Link
                        href={buildHref(filters, { cursor: null })}
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
                        href={buildHref(filters, { cursor: nextCursor })}
                        aria-label="Load older entries"
                      >
                        Older entries
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
