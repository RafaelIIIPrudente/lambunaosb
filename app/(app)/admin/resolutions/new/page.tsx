import 'server-only';

import { format } from 'date-fns';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { getActiveMembers } from '@/lib/db/queries/members';
import { getMeetingsList } from '@/lib/db/queries/meetings';

import { NewResolutionForm } from './_form';

export const metadata = { title: 'Draft a resolution' };

export default async function NewResolutionPage() {
  const [members, meetings] = await Promise.all([
    getActiveMembers({ excludePositions: ['mayor'] }),
    getMeetingsList(),
  ]);

  const sponsorOptions = members.map((m) => ({
    id: m.id,
    label: `${m.honorific} ${m.fullName}`,
  }));

  const meetingOptions = meetings.map((m) => ({
    id: m.id,
    label: `${m.title} · ${format(m.date, 'MMM d, yyyy')}`,
  }));

  return (
    <div>
      <AdminPageHeader title="Draft a resolution" />
      <NewResolutionForm sponsorOptions={sponsorOptions} meetingOptions={meetingOptions} />
    </div>
  );
}
