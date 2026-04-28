import Link from 'next/link';
import { Edit3, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Status = 'scheduled' | 'recorded' | 'transcribed' | 'published';

type Row = {
  id: string;
  date: string;
  title: string;
  audioLength?: string;
  transcript?: string;
  status: Status;
};

const ROWS: Row[] = [
  { id: 'mtg-014', date: '2026-06-16', title: 'Regular Session #14', status: 'scheduled' },
  {
    id: 'mtg-013',
    date: '2026-06-09',
    title: 'Regular Session #13',
    audioLength: '01:42:18',
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-spec',
    date: '2026-06-02',
    title: 'Special: Budget hearing',
    audioLength: '00:58:04',
    transcript: 'In review',
    status: 'transcribed',
  },
  {
    id: 'mtg-012',
    date: '2026-05-26',
    title: 'Regular Session #12',
    audioLength: '01:33:44',
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-com-hs',
    date: '2026-05-19',
    title: 'Committee · Health & Sanitation',
    audioLength: '00:41:09',
    transcript: 'Draft',
    status: 'recorded',
  },
  {
    id: 'mtg-011',
    date: '2026-05-12',
    title: 'Regular Session #11',
    audioLength: '01:28:55',
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-010',
    date: '2026-05-05',
    title: 'Regular Session #10',
    audioLength: '01:51:02',
    transcript: 'Approved',
    status: 'published',
  },
];

const STATUS_BADGE: Record<Status, { label: string; variant: 'success' | 'outline' | 'new' }> = {
  scheduled: { label: 'Scheduled', variant: 'outline' },
  recorded: { label: 'Recorded', variant: 'outline' },
  transcribed: { label: 'Transcribed', variant: 'outline' },
  published: { label: 'Published', variant: 'success' },
};

export const metadata = { title: 'Meetings' };

export default function MeetingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Meetings"
        pills={[
          { label: 'All', count: 27, active: true },
          { label: 'Scheduled' },
          { label: 'Recorded' },
          { label: 'Transcribed' },
          { label: 'Published' },
        ]}
        accessory={
          <div className="relative">
            <Search
              className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search by date or topic…"
              aria-label="Search meetings"
              className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 rounded-pill h-9 w-72 border pr-3 pl-9 text-sm italic transition-colors outline-none focus-visible:ring-3"
            />
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
              <th className="w-8 py-3 pl-2 text-left">
                <input type="checkbox" aria-label="Select all" className="accent-rust size-4" />
              </th>
              <th className="w-32 py-3 text-left font-medium">Date</th>
              <th className="py-3 text-left font-medium">Title</th>
              <th className="w-28 py-3 text-left font-medium">Audio</th>
              <th className="w-32 py-3 text-left font-medium">Transcript</th>
              <th className="w-32 py-3 text-left font-medium">Status</th>
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
                  key={row.id}
                  className="border-ink/15 hover:bg-paper-2/60 border-b border-dashed transition-colors"
                >
                  <td className="py-3.5 pl-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title}`}
                      className="accent-rust size-4"
                    />
                  </td>
                  <td className="text-ink-soft py-3.5 font-mono text-xs">
                    {format(new Date(row.date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3.5">
                    <Link
                      href={`/meetings/${row.id}`}
                      className="text-ink hover:text-rust font-script text-base"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="text-ink-soft py-3.5 font-mono text-xs tabular-nums">
                    {row.audioLength ?? '—'}
                  </td>
                  <td className="text-ink-soft font-script py-3.5 text-sm italic">
                    {row.transcript ?? '—'}
                  </td>
                  <td className="py-3.5">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        aria-label={`View ${row.title}`}
                      >
                        <Link href={`/meetings/${row.id}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        aria-label={`Edit ${row.title}`}
                      >
                        <Link href={`/meetings/${row.id}`}>
                          <Edit3 />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="text-ink-faint mt-6 flex items-center justify-between text-xs">
        <span className="font-mono">Showing 1–7 of 27</span>
        <nav aria-label="Pagination" className="flex gap-1">
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              type="button"
              aria-current={p === 1 ? 'page' : undefined}
              className="border-ink/25 text-ink-soft hover:border-ink aria-[current=page]:bg-rust aria-[current=page]:text-paper aria-[current=page]:border-rust inline-flex size-8 items-center justify-center rounded-md border font-mono text-xs transition-colors"
            >
              {p}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}
