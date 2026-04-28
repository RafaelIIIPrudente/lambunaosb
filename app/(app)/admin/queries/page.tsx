import Link from 'next/link';
import { Filter, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Status = 'new' | 'in_progress' | 'answered' | 'closed';

type Row = {
  id: string;
  citizen: string;
  email: string;
  subject: string;
  age: string;
  status: Status;
};

const ROWS: Row[] = [
  {
    id: 'q-0142',
    citizen: '[Citizen 1]',
    email: 'juan@…ph',
    subject: 'Permit office hours during fiesta week',
    age: '2h',
    status: 'new',
  },
  {
    id: 'q-0141',
    citizen: '[Citizen 2]',
    email: 'ana@…ph',
    subject: 'Request: copy of RES-2026-014',
    age: '5h',
    status: 'in_progress',
  },
  {
    id: 'q-0140',
    citizen: '[Citizen 3]',
    email: 'r.cruz@…ph',
    subject: 'Tricycle franchise renewal — confused on rules',
    age: 'Yesterday',
    status: 'in_progress',
  },
  {
    id: 'q-0139',
    citizen: '[Citizen 4]',
    email: 'liza@…ph',
    subject: 'Suggestion: extend library hours',
    age: '2 days',
    status: 'answered',
  },
  {
    id: 'q-0138',
    citizen: '[Citizen 5]',
    email: 'm.bautista@…ph',
    subject: 'Garbage collection schedule for our barangay',
    age: '3 days',
    status: 'closed',
  },
  {
    id: 'q-0137',
    citizen: '[Citizen 6]',
    email: 'jp@…ph',
    subject: 'Complaint: noise ordinance enforcement',
    age: '4 days',
    status: 'in_progress',
  },
  {
    id: 'q-0136',
    citizen: '[Citizen 7]',
    email: 'ben@…ph',
    subject: 'Senior citizen ID renewal procedure',
    age: '6 days',
    status: 'answered',
  },
];

const STATUS_BADGE: Record<Status, { label: string; variant: 'new' | 'outline' | 'success' }> = {
  new: { label: 'New', variant: 'new' },
  in_progress: { label: 'In progress', variant: 'outline' },
  answered: { label: 'Answered', variant: 'success' },
  closed: { label: 'Closed', variant: 'outline' },
};

const STATUS_COUNT = { all: 42, new: 4, in_progress: 7, answered: 24, closed: 7 };

export const metadata = { title: 'Citizen Queries' };

export default function QueriesPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      {/* Left rail — status filter */}
      <aside className="flex flex-col gap-6">
        <div>
          <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Status
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            <FilterRow label="All" count={STATUS_COUNT.all} dot="ink-faint" />
            <FilterRow label="New" count={STATUS_COUNT.new} dot="rust" active />
            <FilterRow label="In progress" count={STATUS_COUNT.in_progress} dot="warn" />
            <FilterRow label="Answered" count={STATUS_COUNT.answered} dot="success" />
            <FilterRow label="Closed" count={STATUS_COUNT.closed} dot="ink-faint" />
          </ul>
        </div>
        <div>
          <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Assigned
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            <li className="text-ink-soft hover:text-ink font-script px-2 py-1.5">Anyone</li>
            <li className="text-ink-soft hover:text-ink font-script px-2 py-1.5">Me (3)</li>
            <li className="text-ink-soft hover:text-ink font-script px-2 py-1.5">Unassigned (4)</li>
          </ul>
        </div>
      </aside>

      {/* Inbox */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" aria-label="Select all" className="accent-rust size-4" />
          <div className="relative flex-1">
            <Search
              className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search queries…"
              aria-label="Search queries"
              className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm italic transition-colors outline-none focus-visible:ring-3"
            />
          </div>
          <Button variant="outline" size="sm" className="font-script text-base">
            <Filter className="size-3.5" />
            Newest
          </Button>
        </div>

        <ul className="flex flex-col">
          {ROWS.map((row) => {
            const status = STATUS_BADGE[row.status];
            return (
              <li
                key={row.id}
                className={`border-ink/15 hover:bg-paper-2/60 grid grid-cols-[auto_auto_auto_1fr_auto_auto] items-center gap-3 border-b border-dashed py-3 transition-colors ${row.status === 'new' ? 'bg-rust/5' : ''}`}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${row.id}`}
                  className="accent-rust ml-2 size-4"
                />
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${row.status === 'new' ? 'bg-rust' : row.status === 'in_progress' ? 'bg-gold' : row.status === 'answered' ? 'bg-success' : 'bg-ink-ghost'}`}
                />
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/queries/${row.id}`}
                    className="text-ink hover:text-rust truncate font-medium"
                  >
                    {row.citizen}
                  </Link>
                  <span className="text-ink-faint truncate font-mono text-[11px]">{row.email}</span>
                </div>
                <Link
                  href={`/queries/${row.id}`}
                  className="text-ink-soft hover:text-ink font-script truncate text-base"
                >
                  {row.subject}
                </Link>
                <Badge variant={status.variant}>{status.label}</Badge>
                <span className="text-ink-faint mr-2 font-mono text-[11px] tabular-nums">
                  {row.age}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  count,
  dot,
  active = false,
}: {
  label: string;
  count: number;
  dot: 'rust' | 'warn' | 'success' | 'ink-faint';
  active?: boolean;
}) {
  const dotClass =
    dot === 'rust'
      ? 'bg-rust'
      : dot === 'warn'
        ? 'bg-gold'
        : dot === 'success'
          ? 'bg-success'
          : 'bg-ink-ghost';
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        className={`hover:bg-paper-2 aria-[current=true]:bg-paper-2 aria-[current=true]:text-ink flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${active ? 'text-ink' : 'text-ink-soft'}`}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${dotClass}`} />
          <span className="font-script text-base">{label}</span>
        </span>
        <span className="text-ink-faint font-mono text-[11px] tabular-nums">{count}</span>
      </button>
    </li>
  );
}
