import 'server-only';

import { AdminPageHeader } from '@/components/app/admin-page-header';

import { NewsComposerForm } from './_form';

export const metadata = { title: 'New news post' };

export default function NewNewsPostPage() {
  return (
    <div>
      <AdminPageHeader title="New news post" />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        Create a draft. Upload the cover image, photo gallery, and publish on the next step (Edit).
      </p>
      <NewsComposerForm />
    </div>
  );
}
