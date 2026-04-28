'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  FileText,
  Home,
  Inbox,
  Lock,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
  UserCircle,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
  restricted?: boolean;
};

const ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/meetings', label: 'Meetings', icon: Calendar },
  { href: '/admin/resolutions', label: 'Resolutions', icon: FileText },
  { href: '/admin/members', label: 'SB Members', icon: Users },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/queries', label: 'Citizen Queries', icon: Inbox, badge: 4 },
  { href: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
  { href: '/admin/users', label: 'Users', icon: UserCircle, restricted: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-ink/12 border-b">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 rounded-md p-2"
          aria-label="SB Lambunao Admin — Dashboard"
        >
          <span
            aria-hidden="true"
            className="border-ink/40 bg-paper text-ink inline-flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tracking-wide"
          >
            SB
          </span>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="font-script text-ink text-lg leading-none">Lambunao SB</span>
            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
              Iloilo · admin
            </span>
          </div>
          <span
            aria-hidden="true"
            className="bg-paper-3 border-ink/12 inline-flex size-7 shrink-0 items-center justify-center rounded-full border"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className="bg-rust text-paper group-data-active/menu-button:bg-paper group-data-active/menu-button:text-rust inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                            aria-label={`${item.badge} new`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.restricted && (
                          <Lock
                            className="text-ink-faint group-data-active/menu-button:text-paper/85 size-3"
                            aria-label="Restricted"
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-ink/12 border-t">
        <div className="flex items-center gap-3 px-2 py-2">
          <span
            aria-hidden="true"
            className="bg-paper-3 border-ink/15 inline-flex size-9 shrink-0 items-center justify-center rounded-full border"
          />
          <div className="flex flex-col text-xs leading-tight">
            <span className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
              Signed in as
            </span>
            <span className="text-ink font-script text-base leading-tight">[Secretary]</span>
            <span className="text-ink-faint text-[11px]">Secretary</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
