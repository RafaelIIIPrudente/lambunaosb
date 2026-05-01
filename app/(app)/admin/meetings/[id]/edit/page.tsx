import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getMeetingById } from '@/lib/db/queries/meetings';
import { getActiveMembers } from '@/lib/db/queries/members';

import { EditMeetingForm } from './_form';

export const metadata = { title: 'Edit meeting' };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localTimeString(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await safeBuildtimeQuery(() => getMeetingById(id), null);
  if (!meeting) notFound();
  if (meeting.status !== 'scheduled') {
    // Editing locked once recording starts; redirect to detail.
    notFound();
  }

  const members = await safeBuildtimeQuery(
    () => getActiveMembers({ excludePositions: ['mayor'] }),
    [],
  );
  const presiderOptions = members.map((m) => ({
    id: m.id,
    label: `${m.honorific} ${m.fullName}`,
  }));

  const agendaText = meeting.agenda.map((item) => item.title).join('\n');

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
        <Link href={`/admin/meetings/${meeting.id}`} className="hover:text-rust">
          {meeting.title}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Edit</span>
      </nav>

      <AdminPageHeader title="Edit meeting" />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        Editing is locked once recording starts. To change a meeting after that point, cancel and
        reschedule.
      </p>

      <EditMeetingForm
        meetingId={meeting.id}
        presiderOptions={presiderOptions}
        initialValues={{
          title: meeting.title,
          type: meeting.type,
          sequenceNumber: meeting.sequenceNumber,
          scheduledDate: localDateString(meeting.scheduledAt),
          scheduledTime: localTimeString(meeting.scheduledAt),
          presiderId: meeting.presider?.id ?? null,
          primaryLocale: meeting.primaryLocale as 'en' | 'tl' | 'hil',
          location: meeting.location,
          expectedDurationMinutes: null,
          cleanupEnabled: meeting.cleanupEnabled,
          agendaText,
        }}
      />
    </div>
  );
}
