import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getMeetingById } from '@/lib/db/queries/meetings';
import { getActiveMembers } from '@/lib/db/queries/members';
import { FALLBACK_TENANT, getCurrentTenantId } from '@/lib/db/queries/tenant';
import { meetingMinutes, type MinutesItemOfBusiness, newsPosts } from '@/lib/db/schema';
import type { MinutesStatusValue } from '@/lib/validators/minutes';

import { MinutesActionsBar } from './_actions-bar';
import { MinutesForm } from './_form';

export const metadata = { title: 'Minutes' };

export default async function MinutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const meeting = await safeBuildtimeQuery(() => getMeetingById(id), null);
  if (!meeting) notFound();

  const tenantId = await safeBuildtimeQuery(() => getCurrentTenantId(), FALLBACK_TENANT.id);
  const minutes = await safeBuildtimeQuery(
    () =>
      db
        .select()
        .from(meetingMinutes)
        .where(
          and(
            eq(meetingMinutes.tenantId, tenantId),
            eq(meetingMinutes.meetingId, id),
            isNull(meetingMinutes.deletedAt),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
    null,
  );

  if (!minutes) {
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
          <span className="text-ink">Minutes</span>
        </nav>

        <AdminPageHeader title="Minutes" />

        <Card className="max-w-xl">
          <CardEyebrow>No minutes yet</CardEyebrow>
          <CardTitle>This meeting doesn&apos;t have minutes yet.</CardTitle>
          <CardDescription>
            Approve the transcript first, then click{' '}
            <span className="text-ink font-medium">Generate minutes</span> on the transcript review
            page to draft them via gpt-4o.
          </CardDescription>
          <CardFooter>
            <Button asChild variant="outline" className="font-medium">
              <Link href={`/admin/meetings/${meeting.id}/transcript`}>
                Open transcript review
                <ChevronRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const members = await safeBuildtimeQuery(() => getActiveMembers(), []);

  // Resolve linked news post slug if published.
  let publishedNewsPostSlug: string | null = null;
  if (minutes.publishedNewsPostId) {
    const publishedNewsPostId = minutes.publishedNewsPostId;
    publishedNewsPostSlug = await safeBuildtimeQuery(
      () =>
        db
          .select({ slug: newsPosts.slug })
          .from(newsPosts)
          .where(eq(newsPosts.id, publishedNewsPostId))
          .limit(1)
          .then((rows) => rows[0]?.slug ?? null),
      null,
    );
  }

  const canEdit =
    ctx.profile.role === 'secretary' &&
    (minutes.status === 'draft' || minutes.status === 'awaiting_attestation');

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
        <span className="text-ink">Minutes</span>
      </nav>

      <AdminPageHeader
        title="Minutes"
        accessory={
          <span className="text-ink-faint font-mono text-[11px] tracking-wide">
            {format(meeting.scheduledAt, 'MMM d, yyyy')} · {meeting.title}
          </span>
        }
      />

      <div className="mb-6">
        <MinutesActionsBar
          minutesId={minutes.id}
          meetingId={meeting.id}
          status={minutes.status as MinutesStatusValue}
          publishedNewsPostSlug={publishedNewsPostSlug}
          userRole={ctx.profile.role}
        />
      </div>

      <MinutesForm
        minutesId={minutes.id}
        meetingId={meeting.id}
        canEdit={canEdit}
        members={members.map((m) => ({
          id: m.id,
          honorific: m.honorific,
          fullName: m.fullName,
        }))}
        initialValues={{
          coverHeader: minutes.coverHeader,
          attendeesText: minutes.attendeesText,
          itemsOfBusiness: (minutes.itemsOfBusiness as MinutesItemOfBusiness[]).map((it) => ({
            id: it.id,
            topic: it.topic,
            motionText: it.motionText,
            motionedByName: it.motionedByName,
            motionedById: it.motionedById,
            secondedByName: it.secondedByName,
            secondedById: it.secondedById,
            discussionSummary: it.discussionSummary,
            disposition: it.disposition,
            voteSummary: it.voteSummary,
          })),
          adjournmentSummary: minutes.adjournmentSummary,
        }}
      />
    </div>
  );
}
