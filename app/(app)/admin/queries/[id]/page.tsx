import Link from 'next/link';
import { ChevronRight, FileText, Paperclip, Plus, RefreshCw, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const RELATED = [
  { label: 'Q-2026-0118 (Permit hours, similar)' },
  { label: 'News: "Notice — Fiesta hours"' },
  { label: 'RES-2025-031 (Permit fee schedule)' },
];

const STATUS = [
  { label: 'New', dot: 'rust', active: true },
  { label: 'In progress', dot: 'gold' },
  { label: 'Answered', dot: 'success' },
  { label: 'Closed', dot: 'ink-faint' },
];

export default async function QueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <nav
          aria-label="Breadcrumb"
          className="text-ink-faint flex items-center gap-1.5 font-mono text-xs"
        >
          <Link href="/admin/queries" className="hover:text-rust">
            Citizen Queries
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">Permit office hours…</span>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="font-script text-base">
            Mark closed
          </Button>
          <Button className="font-script text-base">✓ Mark answered</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          {/* Subject + meta */}
          <header className="border-ink/20 rounded-md border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-ink font-display text-xl font-semibold">
                  Permit office hours during fiesta week — clarification
                </h1>
                <p className="text-ink-faint mt-2 font-mono text-[11px]">
                  Q-2026-0142 · received Jun 14, 7:08 AM · IP 122.55.x.x · turnstile ✓ · honeypot
                  clean
                </p>
              </div>
              <Badge variant="new">New</Badge>
            </div>
          </header>

          {/* Citizen message */}
          <div className="border-ink/20 rounded-md border p-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="bg-paper-3 border-ink/15 inline-flex size-9 shrink-0 items-center justify-center rounded-full border"
              />
              <div className="flex-1">
                <p className="text-ink font-medium">[Citizen 1]</p>
                <p className="text-ink-faint font-mono text-[11px]">juan@…ph · 2h ago</p>
                <p className="text-ink-soft mt-3 text-sm leading-relaxed">
                  Good day. May I know if the permits office will follow regular hours during fiesta
                  week (June 24–28)? I need to renew my business permit and I work outside the
                  municipality.
                </p>
              </div>
            </div>
          </div>

          {/* Reply composer */}
          <div className="border-ink/20 rounded-md border p-5">
            <div className="flex items-center justify-between">
              <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                ✎ Your reply · draft
              </p>
              <span className="inline-flex gap-1.5">
                <Badge variant="outline">EN</Badge>
                <Badge variant="warn">[TL] suggested</Badge>
              </span>
            </div>
            <textarea
              rows={6}
              defaultValue={`Maraming salamat for reaching out. The Permits Office will follow modified hours on June 24, 26, and 27 (8 AM – 12 NN only). It will be closed on June 25 and 28.\n\nFor your renewal, you may also use the drop-box at the lobby — we will process and call you back within 2 business days.`}
              className="text-ink mt-3 w-full bg-transparent text-sm leading-relaxed italic outline-none"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-sm">
                  <Paperclip className="size-3.5" />
                  Attach
                </button>
                <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-sm">
                  <FileText className="size-3.5" />
                  Use template
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-faint text-xs italic">Sends an email to juan@…ph</span>
                <Button variant="outline" size="sm" className="font-script text-sm">
                  Save draft
                </Button>
                <Button size="sm" className="font-script text-sm">
                  <Send className="size-3.5" />
                  Send reply
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4">
          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Status
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {STATUS.map((s) => (
                <li key={s.label}>
                  <button
                    aria-current={s.active ? 'true' : undefined}
                    className="hover:bg-paper-2 aria-[current=true]:bg-rust/10 aria-[current=true]:text-rust flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${s.dot === 'rust' ? 'bg-rust' : s.dot === 'gold' ? 'bg-gold' : s.dot === 'success' ? 'bg-success' : 'bg-ink-ghost'}`}
                    />
                    <span className="font-script text-base">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Assigned to
            </p>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="bg-paper-3 border-ink/15 inline-flex size-7 items-center justify-center rounded-full border"
                />
                [Secretary]
              </span>
              <button className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-7 items-center gap-1.5 border border-dashed px-3 text-sm">
                <RefreshCw className="size-3" />
                Reassign
              </button>
            </div>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">Permits</Badge>
              <Badge variant="outline">Fiesta &apos;26</Badge>
              <button className="border-ink/30 text-ink-soft hover:border-ink rounded-pill inline-flex h-6 items-center gap-1 border border-dashed px-2 font-mono text-[10px] tracking-wide uppercase">
                <Plus className="size-3" /> Add
              </button>
            </div>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Related
            </p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {RELATED.map((r) => (
                <li key={r.label} className="text-ink-soft hover:text-rust italic">
                  · {r.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
