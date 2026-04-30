'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/news', label: 'News' },
  { href: '/members', label: 'Members' },
  { href: '/committees', label: 'Committees' },
  { href: '/about', label: 'About' },
  { href: '/submit-query', label: 'Submit a Query' },
];

function isCurrent(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicTopNav() {
  const pathname = usePathname();

  return (
    <header className="border-ink/12 bg-paper sticky top-0 z-30 border-b">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3 sm:px-8">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
              className="lg:hidden"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-paper w-80 p-0">
            <SheetHeader className="border-ink/12 border-b p-6">
              <SheetTitle className="font-script text-navy-primary text-xl font-semibold">
                Sangguniang Bayan
              </SheetTitle>
              <SheetDescription className="text-ink-faint font-mono text-xs">
                Municipality of Lambunao, Iloilo
              </SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile primary" className="flex flex-col p-3">
              {NAV_ITEMS.map((item) => {
                const current = isCurrent(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'text-ink hover:bg-paper-2 font-script inline-flex h-12 items-center rounded-md px-3 text-lg transition-colors',
                      'aria-[current=page]:gold-underline aria-[current=page]:text-rust',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="group/brand flex items-center gap-3"
          aria-label="Sangguniang Bayan ng Lambunao — Home"
        >
          <Image
            src="/seal/lambunao-seal.png"
            width={36}
            height={36}
            alt=""
            priority
            className="size-9 shrink-0 rounded-full"
          />
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="font-script text-ink text-xl leading-none">Sangguniang Bayan</span>
            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
              Municipality of Lambunao, Iloilo
            </span>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="ml-auto hidden flex-1 items-center justify-end gap-1 lg:flex"
        >
          {NAV_ITEMS.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'text-ink hover:text-rust font-script inline-flex h-10 items-center px-3 text-base transition-colors',
                  'aria-[current=page]:gold-underline aria-[current=page]:text-rust',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
