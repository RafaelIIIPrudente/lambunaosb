import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { mockMembers } from '@/lib/mock/meetings';

const POSITION_LABELS: Record<string, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

export async function generateStaticParams() {
  return mockMembers.map((m) => ({ id: m.id }));
}

const ACTIVITY = [
  { kind: 'Sponsored', target: 'RES-2026-013 — BHW honoraria adjustment', date: 'Jun 5' },
  { kind: 'Co-sponsored', target: 'RES-2026-014 — Tricycle franchising', date: 'Jun 12' },
  { kind: 'Spoke at', target: 'Reg. Session #13 (3 motions)', date: 'Jun 9' },
];

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = mockMembers.find((m) => m.id === id);
  if (!member) notFound();

  const eyebrowParts = [
    POSITION_LABELS[member.position]?.toUpperCase(),
    member.position === 'vice_mayor' ? 'PRESIDING OFFICER' : null,
    `TERM ${member.termStartYear}–${member.termEndYear}`,
  ].filter(Boolean);

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8 md:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="text-ink-faint flex flex-wrap items-center gap-2 font-mono text-xs">
          <li>
            <Link href="/" className="hover:text-rust">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" />
          </li>
          <li>
            <Link href="/members" className="hover:text-rust">
              Members
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" />
          </li>
          <li className="text-ink" aria-current="page">
            {member.honorific} {member.fullName}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 md:grid-cols-[280px_1fr] md:gap-12">
        {/* Left column — portrait + office */}
        <aside className="flex flex-col gap-5">
          <div className="border-ink/30 rounded-md border border-dashed p-1.5">
            <ImagePlaceholder ratio="3:4" label="Member portrait" />
          </div>

          <div className="border-ink/25 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
              Office
            </p>
            <p className="text-ink font-display text-sm leading-relaxed italic">
              SB Office, 2/F Municipal Hall
            </p>
            <p className="text-ink-soft mt-2 font-mono text-xs">(033) 333-1234</p>
            <Button asChild className="font-script mt-4 w-full text-base">
              <Link href={`/submit-query?to=${member.id}`}>
                <Mail />
                Contact via form
              </Link>
            </Button>
          </div>
        </aside>

        {/* Right column — name, badges, bio, activity */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
              {eyebrowParts.join(' · ')}
            </p>
            <h1 className="text-ink font-display text-5xl leading-tight font-bold tracking-tight md:text-6xl">
              {member.honorific} {member.fullName}
            </h1>
          </div>

          {member.committees.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {member.committees.map((c, i) => (
                <li key={c}>
                  <Badge variant={i === 0 ? 'destructive' : 'outline'} className="h-7 px-3">
                    {c} {i === 0 ? '(Chair)' : '(Member)'}
                  </Badge>
                </li>
              ))}
              <li>
                <Badge variant="outline" className="h-7 px-3">
                  Public safety (Member)
                </Badge>
              </li>
            </ul>
          )}

          <section>
            <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
              Biography
            </p>
            <p className="text-navy-primary font-display max-w-[60ch] text-lg leading-relaxed italic">
              [Short biography placeholder — 2 to 4 sentences. Background, areas of advocacy, prior
              public service. The bio supports both [TL] and [HIL] translations.]
            </p>
            <div className="mt-6 space-y-2">
              <div className="bg-paper-3 h-1.5 w-full rounded-full" />
              <div className="bg-paper-3 h-1.5 w-2/3 rounded-full" />
            </div>
          </section>

          <section>
            <p className="text-rust mb-4 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
              Recent activity
            </p>
            <ul className="divide-ink/15 divide-y divide-dashed">
              {ACTIVITY.map((a, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[110px_1fr_auto] items-baseline gap-4 py-3 text-sm"
                >
                  <span className="font-script text-ink-soft text-base italic">{a.kind}</span>
                  <span className="text-navy-primary font-display italic">{a.target}</span>
                  <span className="text-ink-faint font-mono text-xs">{a.date}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
