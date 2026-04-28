import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Search, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const META = {
  number: 'RES-2026-014',
  title: 'Tricycle franchising ordinance',
  status: 'approved' as const,
  tags: ['Ordinance', 'Public safety'],
  sponsors: ['Hon. [Member 3]', 'Hon. [Member 7]'],
  coSponsors: 'Hon. [Member 1] +2',
  dateFiled: '2026-05-28',
  firstReading: '2026-06-05',
  secondReading: '2026-06-12',
  vote: '12 – 1 – 1 (Yea–Nay–Abstain)',
  linkedMeeting: 'Reg. Session #14',
};

const VERSIONS = [
  { v: 'v3', date: 'Jun 12', label: '2nd reading approved', actor: '[Secretary]', current: true },
  { v: 'v2', date: 'Jun 5', label: '1st reading w/ amendments', actor: '[Member 3]' },
  { v: 'v1', date: 'May 28', label: 'filed', actor: '[Member 3]' },
];

export default async function ResolutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <div>
      {/* page-action topbar accessory replaced by inline buttons here */}
      <div className="mb-6 flex items-center justify-between">
        <nav
          aria-label="Breadcrumb"
          className="text-ink-faint flex items-center gap-1.5 font-mono text-xs"
        >
          <Link href="/admin/resolutions" className="hover:text-rust">
            Resolutions
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">{META.number}</span>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="font-script text-base">
            <Download />
            Download
          </Button>
          <Button className="font-script text-base">
            <Upload />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* PDF preview */}
        <article className="border-ink/20 rounded-md border">
          <header className="border-ink/15 flex items-center justify-between border-b px-4 py-3">
            <p className="text-ink-soft font-mono text-xs">{META.number}.pdf · 1.2 MB · 3 pages</p>
            <div className="flex items-center gap-2">
              <span className="border-ink/25 inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2 font-mono text-[11px]">
                <Search className="size-3" aria-hidden="true" /> 100%
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Download">
                <Download />
              </Button>
            </div>
          </header>

          <div className="bg-paper-2/40 p-6">
            <div className="bg-paper border-ink/15 mx-auto max-w-[600px] rounded-md border p-12 shadow-sm">
              <p className="text-navy-primary text-center font-mono text-[10px] tracking-[0.18em] uppercase">
                Republic of the Philippines
              </p>
              <p className="text-navy-primary mt-1 text-center font-mono text-[10px] tracking-[0.18em] uppercase">
                Province of Iloilo · Municipality of Lambunao
              </p>
              <p className="text-rust mt-1 text-center font-mono text-[10px] tracking-[0.18em] uppercase">
                Office of the Sangguniang Bayan
              </p>
              <hr className="border-ink/30 my-6 border-t" />
              <p className="text-ink text-center font-mono text-xs tracking-wide">
                RESOLUTION №. 2026-014
              </p>
              <p className="text-navy-primary mt-3 text-center text-sm italic">
                An ordinance regulating tricycle franchising in poblacion areas of the municipality.
              </p>

              <div className="mt-8 space-y-2">
                <div className="bg-paper-3 h-1.5 w-full rounded-full" />
                <div className="bg-paper-3 h-1.5 w-2/3 rounded-full" />
                <div className="bg-paper-3 h-1.5 w-3/4 rounded-full" />
              </div>

              <p className="text-ink mt-6 text-xs font-bold tracking-wide uppercase">WHEREAS,</p>
              <div className="mt-2 space-y-2">
                <div className="bg-paper-3 h-1.5 w-full rounded-full" />
                <div className="bg-paper-3 h-1.5 w-1/2 rounded-full" />
              </div>

              <p className="text-ink mt-6 text-xs font-bold tracking-wide uppercase">
                NOW, THEREFORE, BE IT RESOLVED,
              </p>
              <div className="mt-2 space-y-2">
                <div className="bg-paper-3 h-1.5 w-full rounded-full" />
                <div className="bg-paper-3 h-1.5 w-3/4 rounded-full" />
              </div>

              <p className="border-rust text-rust mt-12 inline-block rounded-sm border border-dashed px-3 py-1 font-mono text-[10px] tracking-wide">
                CERTIFIED COPY
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon-sm" aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="text-ink-faint font-mono text-xs">Page 1 / 3</span>
              <Button variant="ghost" size="icon-sm" aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </article>

        {/* Right rail */}
        <aside className="flex flex-col gap-5">
          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata
            </p>
            <p className="text-ink font-mono text-xs">{META.number}</p>
            <p className="text-ink font-script mt-1 text-lg">{META.title}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="success">✓ Approved</Badge>
              {META.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
            <hr className="border-ink/15 my-4 border-t border-dashed" />
            <dl className="text-ink-soft grid grid-cols-[110px_1fr] gap-y-2 text-xs italic">
              <dt className="text-ink-faint not-italic">Sponsor(s)</dt>
              <dd>{META.sponsors.join(', ')}</dd>
              <dt className="text-ink-faint not-italic">Co-sponsors</dt>
              <dd>{META.coSponsors}</dd>
              <dt className="text-ink-faint not-italic">Date filed</dt>
              <dd className="font-mono not-italic">{META.dateFiled}</dd>
              <dt className="text-ink-faint not-italic">1st reading</dt>
              <dd className="font-mono not-italic">{META.firstReading}</dd>
              <dt className="text-ink-faint not-italic">2nd reading</dt>
              <dd className="font-mono not-italic">{META.secondReading}</dd>
              <dt className="text-ink-faint not-italic">Vote</dt>
              <dd className="font-mono not-italic">{META.vote}</dd>
              <dt className="text-ink-faint not-italic">Linked meeting</dt>
              <dd>{META.linkedMeeting}</dd>
            </dl>
          </div>

          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Version history
            </p>
            <ol className="flex flex-col gap-3">
              {VERSIONS.map((v) => (
                <li key={v.v} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${v.current ? 'bg-rust' : 'bg-ink-ghost'}`}
                  />
                  <div className="flex-1">
                    <p className="text-ink text-sm">
                      <span className="font-semibold">{v.v}</span>{' '}
                      {v.current && <span className="text-rust text-xs">· current</span>}
                    </p>
                    <p className="text-ink-soft mt-0.5 text-xs italic">
                      {v.date} · {v.label}
                    </p>
                    <p className="text-ink-faint font-mono text-[11px]">by {v.actor}</p>
                  </div>
                  {!v.current && (
                    <button className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-7 items-center border border-dashed px-3 text-sm">
                      Diff
                    </button>
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
