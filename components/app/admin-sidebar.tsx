'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  ChevronsUpDown,
  FileText,
  Home,
  Inbox,
  Lock,
  LogOut,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
  UserCircle,
} from 'lucide-react';

import { signOut } from '@/app/_actions/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { USER_ROLE_LABELS, type UserRole } from '@/lib/validators/user';

function computeInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
  restricted?: boolean;
};

type AdminSidebarProps = {
  fullName: string;
  role: UserRole;
  /** Citizen queries needing attention (unassigned + assigned-to-me, excluding closed/spam). */
  pendingCitizenQueries: number;
};

export function AdminSidebar({ fullName, role, pendingCitizenQueries }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const initials = computeInitials(fullName);
  const roleLabel = USER_ROLE_LABELS[role];

  const items: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
    { href: '/admin/meetings', label: 'Meetings', icon: Calendar },
    { href: '/admin/resolutions', label: 'Resolutions', icon: FileText },
    { href: '/admin/members', label: 'SB Members', icon: Users },
    { href: '/admin/news', label: 'News', icon: Newspaper },
    {
      href: '/admin/queries',
      label: 'Citizen Queries',
      icon: Inbox,
      badge: pendingCitizenQueries > 0 ? pendingCitizenQueries : undefined,
    },
    { href: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
    { href: '/admin/users', label: 'Users', icon: UserCircle, restricted: true },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-ink/12 border-b">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 rounded-md p-2"
          aria-label="SB Lambunao Admin — Dashboard"
        >
          <Image
            src="/seal/lambunao-seal.png"
            width={36}
            height={36}
            alt=""
            priority
            className="size-9 shrink-0 rounded-full"
          />
          <div className="flex flex-1 flex-col leading-tight">
            <span className="font-script text-ink text-lg leading-none">Lambunao SB</span>
            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
              Iloilo · admin
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
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
                            aria-label={`${item.badge} pending`}
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
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-paper-3 focus-visible:ring-rust/40 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2"
            aria-label="Account menu"
          >
            <span
              aria-hidden="true"
              className="bg-paper-3 border-ink/15 text-ink inline-flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tracking-wide"
            >
              {initials}
            </span>
            <div className="flex flex-1 flex-col text-xs leading-tight">
              <span className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
                Signed in as
              </span>
              <span className="text-ink font-script text-base leading-tight">{fullName}</span>
              <span className="text-ink-faint text-[11px]">{roleLabel}</span>
            </div>
            <ChevronsUpDown className="text-ink-faint size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
          >
            <DropdownMenuLabel className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
              Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
              disabled={isPending}
              className="text-rust focus:text-rust focus:bg-rust/10"
            >
              <LogOut className="size-4" />
              <span>{isPending ? 'Signing out…' : 'Sign out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
