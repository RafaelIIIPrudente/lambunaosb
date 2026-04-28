'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Menu } from 'lucide-react';

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
  { href: '/about', label: 'About' },
  { href: '/submit-query', label: 'Submit a Query' },
];

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'hil', label: 'Hiligaynon' },
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
            <div className="border-ink/12 border-t p-6">
              <p
                id="mobile-locale-label"
                className="text-ink-faint mb-3 font-mono text-xs font-medium tracking-[0.18em] uppercase"
              >
                Choose language
              </p>
              <div
                role="group"
                aria-labelledby="mobile-locale-label"
                className="flex flex-col gap-1"
              >
                {LOCALES.map((locale) => (
                  <button
                    key={locale.code}
                    type="button"
                    aria-pressed={locale.code === 'en'}
                    className={cn(
                      'text-ink hover:bg-paper-2 inline-flex h-12 items-center justify-between rounded-md px-3 text-sm font-medium transition-colors',
                      'aria-[pressed=true]:text-rust aria-[pressed=true]:font-semibold',
                    )}
                  >
                    <span>{locale.label}</span>
                    <span className="text-ink-faint font-mono text-[11px] tracking-wide uppercase">
                      {locale.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="group/brand flex items-center gap-3"
          aria-label="Sangguniang Bayan ng Lambunao — Home"
        >
          <span
            aria-hidden="true"
            className="border-ink/40 bg-paper text-ink inline-flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tracking-wide"
          >
            SB
          </span>
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

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <button
            type="button"
            aria-label="Language: English. Choose another."
            className="border-ink/40 text-ink hover:bg-paper-2 rounded-pill inline-flex h-9 items-center gap-1.5 border border-dashed px-3 text-xs font-medium transition-colors"
          >
            <Globe className="size-3.5" aria-hidden="true" />
            <span className="font-mono tracking-wide">EN</span>
          </button>
        </div>
      </div>
    </header>
  );
}
