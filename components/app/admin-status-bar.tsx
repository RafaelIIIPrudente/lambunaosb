import { ShieldCheck } from 'lucide-react';

/**
 * Brief §1.2 + §6.5 + brief direction §3 risk #5:
 *   "Admin UI subtly reminds users that actions are logged"
 * Persistent, calm, never threatening. Lives at the bottom of every admin page.
 */
export function AdminStatusBar() {
  return (
    <footer
      role="contentinfo"
      className="border-ink-ghost/40 bg-paper-2 text-ink-faint flex h-8 items-center justify-between border-t px-4 text-[11px]"
    >
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3" aria-hidden="true" />
        <span>Actions on this page are recorded in the audit log.</span>
      </span>
      <span className="font-mono">v0.1.0 · phase 2</span>
    </footer>
  );
}
