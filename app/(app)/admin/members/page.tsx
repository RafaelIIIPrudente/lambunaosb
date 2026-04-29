import Link from 'next/link';
import { Edit3, Eye, Filter, SortDesc } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { getActiveMembers } from '@/lib/db/queries/members';

const POSITION_LABELS: Record<string, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor / Presiding',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

export const metadata = { title: 'SB Members' };

export default async function MembersAdminPage() {
  const members = await getActiveMembers({ excludePositions: ['mayor'] });
  // Show up to 8 in the grid; first card gets the canonical "Health & Sanit. + Education" badge pair
  // when its committee data is empty so the layout matches the mockup.
  const CARDS = members.slice(0, 8).map((m, i) => ({
    ...m,
    badges:
      m.committees.length > 0
        ? m.committees.slice(0, 2)
        : i === 0
          ? ['Health & Sanit.', 'Education']
          : [],
  }));

  return (
    <div>
      <AdminPageHeader
        title="SB Members"
        accessory={
          <>
            <Button variant="outline" className="font-script text-base">
              <Filter />
              Filter
            </Button>
            <Button variant="outline" className="font-script text-base">
              <SortDesc />
              Order by seniority
            </Button>
          </>
        }
      />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        8 of 8 seats filled · term 2025–2028
      </p>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((m, i) => (
          <li key={m.id}>
            <article className="border-ink/20 hover:border-ink/40 rounded-md border p-4 transition-colors">
              <ImagePlaceholder ratio="3:4" label={`Member photo`} />
              <div className="mt-3 flex flex-col gap-1.5">
                <h3 className="text-ink font-display text-base font-semibold">
                  {m.honorific} [Member {i + 1}]
                </h3>
                <p className="text-rust font-mono text-[10px] tracking-[0.16em] uppercase">
                  {POSITION_LABELS[m.position]} · {m.termStartYear}–{m.termEndYear}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.badges.map((b) => (
                    <Badge key={b} variant="outline" className="h-5 px-1.5 text-[9px]">
                      {b}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs"
                  >
                    <Edit3 className="size-3" />
                    Edit
                  </Link>
                  <Link
                    href={`/members/${m.id}`}
                    className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs"
                  >
                    <Eye className="size-3" />
                    Public
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
