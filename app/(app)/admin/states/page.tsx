import Link from 'next/link';
import { ArrowRight, Inbox, Wifi, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata = { title: 'States · empty / loading / error' };

export default function StatesPage() {
  return (
    <div>
      <p className="text-ink-faint mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
        Reference
      </p>
      <h1 className="text-ink font-script mb-6 text-3xl">
        States — empty · loading · error · offline
      </h1>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* EMPTY */}
        <article className="border-ink/15 rounded-md border bg-transparent p-1">
          <div className="bg-ink text-paper inline-flex h-6 items-center gap-2 rounded-tl-md px-3 font-mono text-[10px] tracking-[0.16em] uppercase">
            Empty
          </div>
          <span className="text-ink-faint ml-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            Queries inbox
          </span>
          <div className="bg-paper-2/50 border-ink/15 mt-2 flex flex-col items-center gap-3 rounded-md border border-dashed py-12 text-center">
            <Inbox className="text-ink-faint size-10" aria-hidden="true" />
            <p className="text-ink font-script text-2xl">No queries yet</p>
            <p className="text-ink-soft mx-auto max-w-[20ch] text-sm italic">
              When a citizen submits via the public form, it&apos;ll show up here for triage.
            </p>
            <Link
              href="/submit-query"
              className="border-ink/30 text-ink hover:bg-paper font-script rounded-pill mt-2 inline-flex h-8 items-center gap-1.5 border border-dashed px-3.5 text-sm"
            >
              Open public form <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </article>

        {/* LOADING */}
        <article className="border-ink/15 rounded-md border bg-transparent p-1">
          <div className="bg-ink text-paper inline-flex h-6 items-center gap-2 rounded-tl-md px-3 font-mono text-[10px] tracking-[0.16em] uppercase">
            Loading
          </div>
          <span className="text-ink-faint ml-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            Meetings list
          </span>
          <div className="mt-2 space-y-2.5 p-4">
            <div className="bg-paper-3 h-3 w-1/2 rounded-full" />
            <div className="bg-paper-3 h-3 w-1/3 rounded-full" />
            <div className="bg-ink-ghost/60 my-3 h-px" />
            <div className="bg-paper-3 grid grid-cols-[80px_1fr_60px] gap-3">
              <div className="bg-paper-3 h-2.5 rounded-full" />
              <div className="bg-paper-3 h-2.5 rounded-full" />
              <div className="bg-paper-3 h-2.5 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_60px] gap-3 py-1.5">
                <div className="bg-paper-3 h-2.5 rounded-full" />
                <div className="bg-paper-3 h-2.5 rounded-full" />
                <div className="bg-paper-3 h-2.5 rounded-full" />
              </div>
            ))}
            <p className="text-ink-faint mt-4 text-center font-mono text-[10px] tracking-wide">
              shimmer · 600ms loop · respects prefers-reduced-motion
            </p>
          </div>
        </article>

        {/* ERROR */}
        <article className="border-ink/15 rounded-md border bg-transparent p-1">
          <div className="bg-ink text-paper inline-flex h-6 items-center gap-2 rounded-tl-md px-3 font-mono text-[10px] tracking-[0.16em] uppercase">
            Error
          </div>
          <span className="text-ink-faint ml-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            Resolutions list
          </span>
          <div className="bg-paper-2/50 border-ink/15 mt-2 flex flex-col items-center gap-3 rounded-md border border-dashed py-12 text-center">
            <span className="border-rust inline-flex size-12 items-center justify-center rounded-full border-2">
              <X className="text-rust size-6" aria-hidden="true" />
            </span>
            <p className="text-ink font-script text-2xl">Couldn&apos;t load resolutions</p>
            <p className="text-ink-soft mx-auto max-w-[28ch] text-sm italic">
              Network is slow or unavailable. Cached results from your last sync are below.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="font-script text-sm">
                <ArrowRight className="size-3.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" className="font-script text-sm">
                Show cached (3h old)
              </Button>
            </div>
            <p className="text-rust mt-3 font-mono text-[10px]">
              error: NET_TIMEOUT · req-id 7a8c_2d
            </p>
          </div>
        </article>
      </div>

      {/* OFFLINE banner */}
      <div className="mt-6">
        <div className="bg-ink text-paper inline-flex h-6 items-center gap-2 rounded-tl-md px-3 font-mono text-[10px] tracking-[0.16em] uppercase">
          Offline
        </div>
        <span className="text-ink-faint ml-2 font-mono text-[10px] tracking-[0.16em] uppercase">
          Recorder · 3G drop banner
        </span>
        <div className="bg-gold/85 text-ink mt-2 flex items-center justify-between rounded-md px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <Wifi className="size-4" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Offline.</strong>{' '}
              <em>
                We&apos;re holding your audio locally — recording won&apos;t stop. We&apos;ll upload
                everything once your connection returns.
              </em>
            </span>
          </span>
          <span className="font-mono text-xs">buffered: 12.4 MB · 4m 22s</span>
        </div>
      </div>
    </div>
  );
}
