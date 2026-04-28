import { AlertCircle, Calendar, Download, Eye, Filter, Search, User } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Category = 'resolution' | 'meeting' | 'query' | 'user' | 'member' | 'security' | 'system';

type Row = {
  time: string;
  actor: string;
  action: string;
  target: string;
  category: Category;
  ip?: string;
  alert?: boolean;
};

const ROWS: Row[] = [
  {
    time: 'Jun 14 09:32:14',
    actor: '[Secretary]',
    action: 'published',
    target: 'RES-2026-014',
    category: 'resolution',
    ip: '203.0.113.4',
  },
  {
    time: 'Jun 14 08:14:02',
    actor: '[Vice Mayor]',
    action: 'approved transcript for',
    target: 'Reg. Session #13',
    category: 'meeting',
    ip: '203.0.113.7',
  },
  {
    time: 'Jun 14 07:50:11',
    actor: 'System',
    action: 'auto-saved 6 revisions to',
    target: 'Transcript #13',
    category: 'meeting',
  },
  {
    time: 'Jun 13 16:45:22',
    actor: '[Member 5]',
    action: 'uploaded',
    target: 'RES-2026-013.pdf',
    category: 'resolution',
    ip: '203.0.113.12',
  },
  {
    time: 'Jun 13 14:02:55',
    actor: '[Secretary]',
    action: 'replied to',
    target: 'Q-2026-0140',
    category: 'query',
    ip: '203.0.113.4',
  },
  {
    time: 'Jun 13 11:18:33',
    actor: '[Secretary]',
    action: 'invited admin user',
    target: 'member8@lambunao.gov.ph',
    category: 'user',
    ip: '203.0.113.4',
    alert: true,
  },
  {
    time: 'Jun 13 10:00:05',
    actor: '[Member 3]',
    action: 'updated profile photo',
    target: '—',
    category: 'member',
    ip: '203.0.113.18',
  },
  {
    time: 'Jun 13 09:12:41',
    actor: 'System',
    action: 'failed login attempt for',
    target: 'unknown@…ph',
    category: 'security',
    ip: '45.61.x.x',
    alert: true,
  },
  {
    time: 'Jun 12 22:00:00',
    actor: 'System',
    action: 'nightly backup completed',
    target: '42 GB',
    category: 'system',
  },
];

const CAT_BADGE: Record<
  Category,
  { label: string; variant: 'success' | 'outline' | 'warn' | 'destructive' | 'secondary' }
> = {
  resolution: { label: 'Resolution', variant: 'success' },
  meeting: { label: 'Meeting', variant: 'success' },
  query: { label: 'Query', variant: 'outline' },
  user: { label: 'User', variant: 'outline' },
  member: { label: 'Member', variant: 'outline' },
  security: { label: 'Security', variant: 'destructive' },
  system: { label: 'System', variant: 'secondary' },
};

export const metadata = { title: 'Audit log' };

export default function AuditPage() {
  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        accessory={
          <Button variant="outline" className="font-script text-base">
            <Download />
            Export
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search
            className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by user, object or IP…"
            aria-label="Search audit log"
            className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm italic transition-colors outline-none focus-visible:ring-3"
          />
        </div>
        <Chip icon={<Calendar className="size-3.5" />}>Last 30 days</Chip>
        <Chip icon={<Filter className="size-3.5" />}>Category: any</Chip>
        <Chip icon={<User className="size-3.5" />}>User: anyone</Chip>
        <Badge variant="destructive" className="h-10 px-3 text-xs">
          <AlertCircle className="size-3.5" aria-hidden="true" />2 alerts
        </Badge>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
            <th className="w-44 py-3 text-left font-medium">Time</th>
            <th className="w-32 py-3 text-left font-medium">Actor</th>
            <th className="py-3 text-left font-medium">Action</th>
            <th className="w-32 py-3 text-left font-medium">Category</th>
            <th className="w-28 py-3 text-left font-medium">IP</th>
            <th className="w-12 py-3 text-right">
              <span className="sr-only">View</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const cat = CAT_BADGE[row.category];
            return (
              <tr
                key={i}
                className="border-ink/15 hover:bg-paper-2/60 border-b border-dashed transition-colors"
              >
                <td className="text-ink-soft py-3 font-mono text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${row.alert ? 'bg-rust' : 'bg-ink-ghost'}`}
                    />
                    {row.time}
                  </span>
                </td>
                <td className="text-ink py-3 font-medium">{row.actor}</td>
                <td className="text-ink-soft py-3 italic">
                  {row.action}{' '}
                  <code className="border-ink/15 text-ink rounded-sm border bg-transparent px-1.5 py-0.5 font-mono text-[11px] not-italic">
                    {row.target}
                  </code>
                </td>
                <td className="py-3">
                  <Badge variant={cat.variant}>{cat.label}</Badge>
                </td>
                <td className="text-ink-faint py-3 font-mono text-[11px]">{row.ip ?? '—'}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" size="icon-sm" aria-label="View detail">
                    <Eye />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-ink-faint mt-4 text-xs italic">
        Append-only · 7-year retention · IP, session-id, user-agent captured. Tombstones for
        deletes.
      </p>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
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
