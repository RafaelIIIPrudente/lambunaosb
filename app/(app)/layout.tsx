import type { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminSidebar } from '@/components/app/admin-sidebar';
import { AdminTopbar } from '@/components/app/admin-topbar';
import type { NotificationCounts } from '@/components/app/notification-bell';
import { AdminStatusBar } from '@/components/app/admin-status-bar';
import { requireUser } from '@/lib/auth/require-user';
import { getAlertCount } from '@/lib/db/queries/audit';
import { getAssignmentCounts } from '@/lib/db/queries/citizen-queries';
import { SB_MEMBER_TIER_ROLES } from '@/lib/validators/user';

const EMPTY_NOTIFICATION_COUNTS: NotificationCounts = {
  auditAlerts: 0,
  assignedToMe: 0,
  pendingQueries: 0,
  total: 0,
};

async function getNotificationCounts(userId: string, role: string): Promise<NotificationCounts> {
  if (role === 'other_lgu') return EMPTY_NOTIFICATION_COUNTS;

  if ((SB_MEMBER_TIER_ROLES as readonly string[]).includes(role)) {
    const assignments = await getAssignmentCounts(userId);
    return {
      auditAlerts: 0,
      assignedToMe: assignments.mine,
      pendingQueries: 0,
      total: assignments.mine,
    };
  }

  // secretary / mayor / vice_mayor
  const [assignments, auditAlerts] = await Promise.all([
    getAssignmentCounts(userId),
    getAlertCount(),
  ]);
  const total = assignments.unassigned + assignments.mine + auditAlerts;
  return {
    auditAlerts,
    assignedToMe: assignments.mine,
    pendingQueries: assignments.unassigned,
    total,
  };
}

/**
 * Admin route-group layout — operational chrome.
 * Sets data-surface="admin" so primitives select the dense / Inter-only variants.
 * Brief §1.2 + §4.15.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();
  const notificationCounts = await getNotificationCounts(profile.id, profile.role);

  return (
    <div data-surface="admin" className="bg-paper text-ink min-h-screen">
      <a
        href="#admin-main"
        className="bg-navy-primary text-paper sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>
      <TooltipProvider delayDuration={400}>
        <SidebarProvider>
          <AdminSidebar fullName={profile.fullName} role={profile.role} />
          <SidebarInset className="bg-paper flex min-h-screen flex-col">
            <AdminTopbar notificationCounts={notificationCounts} role={profile.role} />
            <main id="admin-main" className="flex-1 px-6 py-6">
              {children}
            </main>
            <AdminStatusBar />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
