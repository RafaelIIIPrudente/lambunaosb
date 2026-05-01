import 'server-only';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getActiveMembers } from '@/lib/db/queries/members';
import { getNextMeetingSequenceNumber } from '@/lib/db/queries/meetings';

import { NewMeetingForm } from './_form';

export const metadata = { title: 'New meeting' };

export default async function NewMeetingPage() {
  const currentYear = new Date().getFullYear();
  const [members, suggestedSequenceNumber] = await Promise.all([
    safeBuildtimeQuery(() => getActiveMembers({ excludePositions: ['mayor'] }), []),
    safeBuildtimeQuery(() => getNextMeetingSequenceNumber('regular', currentYear), 1),
  ]);

  const presiderOptions = members.map((m) => ({
    id: m.id,
    label: `${m.honorific} ${m.fullName}`,
  }));

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-4 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/meetings" className="hover:text-rust">
          Meetings
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">New meeting</span>
      </nav>

      <AdminPageHeader title="New meeting" />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        Create a session record. Recording, transcription, and minutes happen on the detail page
        once the meeting is scheduled.
      </p>

      <NewMeetingForm
        presiderOptions={presiderOptions}
        suggestedSequenceNumber={suggestedSequenceNumber}
      />
    </div>
  );
}
