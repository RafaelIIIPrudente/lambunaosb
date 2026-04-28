'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  meetings: 'Meetings',
  resolutions: 'Resolutions',
  queries: 'Citizen Queries',
  news: 'News',
  members: 'SB Members',
  users: 'Users',
  audit: 'Audit Log',
  settings: 'Settings',
  new: 'New',
};

const PRIMARY_ACTIONS: Record<string, { label: string; href: string }> = {
  dashboard: { label: 'New meeting', href: '/admin/meetings/new' },
  meetings: { label: 'New meeting', href: '/admin/meetings/new' },
  resolutions: { label: 'New resolution', href: '/admin/resolutions/new' },
  news: { label: 'New post', href: '/admin/news/new' },
  members: { label: 'New member', href: '/admin/members/new' },
};

export function AdminTopbar() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? 'dashboard';
  const pageTitle = ROUTE_LABELS[lastSegment] ?? lastSegment;
  const primary = PRIMARY_ACTIONS[lastSegment];

  return (
    <header className="border-ink/12 bg-paper sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4">
      <SidebarTrigger />

      <h1 className="text-ink hidden text-sm font-medium sm:inline">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search
            className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search…"
            aria-label="Search"
            className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-9 w-64 rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-3"
          />
        </div>

        {primary && (
          <Button asChild size="sm" className="font-medium">
            <Link href={primary.href}>
              <Plus />
              {primary.label}
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell />
          <span
            aria-hidden="true"
            className="bg-rust ring-paper absolute top-1 right-1 inline-block size-1.5 rounded-full ring-2"
          />
        </Button>

        <span
          aria-hidden="true"
          className="bg-paper-3 border-ink/15 inline-flex size-7 shrink-0 items-center justify-center rounded-full border"
        />
      </div>
    </header>
  );
}
