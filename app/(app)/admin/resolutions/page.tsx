import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, FileText, Plus, Search, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import {
  getResolutionCommittees,
  getResolutionsList,
  getResolutionSponsors,
  getResolutionYears,
  type ResolutionStatus,
} from '@/lib/db/queries/resolutions';
import { cn } from '@/lib/utils';
import {
  RESOLUTION_STATUS_LABELS,
  RESOLUTION_STATUSES,
  type ResolutionStatusValue,
} from '@/lib/validators/resolution';

export const metadata = { title: 'Resolutions' };

type FilterValue = ResolutionStatusValue | 'all';

const STATUS_BADGE_VARIANT: Record<
  ResolutionStatusValue,
  'success' | 'outline' | 'destructive' | 'warn'
> = {
  draft: 'warn',
  pending: 'outline',
  approved: 'success',
  withdrawn: 'destructive',
  published: 'success',
};

function isFilterValue(value: string | undefined): value is FilterValue {
  if (!value) return false;
  if (value === 'all') return true;
  return (RESOLUTION_STATUSES as readonly string[]).includes(value);
}

function buildHref(params: {
  status?: FilterValue;
  year?: string;
  q?: string;
  sponsor?: string;
  committee?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.q && params.q.length > 0) sp.set('q', params.q);
  if (params.year) sp.set('year', params.year);
  if (params.sponsor) sp.set('sponsor', params.sponsor);
  if (params.committee) sp.set('committee', params.committee);
  if (params.status && params.status !== 'all') sp.set('status', params.status);
  const qs = sp.toString();
  return qs.length > 0 ? `/admin/resolutions?${qs}` : '/admin/resolutions';
}

export default async function ResolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    year?: string;
    sponsor?: string;
    committee?: string;
  }>;
}) {
  const params = await searchParams;
  const filter: FilterValue = isFilterValue(params.status) ? params.status : 'all';
  const q = params.q?.trim() ?? '';
  const yearParam = params.year?.trim() ?? '';
  const yearNumber = /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined;
  const sponsorParam = params.sponsor?.trim() ?? '';
  const committeeParam = params.committee?.trim() ?? '';

  const [rows, years, sponsors, committees] = await Promise.all([
    getResolutionsList({
      ...(filter !== 'all' ? { status: filter as ResolutionStatus } : {}),
      ...(q ? { q } : {}),
      ...(yearNumber ? { year: yearNumber } : {}),
      ...(sponsorParam ? { primarySponsorId: sponsorParam } : {}),
      ...(committeeParam ? { committeeId: committeeParam } : {}),
    }),
    getResolutionYears(),
    getResolutionSponsors(),
    getResolutionCommittees(),
  ]);

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Drafts' },
    { value: 'pending', label: 'In review' },
    { value: 'approved', label: 'Approved' },
    { value: 'published', label: 'Published' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];

  const hasActiveFilter =
    filter !== 'all' ||
    q.length > 0 ||
    !!yearNumber ||
    sponsorParam.length > 0 ||
    committeeParam.length > 0;

  return (
    <div>
      <AdminPageHeader
        title="Resolutions & Ordinances"
        accessory={
          <Button className="font-script text-base" asChild>
            <Link href="/admin/resolutions/new" aria-label="Draft a new resolution">
              <Plus />
              New resolution
            </Link>
          </Button>
        }
      />

      <ul role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1.5">
        {filterOptions.map((opt) => {
          const active = filter === opt.value;
          return (
            <li key={opt.value}>
              <Link
                href={buildHref({
                  status: opt.value,
                  q,
                  year: yearParam,
                  sponsor: sponsorParam,
                  committee: committeeParam,
                })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border-ink/30 text-ink-soft hover:border-ink font-script rounded-pill focus-visible:ring-rust/40 inline-flex h-8 items-center gap-1.5 border px-3 text-sm transition-colors outline-none focus-visible:ring-2',
                  active && 'bg-rust border-rust text-paper hover:border-rust',
                )}
              >
                {opt.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <form
        method="GET"
        action="/admin/resolutions"
        className="mb-6 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        role="search"
        aria-label="Search and filter resolutions"
      >
        {filter !== 'all' && <input type="hidden" name="status" value={filter} />}
        <div className="relative">
          <Search
            className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title or keyword…"
            aria-label="Search resolutions by title"
            className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-3"
          />
        </div>
        <select
          name="year"
          defaultValue={yearParam}
          aria-label="Filter by year"
          className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-10 rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="sponsor"
          defaultValue={sponsorParam}
          aria-label="Filter by primary sponsor"
          className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-10 max-w-xs rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
        >
          <option value="">All sponsors</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
        <select
          name="committee"
          defaultValue={committeeParam}
          aria-label="Filter by referring committee"
          className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-10 max-w-xs rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
        >
          <option value="">All committees</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.count})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" className="font-medium">
            Apply
          </Button>
          {hasActiveFilter && (
            <Button asChild variant="ghost" className="font-medium">
              <Link href="/admin/resolutions" aria-label="Clear all filters">
                <X />
                Clear
              </Link>
            </Button>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <Card className="max-w-xl">
          <CardEyebrow>No resolutions yet</CardEyebrow>
          <CardTitle>
            {hasActiveFilter
              ? 'No resolutions match these filters.'
              : 'Nothing has been filed yet.'}
          </CardTitle>
          <CardDescription>
            {hasActiveFilter
              ? 'Try clearing a filter, broadening the date range, or starting fresh.'
              : 'Drafts and approved resolutions appear here once filed. Start a new one to seed the audit trail.'}
          </CardDescription>
          <CardFooter>
            {hasActiveFilter ? (
              <Button asChild variant="outline" className="font-medium">
                <Link href="/admin/resolutions">
                  <X />
                  Clear filters
                </Link>
              </Button>
            ) : (
              <Button asChild className="font-medium">
                <Link href="/admin/resolutions/new">
                  <Plus />
                  Draft a resolution
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
                  href={`/admin/resolutions/${row.id}`}
                  className="border-ink/15 hover:bg-paper-2/60 focus-visible:ring-rust/40 block rounded-md border p-4 transition-colors outline-none focus-visible:ring-2"
                >
                  <p className="text-ink-soft font-mono text-xs">{row.number}</p>
                  <p className="text-ink font-script mt-1 text-base leading-snug">{row.title}</p>
                  <div className="text-ink-soft mt-2 flex flex-wrap items-center gap-2 text-xs italic">
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                      {RESOLUTION_STATUS_LABELS[row.status]}
                    </Badge>
                    {row.primarySponsorName && <span>{row.primarySponsorName}</span>}
                    {row.coSponsorCount > 0 && (
                      <span className="font-mono">+{row.coSponsorCount}</span>
                    )}
                    {row.dateFiled && (
                      <span className="font-mono not-italic">
                        {format(new Date(row.dateFiled), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
                <th scope="col" className="w-32 py-3 pr-2 text-left font-medium">
                  №
                </th>
                <th scope="col" className="py-3 pr-2 text-left font-medium">
                  Title
                </th>
                <th scope="col" className="w-44 py-3 pr-2 text-left font-medium">
                  Sponsor(s)
                </th>
                <th scope="col" className="w-32 py-3 pr-2 text-left font-medium">
                  Date filed
                </th>
                <th scope="col" className="w-32 py-3 pr-2 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="w-20 py-3 text-right">
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
                  <td className="text-ink-soft py-3.5 pr-2 font-mono text-xs">{row.number}</td>
                  <td className="py-3.5 pr-2">
                    <Link
                      href={`/admin/resolutions/${row.id}`}
                      className="text-ink hover:text-rust focus-visible:ring-rust/40 font-script rounded text-base outline-none focus-visible:ring-2"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="text-ink-soft py-3.5 pr-2 text-xs italic">
                    {row.primarySponsorName ?? '—'}
                    {row.coSponsorCount > 0 && (
                      <span className="text-ink-faint ml-1 font-mono not-italic">
                        +{row.coSponsorCount}
                      </span>
                    )}
                  </td>
                  <td className="text-ink-soft py-3.5 pr-2 font-mono text-xs">
                    {row.dateFiled ? format(new Date(row.dateFiled), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-3.5 pr-2">
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                      {RESOLUTION_STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      asChild
                      aria-label={`Open ${row.number}`}
                    >
                      <Link href={`/admin/resolutions/${row.id}`}>
                        <FileText />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
