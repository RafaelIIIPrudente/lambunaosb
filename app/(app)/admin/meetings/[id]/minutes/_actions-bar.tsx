'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ExternalLink,
  Printer,
  Send,
  Stamp,
  Undo2,
} from 'lucide-react';

import {
  archiveMinutes,
  attestMinutes,
  markMinutesReadyForAttestation,
  publishMinutes,
  unpublishMinutes,
} from '@/app/_actions/minutes';
import { Button } from '@/components/ui/button';
import { Field, FieldTextarea } from '@/components/ui/field';
import { type MinutesStatusValue, MINUTES_STATUS_LABELS } from '@/lib/validators/minutes';

type Props = {
  minutesId: string;
  meetingId: string;
  status: MinutesStatusValue;
  publishedNewsPostSlug: string | null;
  userRole: string;
};

const SECRETARY: ReadonlyArray<string> = ['secretary'];
const ATTEST_ROLES: ReadonlyArray<string> = ['vice_mayor', 'mayor'];

export function MinutesActionsBar({
  minutesId,
  meetingId,
  status,
  publishedNewsPostSlug,
  userRole,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<'unpublish' | 'archive' | null>(null);
  const [reason, setReason] = useState('');

  const canSecretary = SECRETARY.includes(userRole);
  const canAttest = ATTEST_ROLES.includes(userRole);

  function closeDialog() {
    setOpenDialog(null);
    setReason('');
    setError(null);
  }

  function handleMarkReady() {
    setError(null);
    startTransition(async () => {
      const result = await markMinutesReadyForAttestation({ minutesId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleAttest() {
    setError(null);
    startTransition(async () => {
      const result = await attestMinutes({ minutesId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishMinutes({ minutesId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishMinutes({ minutesId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveMinutes({ minutesId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.push(`/admin/meetings/${meetingId}`);
      router.refresh();
    });
  }

  return (
    <div className="border-ink/15 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              status === 'published'
                ? 'bg-success/10 text-success rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase'
                : status === 'attested'
                  ? 'bg-rust/10 text-rust rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase'
                  : status === 'awaiting_attestation'
                    ? 'bg-warn/10 text-warn rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase'
                    : status === 'archived'
                      ? 'bg-ink/10 text-ink-soft rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase'
                      : 'bg-paper-2 text-ink-soft rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide uppercase'
            }
          >
            {MINUTES_STATUS_LABELS[status]}
          </span>
          {isPending && (
            <span className="text-ink-faint font-mono text-[11px] italic">Working…</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print is always available — opens in a new tab without admin
              chrome since /print/* lives outside the (app) layout group. */}
          <Button asChild variant="outline" size="sm" className="font-medium">
            <Link href={`/print/meetings/${meetingId}/minutes`} target="_blank" rel="noopener">
              <Printer />
              Print / PDF
            </Link>
          </Button>

          {canSecretary && status === 'draft' && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleMarkReady}
              className="font-medium"
            >
              <Send />
              Mark ready for attestation
            </Button>
          )}

          {canAttest && status === 'awaiting_attestation' && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleAttest}
              className="font-medium"
            >
              <Stamp />
              Attest
            </Button>
          )}

          {canSecretary && status === 'attested' && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handlePublish}
              className="font-medium"
            >
              <CheckCircle2 />
              Publish minutes
            </Button>
          )}

          {status === 'published' && publishedNewsPostSlug && (
            <Button asChild variant="outline" size="sm" className="font-medium">
              <Link href={`/news/${publishedNewsPostSlug}`} target="_blank" rel="noopener">
                <ExternalLink />
                View public post
              </Link>
            </Button>
          )}

          {canSecretary && status === 'published' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpenDialog('unpublish')}
              className="font-medium"
            >
              <Undo2 />
              Unpublish
            </Button>
          )}

          {canSecretary && status !== 'archived' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setOpenDialog('archive')}
              className="text-warn hover:text-warn font-medium"
            >
              <Archive />
              Archive
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}

      {openDialog === 'unpublish' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unpublish-dialog-title"
          className="border-warn/40 bg-warn/5 flex flex-col gap-3 rounded-md border p-4"
        >
          <p
            id="unpublish-dialog-title"
            className="text-warn inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            Unpublish minutes
          </p>
          <p className="text-ink-soft text-sm">
            Archives the linked public news post and reverts the meeting to{' '}
            <span className="text-ink font-medium">Transcript approved</span>. The minutes row stays
            in <span className="text-ink font-medium">Attested</span> for re-publish.
          </p>
          <Field label="Reason (5–500 chars)" required>
            <FieldTextarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Correction needed in the vote tally for Item 3."
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending || reason.trim().length < 5}
              onClick={handleUnpublish}
              className="font-medium"
            >
              {isPending ? 'Unpublishing…' : 'Confirm unpublish'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={closeDialog}
              className="font-medium"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {openDialog === 'archive' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
          className="border-warn/60 bg-warn/10 flex flex-col gap-3 rounded-md border p-4"
        >
          <p
            id="archive-dialog-title"
            className="text-warn inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            Archive minutes
          </p>
          <p className="text-ink-soft text-sm">
            Soft-deletes the minutes row and reverts the meeting to{' '}
            <span className="text-ink font-medium">Transcript approved</span> so a fresh draft can
            be regenerated. Audit trail preserved.
          </p>
          <Field label="Reason (5–500 chars)" required>
            <FieldTextarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. gpt-4o output had material errors; regenerating from scratch."
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending || reason.trim().length < 5}
              onClick={handleArchive}
              className="bg-warn hover:bg-warn/90 font-medium"
            >
              <Archive />
              {isPending ? 'Archiving…' : 'Confirm archive'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={closeDialog}
              className="font-medium"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
