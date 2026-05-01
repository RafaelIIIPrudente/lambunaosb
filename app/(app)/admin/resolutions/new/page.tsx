import 'server-only';

import { format } from 'date-fns';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getCommittees } from '@/lib/db/queries/committees';
import { getActiveMembers } from '@/lib/db/queries/members';
import { getMeetingsList } from '@/lib/db/queries/meetings';
import { FALLBACK_TENANT, getCurrentTenantId } from '@/lib/db/queries/tenant';

import { NewResolutionForm } from './_form';

export const metadata = { title: 'Upload a resolution' };

export default async function NewResolutionPage() {
  const [members, meetings, committees, tenantId] = await Promise.all([
    safeBuildtimeQuery(() => getActiveMembers({ excludePositions: ['mayor'] }), []),
    safeBuildtimeQuery(() => getMeetingsList(), { rows: [], nextCursor: null }),
    safeBuildtimeQuery(() => getCommittees(), []),
    safeBuildtimeQuery(() => getCurrentTenantId(), FALLBACK_TENANT.id),
  ]);

  const sponsorOptions = members.map((m) => ({
    id: m.id,
    label: `${m.honorific} ${m.fullName}`,
  }));

  const meetingOptions = meetings.rows.map((m) => ({
    id: m.id,
    label: `${m.title} · ${format(m.date, 'MMM d, yyyy')}`,
  }));

  const committeeOptions = committees.map((c) => ({
    id: c.id,
    label: c.name,
    isStanding: c.isStanding,
  }));

  return (
    <div>
      <AdminPageHeader title="Upload a resolution" />
      <NewResolutionForm
        sponsorOptions={sponsorOptions}
        meetingOptions={meetingOptions}
        committeeOptions={committeeOptions}
        tenantId={tenantId}
      />
    </div>
  );
}
