import type { ReactNode } from 'react';

import { PublicTopNav } from '@/components/marketing/top-nav';
import { PublicFooter } from '@/components/marketing/footer';

/**
 * Marketing route-group layout — public surface chrome.
 * Sets data-surface="public" so surface-aware primitives pick the
 * editorial density / serif title / generous spacing variants.
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
