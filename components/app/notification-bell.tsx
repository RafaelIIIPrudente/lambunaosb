'use client';

import Link from 'next/link';
import { Bell, Check, Inbox, ShieldAlert, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole } from '@/lib/validators/user';

export type NotificationCounts = {
  auditAlerts: number;
  assignedToMe: number;
  pendingQueries: number;
  total: number;
};

type NotificationBellProps = {
  counts: NotificationCounts;
  role: UserRole;
};

type RowConfig = {
  key: string;
  href: string;
  label: string;
  count: number;
  icon: typeof Bell;
};

export function NotificationBell({ counts, role }: NotificationBellProps) {
  if (role === 'other_lgu') return null;

  const showAuditRow =
    (role === 'secretary' || role === 'mayor' || role === 'vice_mayor') && counts.auditAlerts > 0;
  const showAssignedRow = counts.assignedToMe > 0;
  const showPendingRow =
    (role === 'secretary' || role === 'mayor' || role === 'vice_mayor') &&
    counts.pendingQueries > 0;

  const rows: RowConfig[] = [];
  if (showAuditRow) {
    rows.push({
      key: 'audit',
      href: '/admin/audit?alert=true',
      label: 'Audit alerts',
      count: counts.auditAlerts,
      icon: ShieldAlert,
    });
  }
  if (showAssignedRow) {
    rows.push({
      key: 'assigned',
      href: '/admin/queries?assigned=me',
      label: 'Queries assigned to you',
      count: counts.assignedToMe,
      icon: UserCheck,
    });
  }
  if (showPendingRow) {
    rows.push({
      key: 'pending',
      href: '/admin/queries?status=new',
      label: 'Pending queries',
      count: counts.pendingQueries,
      icon: Inbox,
    });
  }

  const badgeText = counts.total > 99 ? '99+' : String(counts.total);
  const triggerLabel =
    counts.total > 0 ? `Notifications, ${counts.total} unread` : 'Notifications, no unread';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={triggerLabel}
          aria-haspopup="menu"
          className="relative"
        >
          <Bell />
          {counts.total > 0 && (
            <span
              aria-hidden="true"
              className="bg-rust text-paper ring-paper absolute -top-0.5 -right-0.5 inline-flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ring-2"
            >
              {badgeText}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-72">
        <DropdownMenuLabel className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-1 px-2 py-3" role="status">
            <span className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
              No new notifications
            </span>
            <span className="text-ink font-script inline-flex items-center gap-2 text-base">
              <Check className="text-rust size-4" aria-hidden="true" />
              All caught up.
            </span>
          </div>
        ) : (
          rows.map((row) => {
            const Icon = row.icon;
            return (
              <DropdownMenuItem key={row.key} asChild>
                <Link
                  href={row.href}
                  className="flex w-full items-center gap-3 text-sm font-medium"
                >
                  <Icon className="text-ink-soft size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{row.label}</span>
                  <span
                    aria-label={`${row.count} item${row.count === 1 ? '' : 's'}`}
                    className="bg-rust text-paper inline-flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                  >
                    {row.count > 99 ? '99+' : row.count}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
