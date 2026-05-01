import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronRight, FileText, Mic, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MeetingAudioUpload } from '@/components/app/meeting-audio-upload';
import { MeetingRecorder } from '@/components/app/meeting-recorder';
import { requireUser } from '@/lib/auth/require-user';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getMeetingById } from '@/lib/db/queries/meetings';
import { FALLBACK_TENANT, getCurrentTenantId } from '@/lib/db/queries/tenant';
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  type MeetingStatusValue,
} from '@/lib/validators/meeting';

import { MeetingActionsBar } from './_actions-bar';

export const metadata = { title: 'Meeting' };

// Sync transcription via startTranscription server action awaits the Whisper
// orchestrator (per-chunk + optional gpt-4o cleanup). Typical 2hr session =
// 14 chunks × ~10-30s each = 2-7 minutes. Override the platform default
// (10s on Vercel hobby, 60s on Pro) so the action survives long runs.
// Caps at 300s on Pro, 800s on Enterprise.
export const maxDuration = 300;

const STATUS_BADGE_VARIANT: Record<
  MeetingStatusValue,
  'success' | 'outline' | 'warn' | 'destructive' | 'new'
> = {
  scheduled: 'outline',
  in_progress: 'new',
  awaiting_transcript: 'outline',
  transcript_in_review: 'warn',
  transcript_approved: 'success',
  minutes_published: 'success',
  cancelled: 'destructive',
};

const LOCALE_LABELS: Record<string, string> = {
  hil: 'Hiligaynon',
  en: 'English',
  tl: 'Tagalog',
};

const TRANSCRIPT_STATUS_LABELS: Record<string, string> = {
  awaiting_asr: 'Pending',
  asr_failed: 'Failed',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const MINUTES_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  awaiting_attestation: 'Awaiting attestation',
  attested: 'Attested',
  published: 'Published',
  archived: 'Archived',
};

function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const [meeting, tenantId] = await Promise.all([
    safeBuildtimeQuery(() => getMeetingById(id), null),
    safeBuildtimeQuery(() => getCurrentTenantId(), FALLBACK_TENANT.id),
  ]);
  if (!meeting) notFound();

  const audioLength = formatDuration(meeting.audioDurationMs);
  const presiderLabel = meeting.presider
    ? `${meeting.presider.honorific} ${meeting.presider.fullName}`
    : '—';
  const writeRoles: ReadonlyArray<string> = ['secretary', 'mayor', 'vice_mayor'];
  const canRecord = writeRoles.includes(ctx.profile.role);

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-2 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/meetings" className="hover:text-rust">
          Meetings
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink line-clamp-1">{meeting.title}</span>
      </nav>

      <header className="mb-6">
        <p className="text-ink-soft mt-1 font-mono text-[11px] tracking-[0.18em] uppercase">
          № {meeting.sequenceNumber} · {format(meeting.scheduledAt, 'EEEE, MMM d, yyyy · h:mm a')} ·{' '}
          {meeting.location}
        </p>
        <h1 className="text-ink font-script mt-2 text-3xl leading-tight">{meeting.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[meeting.status]}>
            {MEETING_STATUS_LABELS[meeting.status]}
          </Badge>
          <Badge variant="outline">{MEETING_TYPE_LABELS[meeting.type]}</Badge>
          <Badge variant="outline">
            {LOCALE_LABELS[meeting.primaryLocale] ?? meeting.primaryLocale}
          </Badge>
          {meeting.cleanupEnabled && <Badge variant="outline">Hiligaynon cleanup on</Badge>}
        </div>
      </header>

      <div className="mb-6">
        <MeetingActionsBar
          meetingId={meeting.id}
          status={meeting.status}
          primaryLocale={meeting.primaryLocale as 'en' | 'tl' | 'hil'}
          userRole={ctx.profile.role}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          {/* State-driven primary action area */}
          {meeting.status === 'scheduled' && (
            <article className="border-ink/15 bg-paper-2/30 rounded-md border border-dashed p-6 text-center">
              <Mic className="text-ink-faint mx-auto size-8" aria-hidden="true" />
              <p className="text-ink font-script mt-3 text-2xl">Ready when you are.</p>
              <p className="text-ink-soft mt-2 text-sm italic">
                Click <span className="text-ink font-medium">Start meeting</span> above when the
                gavel falls. Audio recording, transcription, and minutes generation become available
                once the session begins.
              </p>
              <p className="text-ink-faint mt-4 font-mono text-[11px]">
                Recorder UI and file upload land in the next batch.
              </p>
            </article>
          )}

          {meeting.status === 'in_progress' && (
            <>
              <article className="border-rust/40 bg-rust/5 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="bg-rust inline-block size-2 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                  <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                    Session in progress
                  </p>
                  <span className="text-ink-soft ml-auto font-mono text-[11px]">
                    Started {meeting.startedAt ? format(meeting.startedAt, 'h:mm a') : '—'}
                  </span>
                </div>
              </article>

              {canRecord && <MeetingRecorder meetingId={meeting.id} tenantId={tenantId} />}

              {canRecord && (
                <MeetingAudioUpload
                  meetingId={meeting.id}
                  tenantId={tenantId}
                  meetingStatus={meeting.status}
                />
              )}

              {!canRecord && (
                <article className="border-ink/15 rounded-md border p-6">
                  <p className="text-ink-soft text-sm italic">
                    Read-only — only Secretary, Mayor, or Vice Mayor can record or upload audio.
                  </p>
                </article>
              )}
            </>
          )}

          {meeting.status === 'awaiting_transcript' && (
            <>
              <article className="border-ink/15 rounded-md border p-6">
                <Upload className="text-ink-faint size-6" aria-hidden="true" />
                <p className="text-ink font-script mt-3 text-2xl">Awaiting transcription</p>
                <p className="text-ink-soft mt-2 text-sm italic">
                  Meeting ended at{' '}
                  {meeting.endedAt ? format(meeting.endedAt, 'h:mm a, MMM d') : '—'}.{' '}
                  {meeting.audioDurationMs
                    ? `${formatDuration(meeting.audioDurationMs)} of audio captured.`
                    : 'No audio uploaded yet — drop a recording below.'}{' '}
                  Transcription pipeline lands in Step 9.
                </p>
              </article>

              {canRecord && !meeting.audioDurationMs && (
                <MeetingAudioUpload
                  meetingId={meeting.id}
                  tenantId={tenantId}
                  meetingStatus={meeting.status}
                />
              )}
            </>
          )}

          {(meeting.status === 'transcript_in_review' ||
            meeting.status === 'transcript_approved') && (
            <article className="border-ink/15 rounded-md border p-6">
              <FileText className="text-ink-faint size-6" aria-hidden="true" />
              <p className="text-ink font-script mt-3 text-2xl">Transcript ready</p>
              <p className="text-ink-soft mt-2 text-sm italic">
                Open the transcript review to assign speakers and correct mistranscriptions before
                generating minutes.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 font-medium">
                <Link href={`/admin/meetings/${meeting.id}/transcript`}>
                  <FileText />
                  Open transcript review
                </Link>
              </Button>
            </article>
          )}

          {meeting.status === 'minutes_published' && (
            <article className="border-success/40 bg-success/5 rounded-md border p-6">
              <FileText className="text-success size-6" aria-hidden="true" />
              <p className="text-ink font-script mt-3 text-2xl">Minutes published</p>
              <p className="text-ink-soft mt-2 text-sm italic">
                The official minutes have been attested and published. Linked news post is
                public-facing.
              </p>
              {meeting.transcriptStatus && (
                <Button asChild variant="outline" size="sm" className="mt-4 font-medium">
                  <Link href={`/admin/meetings/${meeting.id}/transcript`}>
                    <FileText />
                    View transcript
                  </Link>
                </Button>
              )}
            </article>
          )}

          {meeting.status === 'cancelled' && (
            <article className="border-warn/40 bg-warn/5 rounded-md border p-6">
              <p className="text-warn font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Cancelled
              </p>
              <p className="text-ink font-script mt-2 text-2xl">This session did not happen.</p>
              <p className="text-ink-soft mt-2 text-sm italic">
                Check the audit log for the cancellation reason.
              </p>
            </article>
          )}

          {/* Agenda */}
          <article className="border-ink/15 rounded-md border p-6">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Agenda
            </p>
            {meeting.agenda.length === 0 ? (
              <p className="text-ink-faint font-mono text-xs italic">
                No agenda items. Edit the meeting to add them.
              </p>
            ) : (
              <ol className="text-ink flex flex-col gap-2 text-sm">
                {meeting.agenda.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-3">
                    <span className="text-ink-faint font-mono text-[11px] tabular-nums">
                      {String(item.order).padStart(2, '0')}.
                    </span>
                    <span className="font-script text-base">{item.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata
            </p>
            <dl className="text-ink-soft grid grid-cols-[110px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Type</dt>
              <dd>{MEETING_TYPE_LABELS[meeting.type]}</dd>
              <dt className="text-ink-faint">Sequence №</dt>
              <dd className="font-mono">{meeting.sequenceNumber}</dd>
              <dt className="text-ink-faint">Scheduled</dt>
              <dd className="font-mono">{format(meeting.scheduledAt, 'MMM d, yyyy · h:mm a')}</dd>
              {meeting.startedAt && (
                <>
                  <dt className="text-ink-faint">Started</dt>
                  <dd className="font-mono">{format(meeting.startedAt, 'MMM d, yyyy · h:mm a')}</dd>
                </>
              )}
              {meeting.endedAt && (
                <>
                  <dt className="text-ink-faint">Ended</dt>
                  <dd className="font-mono">{format(meeting.endedAt, 'MMM d, yyyy · h:mm a')}</dd>
                </>
              )}
              <dt className="text-ink-faint">Location</dt>
              <dd>{meeting.location}</dd>
              <dt className="text-ink-faint">Presider</dt>
              <dd>{presiderLabel}</dd>
              <dt className="text-ink-faint">Locale</dt>
              <dd>{LOCALE_LABELS[meeting.primaryLocale] ?? meeting.primaryLocale}</dd>
              {audioLength && (
                <>
                  <dt className="text-ink-faint">Audio</dt>
                  <dd className="font-mono">{audioLength}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Pipeline
            </p>
            <dl className="text-ink-soft grid grid-cols-[110px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Transcript</dt>
              <dd>
                {meeting.transcriptStatus
                  ? (TRANSCRIPT_STATUS_LABELS[meeting.transcriptStatus] ?? meeting.transcriptStatus)
                  : '—'}
              </dd>
              <dt className="text-ink-faint">Minutes</dt>
              <dd>
                {meeting.minutesStatus
                  ? (MINUTES_STATUS_LABELS[meeting.minutesStatus] ?? meeting.minutesStatus)
                  : '—'}
              </dd>
              <dt className="text-ink-faint">HIL cleanup</dt>
              <dd>{meeting.cleanupEnabled ? 'On' : 'Off'}</dd>
            </dl>
          </section>

          {meeting.minutesId && (
            <section className="border-ink/15 rounded-md border p-5">
              <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Minutes
              </p>
              <p className="text-ink-soft text-xs italic">
                {meeting.minutesStatus === 'published'
                  ? 'Official minutes published. Linked news post is public-facing.'
                  : meeting.minutesStatus === 'attested'
                    ? 'Attested by the presiding officer. Ready for the Secretary to publish.'
                    : meeting.minutesStatus === 'awaiting_attestation'
                      ? 'Submitted by the Secretary. Awaiting presiding officer.'
                      : meeting.minutesStatus === 'archived'
                        ? 'Archived. The transcript can be re-used to draft fresh minutes.'
                        : 'Drafted by gpt-4o. Edit, then submit for attestation.'}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 font-medium">
                <Link href={`/admin/meetings/${meeting.id}/minutes`}>Open minutes</Link>
              </Button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
