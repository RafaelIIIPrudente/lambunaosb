import 'server-only';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { getCommittees } from '@/lib/db/queries/committees';

import { MemberComposerForm } from './_form';

export const metadata = { title: 'Add SB member' };

export default async function NewMemberPage() {
  const committees = await getCommittees();
  const committeeOptions = committees.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <AdminPageHeader title="Add SB member" />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        Create a profile first. Upload the portrait on the next step (Edit).
      </p>
      <MemberComposerForm committeeOptions={committeeOptions} />
    </div>
  );
}
