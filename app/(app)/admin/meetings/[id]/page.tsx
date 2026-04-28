import Link from 'next/link';
import { ChevronRight, Mic, Pause, Square, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const TABS = ['Details', 'Audio', 'Transcript', 'Minutes', 'Resolutions'];
const LANGS = ['English', 'Tagalog', 'Hiligaynon', 'Auto-detect'];
const MARKERS = ['Motion', 'Vote', 'Decision', 'Question', 'Quote', 'Off-record'];
const RECENT_MARKERS = [
  { time: '00:08:14', kind: 'MOTION', text: 'Tricycle franchising amendment' },
  { time: '00:11:02', kind: 'VOTE', text: 'Yea 12 / Nay 1 / Abstain 1' },
];
const AGENDA = [
  '1. Roll call',
  '2. Reading & approval of last minutes',
  '3. Tricycle franchising — 2nd reading',
  '4. BHW honoraria adjustment',
  '5. Other matters',
];

export default async function MeetingRecorderPage({ params }: { params: Promise<{ id: string }> }) {
  await params;

  return (
    <div>
      {/* Breadcrumb / topline */}
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-4 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/meetings" className="hover:text-rust">
          Meetings
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Regular Session #14</span>
      </nav>

      <div className="mb-2 flex items-center gap-3">
        <p className="text-ink-soft font-mono text-[11px] tracking-[0.18em] uppercase">
          Jun 16, 2026 · 9:00 AM · Session Hall
        </p>
        <Badge variant="new" className="gap-1.5">
          <span
            className="bg-paper inline-block size-1.5 animate-pulse rounded-full"
            aria-hidden="true"
          />
          Recording
        </Badge>
      </div>

      <h1 className="text-ink font-script mb-6 text-4xl">Regular Session #14</h1>

      {/* Tabs */}
      <nav aria-label="Sections" className="border-ink/15 mb-6 flex gap-6 border-b">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            aria-current={i === 1 ? 'page' : undefined}
            className="text-ink-soft hover:text-ink aria-[current=page]:text-rust aria-[current=page]:border-rust font-script -mb-px border-b-2 border-transparent pb-2.5 text-base"
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Recorder */}
        <article className="border-ink/20 rounded-md border p-6">
          {/* Language picker */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <p className="text-ink-faint font-mono text-[10px] tracking-[0.18em] uppercase">
              Language
            </p>
            {LANGS.map((l, i) => (
              <button
                key={l}
                type="button"
                aria-pressed={i === 2}
                className="border-ink/30 text-ink-soft hover:border-ink aria-[pressed=true]:bg-rust aria-[pressed=true]:text-paper aria-[pressed=true]:border-rust font-script rounded-pill inline-flex h-7 items-center border px-3 text-sm transition-colors"
              >
                {l}
              </button>
            ))}
          </div>

          {/* Waveform — pure CSS bars */}
          <div className="border-ink/15 relative flex h-24 items-center gap-px overflow-hidden rounded-md border bg-transparent px-3">
            {Array.from({ length: 80 }).map((_, i) => {
              const h = 18 + Math.abs(Math.sin(i * 0.7) * 60) + (i % 7) * 4;
              const recorded = i / 80 < 0.3;
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ height: `${Math.min(h, 80)}%` }}
                  className={`w-1 ${recorded ? 'bg-rust' : 'bg-ink-ghost'}`}
                />
              );
            })}
            <span aria-hidden="true" className="bg-rust absolute top-0 left-[30%] h-full w-px" />
            <span className="text-ink-faint absolute top-1.5 left-3 font-mono text-[10px]">
              0:00:00
            </span>
            <span className="text-ink-faint absolute top-1.5 right-3 font-mono text-[10px]">
              est. 1:30:00
            </span>
          </div>

          {/* Timer + controls */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-rust font-display text-5xl tabular-nums md:text-6xl">00:14:32</p>
            <p className="text-ink-faint font-mono text-[11px] tracking-wide">elapsed</p>

            <div className="mt-2 flex items-center gap-4">
              <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-10 items-center gap-2 rounded-md border border-dashed px-4">
                <Pause className="size-4" />
                Pause
              </button>
              <button
                aria-label="Stop recording"
                className="border-rust hover:bg-rust/10 inline-flex size-16 items-center justify-center rounded-full border-2"
              >
                <Square className="text-rust fill-rust size-6" aria-hidden="true" />
              </button>
              <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-10 items-center gap-2 rounded-md border border-dashed px-4">
                <Mic className="size-4" />
                Mark speaker
              </button>
            </div>
          </div>

          <hr className="border-ink/15 my-6 border-t border-dashed" />

          <div className="flex items-center justify-between">
            <p className="text-ink-soft inline-flex items-center gap-2 text-sm italic">
              <Upload className="size-4" />
              Or upload an existing recording
            </p>
            <button className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-9 items-center gap-1.5 border border-dashed px-4 text-sm">
              Choose mp3 / .wav / .m4a
            </button>
          </div>

          <p className="text-ink-faint mt-5 font-mono text-[11px] leading-relaxed">
            Audio is stored locally during 3G drops, then uploaded when online. Recovery banner
            appears if app reopens mid-session.
          </p>
        </article>

        {/* Right panels */}
        <aside className="flex flex-col gap-5">
          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Quick markers
            </p>
            <p className="text-ink-soft mb-3 text-sm italic">Tap to flag a moment</p>
            <div className="flex flex-wrap gap-1.5">
              {MARKERS.map((m) => (
                <button
                  key={m}
                  className="border-ink/30 text-ink-soft hover:border-rust hover:text-rust font-script rounded-pill inline-flex h-7 items-center border border-dashed px-3 text-sm transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>
            <ul className="border-ink/15 mt-4 flex flex-col gap-2 border-t border-dashed pt-3 text-sm">
              {RECENT_MARKERS.map((rm, i) => (
                <li key={i} className="grid grid-cols-[64px_auto_1fr] items-center gap-2">
                  <span className="text-rust font-mono text-[11px] tabular-nums">{rm.time}</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[9px]">
                    {rm.kind}
                  </Badge>
                  <span className="text-ink-soft text-xs italic">{rm.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Agenda
            </p>
            <ol className="flex flex-col gap-1.5 text-sm">
              {AGENDA.map((a, i) => (
                <li
                  key={i}
                  className={
                    i === 2
                      ? 'text-rust font-script text-base font-semibold'
                      : 'text-ink-soft font-script text-base'
                  }
                >
                  {a}
                  {i === 2 && (
                    <span className="text-rust ml-2 text-xs italic">· currently here</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
