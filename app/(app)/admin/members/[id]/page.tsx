import 'server-only';

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Eye, Mail, Phone } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/require-user';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getMemberById } from '@/lib/db/queries/members';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';
import { COMMITTEE_ROLE_LABELS, MEMBER_POSITION_LABELS } from '@/lib/validators/member';

import { MemberActionsBar } from './_actions-bar';

export const metadata = { title: 'Member detail' };

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  const member = await safeBuildtimeQuery(() => getMemberById(id), null);
  if (!member) notFound();

  const signedDownloadUrl = await safeBuildtimeQuery(
    () =>
      getCompressedImageUrl({
        supabase: createAdminClient(),
        bucket: 'members-portraits',
        prefix: member.photoStoragePath,
        size: pickSizeForSurface('inline'),
      }),
    null,
  );

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
        <span className="text-ink">
          {member.honorific} {member.fullName}
        </span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink font-script text-3xl leading-tight">
            {member.honorific} {member.fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={member.active ? 'success' : 'destructive'}>
              {member.active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">{MEMBER_POSITION_LABELS[member.position]}</Badge>
            <Badge variant="outline">
              Term {member.termStartYear}–{member.termEndYear}
            </Badge>
            {member.seniority && <Badge variant="outline">{member.seniority}</Badge>}
            {!member.showOnPublic && <Badge variant="warn">Hidden from public</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="font-medium">
          <Link
            href={`/members/${member.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open public profile in new tab"
          >
            <Eye />
            Public view
          </Link>
        </Button>
      </header>

      <div className="mb-6">
        <MemberActionsBar memberId={member.id} active={member.active} userRole={ctx.profile.role} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr_280px]">
        {/* Portrait */}
        <aside>
          <div className="border-ink/15 bg-paper-2 relative mx-auto flex aspect-[3/4] w-full max-w-[180px] items-center justify-center overflow-hidden rounded-md border sm:max-w-[280px]">
            {signedDownloadUrl ? (
              <Image
                src={signedDownloadUrl}
                alt={`Portrait of ${member.fullName}`}
                fill
                sizes="(max-width: 1024px) 100vw, 280px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className="bg-paper border-ink/25 text-ink-soft font-script flex size-24 items-center justify-center rounded-full border text-3xl"
                >
                  {member.initials}
                </span>
                <span className="text-ink-faint font-mono text-[11px]">No portrait yet</span>
              </div>
            )}
          </div>
        </aside>

        {/* Bio + committees */}
        <div className="flex flex-col gap-5">
          <article className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Biography
            </p>
            {member.bioMd && member.bioMd.trim().length > 0 ? (
              <div className="text-ink prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
                {member.bioMd}
              </div>
            ) : (
              <p className="text-ink-faint font-mono text-xs">
                No biography on file. Use Edit to add one.
              </p>
            )}
          </article>

          <article className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Committee assignments
            </p>
            {member.committeeAssignments.length === 0 ? (
              <p className="text-ink-faint font-mono text-xs">No active committee assignments.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {member.committeeAssignments.map((a) => (
                  <li
                    key={a.committee.id}
                    className="border-ink/15 flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2"
                  >
                    <span className="text-ink text-sm">{a.committee.name}</span>
                    <Badge
                      variant={
                        a.role === 'chair'
                          ? 'success'
                          : a.role === 'vice_chair'
                            ? 'outline'
                            : 'outline'
                      }
                    >
                      {COMMITTEE_ROLE_LABELS[a.role]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        {/* Sidebar metadata */}
        <aside className="flex flex-col gap-5">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Contact
            </p>
            {member.contactEmail ? (
              <p className="text-ink-soft inline-flex items-center gap-2 text-sm break-all">
                <Mail className="text-ink-faint size-3.5 shrink-0" aria-hidden="true" />
                <a href={`mailto:${member.contactEmail}`} className="hover:text-rust">
                  {member.contactEmail}
                </a>
              </p>
            ) : (
              <p className="text-ink-faint font-mono text-xs">No email on file.</p>
            )}
            {member.contactPhone && (
              <p className="text-ink-soft mt-2 inline-flex items-center gap-2 text-sm">
                <Phone className="text-ink-faint size-3.5 shrink-0" aria-hidden="true" />
                <span>{member.contactPhone}</span>
              </p>
            )}
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Visibility
            </p>
            <p className="text-ink-soft text-xs">
              {member.showOnPublic
                ? 'Shown on the public /members directory.'
                : 'Hidden from the public directory.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
