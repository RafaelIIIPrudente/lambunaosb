import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronRight, FileText, Lock } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/require-user';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getMeetingById } from '@/lib/db/queries/meetings';
import { getActiveMembers } from '@/lib/db/queries/members';
import { computeTranscriptStats, getTranscriptByMeetingId } from '@/lib/db/queries/transcripts';

import { TranscriptReview } from './_review';

export const metadata = { title: 'Transcript review' };

// Generate-minutes server action awaits gpt-4o for ~30-90s. Override the
// platform default (10s on Vercel hobby, 60s on Pro server actions).
export const maxDuration = 300;

const APPROVE_ROLES: ReadonlyArray<string> = ['secretary', 'vice_mayor'];
const EDIT_ROLES: ReadonlyArray<string> = [
  'secretary',
  'vice_mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
];

function formatDuration(ms: number | null): string | null {
  if (ms === null || ms === 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export default async function TranscriptReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireUser();
  const meeting = await safeBuildtimeQuery(() => getMeetingById(id), null);
  if (!meeting) notFound();

  const transcriptData = await safeBuildtimeQuery(() => getTranscriptByMeetingId(id), null);

  // No transcript yet → soft placeholder + back link.
  if (!transcriptData) {
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
          <span className="text-ink">Transcript</span>
        </nav>

        <AdminPageHeader title="Transcript review" />

        <Card className="max-w-xl">
          <CardEyebrow>No transcript yet</CardEyebrow>
          <CardTitle>This meeting hasn&apos;t been transcribed yet.</CardTitle>
          <CardDescription>
            Once the meeting status reaches{' '}
            <span className="text-ink font-medium">Awaiting transcript</span>, click{' '}
            <span className="text-ink font-medium">Start transcription</span> on the meeting page to
            run Whisper.
          </CardDescription>
          <CardFooter>
            <Button asChild variant="outline" className="font-medium">
              <Link href={`/admin/meetings/${meeting.id}`}>
                <ChevronRight />
                Back to meeting
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const stats = computeTranscriptStats(transcriptData);
  const members = await safeBuildtimeQuery(() => getActiveMembers(), []);

  // Once minutes are published the transcript is the historical source-of-truth
  // backing them — editing it post-publication would silently desync the two.
  // Force read-only regardless of role.
  const isMinutesPublished = meeting.status === 'minutes_published';
  const canEdit = !isMinutesPublished && EDIT_ROLES.includes(ctx.profile.role);
  const canApprove = !isMinutesPublished && APPROVE_ROLES.includes(ctx.profile.role);

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
        <span className="text-ink">Transcript</span>
      </nav>

      <AdminPageHeader
        title="Transcript review"
        accessory={
          <span className="text-ink-faint font-mono text-[11px] tracking-wide">
            {format(meeting.scheduledAt, 'MMM d, yyyy')} · {meeting.title}
          </span>
        }
      />

      {/* Stats strip */}
      <dl className="border-ink/15 mb-6 grid grid-cols-2 gap-4 rounded-md border p-4 sm:grid-cols-4">
        <div>
          <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">Duration</dt>
          <dd className="text-ink mt-1 font-mono text-base tabular-nums">
            {formatDuration(stats.totalDurationMs) ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">Segments</dt>
          <dd className="text-ink mt-1 font-mono text-base tabular-nums">{stats.segmentCount}</dd>
        </div>
        <div>
          <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
            Unassigned speakers
          </dt>
          <dd
            className={
              stats.unassignedCount > 0
                ? 'text-warn mt-1 font-mono text-base tabular-nums'
                : 'text-ink mt-1 font-mono text-base tabular-nums'
            }
          >
            {stats.unassignedCount}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
            ASR + cleanup cost
          </dt>
          <dd className="text-ink mt-1 font-mono text-base tabular-nums">
            {formatCost(stats.totalCostUsd)}
          </dd>
        </div>
      </dl>

      {isMinutesPublished && (
        <div className="border-success/40 bg-success/5 mb-6 rounded-md border p-4">
          <p className="text-success flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            <Lock className="size-3" aria-hidden="true" />
            Read-only · minutes published
          </p>
          <p className="text-ink mt-2 text-sm">
            This transcript is the historical record backing the published minutes. Edits are
            disabled to keep the two in sync.
          </p>
        </div>
      )}

      {transcriptData.transcript.status === 'asr_failed' && (
        <div className="border-warn/40 bg-warn/5 mb-6 rounded-md border p-4">
          <p className="text-warn font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            ASR failed
          </p>
          <p className="text-ink mt-2 text-sm">
            The transcription job failed. See the audit log entry for details, or click{' '}
            <span className="text-ink font-medium">Start transcription</span> on the meeting page to
            retry.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3 font-medium">
            <Link href={`/admin/meetings/${meeting.id}`}>
              <FileText />
              Back to meeting
            </Link>
          </Button>
        </div>
      )}

      <TranscriptReview
        transcriptId={transcriptData.transcript.id}
        meetingId={meeting.id}
        status={transcriptData.transcript.status}
        segments={transcriptData.segments}
        members={members.map((m) => ({
          id: m.id,
          honorific: m.honorific,
          fullName: m.fullName,
        }))}
        primaryLocale={meeting.primaryLocale as 'en' | 'tl' | 'hil'}
        canEdit={canEdit}
        canApprove={canApprove}
      />
    </div>
  );
}
