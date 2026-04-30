import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { requireUser } from '@/lib/auth/require-user';
import { getCommittees } from '@/lib/db/queries/committees';
import { getMemberById } from '@/lib/db/queries/members';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

import { MemberEditorForm } from './_form';
import { PhotoSection } from './_photo-section';

export const metadata = { title: 'Edit SB member' };

const AUTHOR_ROLES = ['secretary', 'vice_mayor'] as const;

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  const member = await getMemberById(id);
  if (!member) notFound();

  const isSelf = ctx.profile.memberId === member.id;
  const isAuthor = (AUTHOR_ROLES as readonly string[]).includes(ctx.profile.role);
  if (!isAuthor && !isSelf) {
    notFound();
  }

  const [committees, tenantId, signedDownloadUrl] = await Promise.all([
    getCommittees(),
    getCurrentTenantId(),
    getCompressedImageUrl({
      supabase: createAdminClient(),
      bucket: 'members-portraits',
      prefix: member.photoStoragePath,
      size: pickSizeForSurface('inline'),
    }),
  ]);

  const committeeOptions = committees.map((c) => ({ id: c.id, name: c.name }));
  const initialAssignments = member.committeeAssignments.map((a) => ({
    committeeId: a.committee.id,
    role: a.role,
  }));

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-2 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/members" className="hover:text-rust">
          SB Members
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link href={`/admin/members/${member.id}`} className="hover:text-rust">
          {member.honorific} {member.fullName}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Edit</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink font-script text-3xl leading-tight">Edit member</h1>
          <p className="text-ink-soft mt-1 text-sm italic">
            {member.honorific} {member.fullName}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside>
          <PhotoSection
            memberId={member.id}
            tenantId={tenantId}
            fullName={member.fullName}
            initials={member.initials}
            photoStoragePath={member.photoStoragePath}
            signedDownloadUrl={signedDownloadUrl}
            canUpload={isAuthor || isSelf}
          />
        </aside>

        <MemberEditorForm
          memberId={member.id}
          initialValues={{
            fullName: member.fullName,
            honorific: member.honorific,
            position: member.position,
            termStartYear: member.termStartYear,
            termEndYear: member.termEndYear,
            seniority: member.seniority ?? '',
            contactEmail: member.contactEmail ?? '',
            contactPhone: member.contactPhone ?? '',
            bioMd: member.bioMd ?? '',
            showOnPublic: member.showOnPublic,
            sortOrder: 100,
            active: member.active,
          }}
          initialAssignments={initialAssignments}
          committeeOptions={committeeOptions}
          canChangePosition={isAuthor}
        />
      </div>
    </div>
  );
}
