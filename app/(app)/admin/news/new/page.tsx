import 'server-only';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getCommittees } from '@/lib/db/queries/committees';

import { NewsComposerForm } from './_form';

export const metadata = { title: 'New news post' };

export default async function NewNewsPostPage() {
  const committees = await safeBuildtimeQuery(() => getCommittees(), []);
  const committeeOptions = committees.map((c) => ({
    id: c.id,
    label: c.name,
    isStanding: c.isStanding,
  }));

  return (
    <div>
      <AdminPageHeader title="New news post" />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        Create a draft. Upload the cover image, photo gallery, and publish on the next step (Edit).
      </p>
      <NewsComposerForm committeeOptions={committeeOptions} />
    </div>
  );
}
