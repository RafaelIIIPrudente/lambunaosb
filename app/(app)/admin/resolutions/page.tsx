import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Download, FileText, Filter, Search, User } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Status = 'approved' | 'pending' | 'withdrawn' | 'draft';

type Row = {
  number: string;
  title: string;
  sponsors: string;
  date: string;
  status: Status;
};

const ROWS: Row[] = [
  {
    number: '2026-014',
    title: 'Ordinance regulating tricycle franchising in poblacion areas',
    sponsors: '[Member 3] +1',
    date: '2026-06-12',
    status: 'approved',
  },
  {
    number: '2026-013',
    title: 'Resolution endorsing barangay health worker honoraria adjustment',
    sponsors: '[Member 1] +2',
    date: '2026-06-05',
    status: 'pending',
  },
  {
    number: '2026-012',
    title: 'Approving annual budget supplement for road maintenance',
    sponsors: '[Member 5]',
    date: '2026-05-28',
    status: 'approved',
  },
  {
    number: '2026-011',
    title: 'Authorizing Mayor to enter into MOA with Department of Agriculture',
    sponsors: '[Member 2]',
    date: '2026-05-21',
    status: 'withdrawn',
  },
  {
    number: '2026-010',
    title: 'Establishing the Lambunao Youth Council operating guidelines',
    sponsors: '[Member 4] +3',
    date: '2026-05-14',
    status: 'approved',
  },
  {
    number: '2026-009',
    title: 'Resolution declaring fiesta week public holiday for LGU staff',
    sponsors: '[Vice Mayor]',
    date: '2026-04-30',
    status: 'approved',
  },
  {
    number: '2026-008',
    title: 'Ordinance amending zoning for Brgy. Cabatangan commercial strip',
    sponsors: '[Member 6]',
    date: '2026-04-23',
    status: 'pending',
  },
  {
    number: '2026-007',
    title: 'Resolution requesting DPWH to prioritize the Lambunao river bridge',
    sponsors: '[Member 7] +1',
    date: '2026-04-16',
    status: 'approved',
  },
  {
    number: '2026-006',
    title: 'Authorizing solid waste management contract renewal',
    sponsors: '[Member 8]',
    date: '2026-04-09',
    status: 'approved',
  },
];

const STATUS_BADGE: Record<
  Status,
  { label: string; variant: 'success' | 'outline' | 'destructive' | 'warn' }
> = {
  approved: { label: 'Approved', variant: 'success' },
  pending: { label: 'Pending', variant: 'outline' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'warn' },
};

export const metadata = { title: 'Resolutions' };

export default function ResolutionsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Resolutions & Ordinances"
        accessory={
          <Button variant="outline" className="font-script text-base" asChild>
            <Link href="/resolutions/export">
              <Download />
              Export CSV
            </Link>
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search
            className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by title, № or keyword…"
            aria-label="Search resolutions"
            className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm italic transition-colors outline-none focus-visible:ring-3"
          />
        </div>
        <FilterChip icon={<Calendar className="size-3.5" />}>Year: 2026</FilterChip>
        <FilterChip icon={<User className="size-3.5" />}>Sponsor: any</FilterChip>
        <FilterChip icon={<Filter className="size-3.5" />}>Status: any</FilterChip>
      </div>

      {/* Inline pills below filters */}
      <ul role="group" aria-label="Quick filter" className="mb-6 flex flex-wrap gap-1.5">
        {[
          { l: 'All', c: 142, active: true },
          { l: 'Approved' },
          { l: 'Pending' },
          { l: 'Withdrawn' },
          { l: 'Drafts' },
        ].map((pill) => (
          <li key={pill.l}>
            <button
              type="button"
              aria-pressed={!!pill.active}
              className="border-ink/30 text-ink-soft hover:border-ink aria-[pressed=true]:bg-rust aria-[pressed=true]:text-paper aria-[pressed=true]:border-rust font-script rounded-pill inline-flex h-7 items-center gap-1.5 border px-3 text-sm transition-colors"
            >
              {pill.l}
              {pill.c && <span className="font-mono text-[10px] opacity-75">({pill.c})</span>}
            </button>
          </li>
        ))}
      </ul>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
            <th className="w-8 py-3 pl-2 text-left">
              <input type="checkbox" aria-label="Select all" className="accent-rust size-4" />
            </th>
            <th className="w-24 py-3 text-left font-medium">№</th>
            <th className="py-3 text-left font-medium">Title</th>
            <th className="w-40 py-3 text-left font-medium">Sponsor(s)</th>
            <th className="w-28 py-3 text-left font-medium">Date</th>
            <th className="w-28 py-3 text-left font-medium">Status</th>
            <th className="w-20 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const status = STATUS_BADGE[row.status];
            return (
              <tr
                key={row.number}
                className="border-ink/15 hover:bg-paper-2/60 border-b border-dashed transition-colors"
              >
                <td className="py-3.5 pl-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.number}`}
                    className="accent-rust size-4"
                  />
                </td>
                <td className="text-ink-soft py-3.5 font-mono text-xs">{row.number}</td>
                <td className="py-3.5">
                  <Link
                    href={`/resolutions/${row.number}`}
                    className="text-ink hover:text-rust font-script text-base"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="text-ink-soft py-3.5 text-xs italic">{row.sponsors}</td>
                <td className="text-ink-soft py-3.5 font-mono text-xs">
                  {format(new Date(row.date), 'MMM d, yyyy')}
                </td>
                <td className="py-3.5">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="py-3.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Open">
                      <FileText />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Download">
                      <Download />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="border-ink/25 text-ink-soft hover:border-ink hover:bg-paper-2 inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors"
    >
      {icon}
      <span className="font-script italic">{children}</span>
    </button>
  );
}
