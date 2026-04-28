import type { ReactNode } from 'react';

/**
 * Auth route-group layout. No public chrome (no top-nav, no footer).
 * Each auth page composes its own full-bleed layout — login is half/half,
 * reset/invite are centered cards.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="public" className="bg-paper text-ink min-h-screen">
      {children}
    </div>
  );
}
