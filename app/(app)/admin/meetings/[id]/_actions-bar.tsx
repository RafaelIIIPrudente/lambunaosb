'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Edit3, FileText, Mic, Square, Trash2, X } from 'lucide-react';

import {
  cancelMeeting,
  deleteMeeting,
  startMeeting,
  startTranscription,
  stopMeeting,
} from '@/app/_actions/meetings';
import { Button } from '@/components/ui/button';
import { Field, FieldSelect, FieldTextarea } from '@/components/ui/field';
import { MEETING_LOCALES } from '@/lib/validators/meeting';
import type { MeetingStatus } from '@/lib/db/queries/meetings';

const LOCALE_LABELS: Record<(typeof MEETING_LOCALES)[number], string> = {
  hil: 'Hiligaynon',
  en: 'English',
  tl: 'Tagalog',
};

type Props = {
  meetingId: string;
  status: MeetingStatus;
  primaryLocale: 'en' | 'tl' | 'hil';
  userRole: string;
};

const WRITE_ROLES: ReadonlyArray<string> = ['secretary', 'mayor', 'vice_mayor'];

export function MeetingActionsBar({ meetingId, status, primaryLocale, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<'start' | 'cancel' | 'delete' | null>(null);
  const [reason, setReason] = useState('');
  const [startLocale, setStartLocale] = useState<(typeof MEETING_LOCALES)[number]>(primaryLocale);

  const canWrite = WRITE_ROLES.includes(userRole);
  const canDelete = userRole === 'secretary';

  if (!canWrite) {
    return (
      <p className="text-ink-faint font-mono text-[11px] italic">
        Read-only — only the Secretary, Mayor, or Vice Mayor can act on meetings.
      </p>
    );
  }

  function closeDialog() {
    setOpenDialog(null);
    setReason('');
    setError(null);
  }

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startMeeting({ meetingId, primaryLocale: startLocale });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  function handleStop() {
    setError(null);
    startTransition(async () => {
      const result = await stopMeeting({ meetingId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelMeeting({ meetingId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMeeting({ meetingId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.push('/admin/meetings');
      router.refresh();
    });
  }

  function handleStartTranscription() {
    setError(null);
    startTransition(async () => {
      const result = await startTranscription({ meetingId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'scheduled' && (
          <>
            <Button asChild variant="outline" size="sm" className="font-medium">
              <Link href={`/admin/meetings/${meetingId}/edit`}>
                <Edit3 />
                Edit
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={() => setOpenDialog('start')}
            >
              <Mic />
              Start meeting
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={() => setOpenDialog('cancel')}
            >
              <X />
              Cancel
            </Button>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-warn hover:text-warn font-medium"
                disabled={isPending}
                onClick={() => setOpenDialog('delete')}
              >
                <Trash2 />
                Delete
              </Button>
            )}
          </>
        )}

        {status === 'in_progress' && (
          <>
            <Button
              type="button"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={handleStop}
            >
              <Square />
              {isPending ? 'Stopping…' : 'Stop meeting'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={() => setOpenDialog('cancel')}
            >
              <X />
              Cancel session
            </Button>
          </>
        )}

        {status === 'awaiting_transcript' && (
          <Button
            type="button"
            size="sm"
            className="font-medium"
            disabled={isPending}
            onClick={handleStartTranscription}
          >
            <FileText />
            {isPending ? 'Transcribing… (may take 2–7 min)' : 'Start transcription'}
          </Button>
        )}

        {(status === 'transcript_in_review' || status === 'transcript_approved') && (
          <Button asChild variant="outline" size="sm" className="font-medium">
            <Link href={`/admin/meetings/${meetingId}/transcript`}>
              <FileText />
              Open transcript review
            </Link>
          </Button>
        )}

        {status === 'minutes_published' && (
          <span className="text-ink-soft font-mono text-[11px]">
            Minutes published — see linked news post.
          </span>
        )}

        {status === 'cancelled' && (
          <span className="text-ink-faint font-mono text-[11px] italic">
            This meeting was cancelled.
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}

      {/* Start dialog — locale picker */}
      {openDialog === 'start' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-dialog-title"
          className="border-rust/40 bg-paper-2/40 flex flex-col gap-3 rounded-md border p-4"
        >
          <p
            id="start-dialog-title"
            className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
          >
            Start meeting
          </p>
          <p className="text-ink-soft text-sm">
            Confirm the primary spoken language for this session. This drives Whisper&apos;s
            language hint when transcription runs later.
          </p>
          <Field label="Primary locale">
            <FieldSelect
              value={startLocale}
              onChange={(e) => setStartLocale(e.target.value as (typeof MEETING_LOCALES)[number])}
            >
              {MEETING_LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </FieldSelect>
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={handleStart}
            >
              <Mic />
              {isPending ? 'Starting…' : 'Mark started'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={closeDialog}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Cancel dialog — reason required */}
      {openDialog === 'cancel' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="border-warn/40 bg-warn/5 flex flex-col gap-3 rounded-md border p-4"
        >
          <p
            id="cancel-dialog-title"
            className="text-warn inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            Cancel meeting
          </p>
          <Field label="Reason (5–500 chars)" required>
            <FieldTextarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Quorum not met; rescheduled to next week."
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="font-medium"
              disabled={isPending || reason.trim().length < 5}
              onClick={handleCancel}
            >
              {isPending ? 'Cancelling…' : 'Confirm cancel'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={closeDialog}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Delete dialog — reason required, secretary only */}
      {openDialog === 'delete' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="border-warn/60 bg-warn/10 flex flex-col gap-3 rounded-md border p-4"
        >
          <p
            id="delete-dialog-title"
            className="text-warn inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            Delete meeting
          </p>
          <p className="text-ink-soft text-sm">
            Soft-deletes the row. Audit log keeps the record. Use{' '}
            <span className="text-ink font-medium">Cancel</span> instead if the meeting just
            didn&apos;t happen.
          </p>
          <Field label="Reason (5–500 chars)" required>
            <FieldTextarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Created in error; duplicates RGS-2026-12."
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-warn hover:bg-warn/90 font-medium"
              disabled={isPending || reason.trim().length < 5}
              onClick={handleDelete}
            >
              <Trash2 />
              {isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-medium"
              disabled={isPending}
              onClick={closeDialog}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
