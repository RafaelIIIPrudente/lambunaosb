import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Play,
  Search,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SPEAKERS = [
  { name: '[Secretary]', turns: 8, color: 'bg-navy-primary' },
  { name: 'Hon. [Member 1]', turns: 12, color: 'bg-gold' },
  { name: 'Hon. [Member 3]', turns: 9, color: 'bg-rust' },
  { name: 'Vice Mayor', turns: 4, color: 'bg-success' },
  { name: 'Unknown speaker', turns: 2, color: 'bg-ink-ghost' },
];

const TURNS = [
  {
    time: '00:28:14',
    speaker: '[Secretary]',
    text: 'Quorum is established with 14 of 14 members present. We proceed to the second reading of the tricycle franchising ordinance.',
  },
  {
    time: '00:28:42',
    speaker: 'Hon. [Member 3]',
    text: 'Mr. Chairman, I move that we adopt the resolution as endorsed by the Committee on Public Safety with the amendments discussed at the last hearing — particularly on the route corridors at the poblacion.',
  },
  {
    time: '00:29:18',
    speaker: 'Vice Mayor',
    flag: 'MOTION',
    text: 'Seconded.',
  },
  {
    time: '00:29:24',
    speaker: '[Secretary]',
    text: 'It has been moved by Hon. [Member 3] and seconded. Any objection? Hearing none — we now go to a vote.',
  },
  {
    time: '00:29:48',
    speaker: 'Hon. [Member 1]',
    text: 'Para sa kaayuhan sang aton mga drayber, [HIL placeholder — Hiligaynon translation will be inserted on review].',
  },
  {
    time: '00:30:22',
    speaker: '[Secretary]',
    text: 'Yea — 12. Nay — 1. Abstain — 1. The motion is carried.',
  },
];

const MINUTES = [
  { num: 1, label: 'CALL TO ORDER', body: 'Quorum established · 14 / 14 present.' },
  {
    num: 2,
    label: 'NEW BUSINESS',
    body: 'Tricycle franchising ord. · 2nd reading · passed 12-1-1.',
  },
  { num: 3, label: 'MOTIONS', body: 'Hon. [Member 3] moved to adopt; Vice Mayor seconded.' },
  {
    num: 4,
    label: 'ACTION ITEMS',
    body: "· Forward to Mayor's office for signature.\n· Publish ordinance bulletin (public site).",
  },
];

export default async function TranscriptEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <nav
          aria-label="Breadcrumb"
          className="text-ink-faint flex items-center gap-1.5 font-mono text-xs"
        >
          <Link href="/admin/meetings" className="hover:text-rust">
            Meetings
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href="/admin/meetings/mtg-013" className="hover:text-rust">
            Regular Session #13
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">Transcript</span>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="font-script text-base">
            <Users />
            Speakers (5)
          </Button>
          <Button className="font-script text-base">
            <CheckCircle2 />
            Approve
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
        {/* Audio + speakers */}
        <aside className="border-ink/20 rounded-md border p-4">
          <p className="text-rust mb-1 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Audio · Session #13
          </p>
          <p className="text-ink-faint font-mono text-xs">01:42:18 total</p>

          {/* Mini waveform */}
          <div className="border-ink/15 relative my-4 flex h-16 items-center gap-px rounded-md border px-2">
            {Array.from({ length: 50 }).map((_, i) => {
              const h = 15 + Math.abs(Math.cos(i * 0.5) * 50) + (i % 5) * 6;
              const played = i / 50 < 0.28;
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ height: `${Math.min(h, 70)}%` }}
                  className={`w-1 ${played ? 'bg-rust' : 'bg-ink-ghost'}`}
                />
              );
            })}
            <span className="bg-rust absolute top-0 left-[28%] h-full w-px" aria-hidden="true" />
          </div>
          <p className="text-ink-faint flex justify-between font-mono text-[10px]">
            <span>00:28:44</span>
            <span>01:42:18</span>
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              aria-label="Previous"
              className="border-ink/30 text-ink hover:bg-paper-2 inline-flex size-9 items-center justify-center rounded-md border"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Play"
              className="bg-rust text-paper inline-flex size-12 items-center justify-center rounded-full"
            >
              <Play className="size-5 fill-current" />
            </button>
            <button
              aria-label="Next"
              className="border-ink/30 text-ink hover:bg-paper-2 inline-flex size-9 items-center justify-center rounded-md border"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-ink-faint mb-1.5 text-xs">Speed</p>
            <div className="flex gap-1">
              {['0.75×', '1.0×', '1.25×', '1.5×', '2.0×'].map((s, i) => (
                <button
                  key={s}
                  aria-pressed={i === 1}
                  className="border-ink/25 text-ink-soft aria-[pressed=true]:bg-rust aria-[pressed=true]:text-paper aria-[pressed=true]:border-rust inline-flex h-7 flex-1 items-center justify-center rounded-md border font-mono text-[11px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-ink/15 my-5 border-t border-dashed" />

          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Speakers · click to relabel
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {SPEAKERS.map((s) => (
              <li
                key={s.name}
                className="hover:bg-paper-2 flex items-center justify-between rounded-md px-2 py-1.5"
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={`size-2.5 rounded-full ${s.color}`} />
                  <span className="text-ink font-script italic">{s.name}</span>
                </span>
                <span className="text-ink-faint font-mono text-[11px]">{s.turns} turns</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Transcript */}
        <article className="border-ink/20 rounded-md border">
          <header className="border-ink/15 flex items-center gap-3 border-b p-4">
            <div className="relative flex-1">
              <Search
                className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Find in transcript…"
                className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint h-9 w-full rounded-md border pr-3 pl-9 text-sm italic outline-none"
              />
            </div>
            <Badge variant="outline">EN</Badge>
            <Badge variant="new">HIL detected</Badge>
            <span className="text-ink-faint font-mono text-[11px]">auto-saved · 4s ago</span>
          </header>

          <ul className="flex flex-col">
            {TURNS.map((t, i) => (
              <li
                key={i}
                className={`border-ink/10 grid grid-cols-[80px_1fr] items-baseline gap-3 border-b border-dashed p-4 last:border-0 ${
                  t.flag ? 'bg-rust/5' : ''
                }`}
              >
                <span className="text-rust font-mono text-[11px] tabular-nums">{t.time}</span>
                <div>
                  <p className="text-ink mb-1 inline-flex items-center gap-2">
                    <span className="font-script text-base">{t.speaker}</span>
                    {t.flag && (
                      <Badge variant="new" className="text-[9px]">
                        Flagged: {t.flag}
                      </Badge>
                    )}
                  </p>
                  <p className="text-ink-soft text-sm leading-relaxed italic">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <footer className="border-ink/15 flex flex-wrap items-center gap-2 border-t p-3">
            <Button variant="outline" size="sm" className="font-script text-sm">
              <Play className="size-3.5" />
              Play from cursor
            </Button>
            <Button variant="outline" size="sm" className="font-script text-sm">
              <Edit3 className="size-3.5" />
              Edit speakers
            </Button>
            <Button variant="outline" size="sm" className="font-script text-sm">
              <Download className="size-3.5" />
              Export .docx
            </Button>
            <span className="text-ink-faint ml-auto font-mono text-[11px]">
              1,847 / ~3,400 words
            </span>
          </footer>
        </article>

        {/* Auto-extracted minutes */}
        <aside className="border-ink/20 rounded-md border p-4">
          <header className="mb-3 flex items-center gap-2">
            <Badge variant="destructive" className="text-[9px]">
              Auto-extracted
            </Badge>
            <Badge variant="warn" className="text-[9px]">
              Draft
            </Badge>
          </header>
          <h2 className="text-ink font-script mb-4 text-2xl">Draft Minutes</h2>

          <ol className="flex flex-col gap-4 text-sm">
            {MINUTES.map((m) => (
              <li key={m.num}>
                <p className="text-rust mb-1 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  {m.num}. {m.label}
                </p>
                <p className="text-ink-soft leading-relaxed whitespace-pre-line italic">{m.body}</p>
              </li>
            ))}
          </ol>

          <p className="text-ink-faint mt-5 text-xs italic">
            Generated from transcript · review before publishing as official minutes.
          </p>

          <Button className="font-script mt-5 w-full text-base">
            Publish minutes <ChevronRight />
          </Button>
        </aside>
      </div>
    </div>
  );
}
