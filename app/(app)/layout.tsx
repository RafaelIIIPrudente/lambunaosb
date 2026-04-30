import type { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminSidebar } from '@/components/app/admin-sidebar';
import { AdminTopbar } from '@/components/app/admin-topbar';
import { AdminStatusBar } from '@/components/app/admin-status-bar';
import { requireUser } from '@/lib/auth/require-user';

/**
 * Admin route-group layout — operational chrome.
 * Sets data-surface="admin" so primitives select the dense / Inter-only variants.
 * Brief §1.2 + §4.15.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireUser();

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
          <AdminSidebar />
          <SidebarInset className="bg-paper flex min-h-screen flex-col">
            <AdminTopbar />
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
