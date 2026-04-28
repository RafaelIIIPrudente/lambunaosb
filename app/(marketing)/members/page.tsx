import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

export const metadata = {
  title: 'Members',
  description: 'The members of the Sangguniang Bayan ng Lambunao for term 2025–2028.',
};

export default function MembersPage() {
  // Drop the Mayor — directory is for SB members + Vice Mayor (presider)
  const members = mockMembers.filter((m) => m.position !== 'mayor');

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
      <header className="mb-12">
        <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          Your council · Term 2025–2028
        </p>
        <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
          Meet your SB Members
        </h1>
        <p className="text-ink-soft font-script mt-6 max-w-2xl text-xl leading-snug">
          The Sangguniang Bayan is composed of the Vice Mayor (presiding officer) and{' '}
          {members.length - 1} elected members who serve three-year terms.
        </p>
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member, i) => (
          <li key={member.id}>
            <article className="border-ink/30 hover:border-ink/50 hover:shadow-e1 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-4 transition-all">
              <ImagePlaceholder ratio="1:1" label={`Member ${i + 1}`} />
              <div className="flex flex-col gap-2.5 px-1 pb-1">
                <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                  {POSITION_LABELS[member.position]}
                </p>
                <h2 className="text-ink font-display text-xl leading-snug font-semibold">
                  {member.honorific} {member.fullName}
                </h2>
                {member.committees.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {member.committees.map((committee) => (
                      <li
                        key={committee}
                        className="border-ink/35 text-ink-soft rounded-pill inline-flex items-center border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase"
                      >
                        {committee}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/members/${member.id}`}
                  className="border-ink/30 text-ink hover:border-ink hover:bg-paper-2 font-script rounded-pill mt-2 inline-flex h-9 w-fit items-center gap-1.5 border border-dashed px-4 text-sm transition-colors"
                >
                  View profile
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
