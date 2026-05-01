import type { ReactNode } from 'react';

import { PublicTopNav } from '@/components/marketing/top-nav';
import { PublicFooter } from '@/components/marketing/footer';

/**
 * Marketing route-group layout — public surface chrome.
 * Sets data-surface="public" so surface-aware primitives pick the
 * editorial density / serif title / generous spacing variants.
 *
 * Mobile-overflow rules (verify at 375 / 390 / 414 px before merging):
 * 1. <body> in app/layout.tsx has overflow-x-clip — DO NOT remove without a sweep.
 * 2. Every text node that may receive user-generated content uses break-words.
 * 3. Flex/grid items containing such text use min-w-0 to let break-words propagate.
 * 4. Touch targets ≥ 44 × 44 (Apple HIG): h-11 on chips, size-11 on icon buttons.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="public" className="bg-paper text-ink flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="bg-navy-primary text-paper sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>
      <PublicTopNav />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
