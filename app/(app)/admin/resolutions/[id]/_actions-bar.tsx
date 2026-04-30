'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowRight, CheckCircle2, FileUp, Send, Upload, Vote, X } from 'lucide-react';

import {
  advanceToSecondReading,
  approveResolution,
  fileResolution,
  publishResolution,
  softDeleteResolution,
  withdrawResolution,
} from '@/app/_actions/resolutions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldTextarea } from '@/components/ui/field';
import type { ResolutionStatus } from '@/lib/db/queries/resolutions';
import type { Profile } from '@/lib/db/schema';

type Props = {
  resolutionId: string;
  status: ResolutionStatus;
  userRole: Profile['role'];
};

const PUBLISH_ROLES: Profile['role'][] = ['secretary', 'mayor'];

export function ResolutionActionsBar({ resolutionId, status, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(
    actionPromise: Promise<{ ok: true; data: T } | { ok: false; error: string; code: string }>,
  ) {
    startTransition(async () => {
      const result = await actionPromise;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  const isWithdrawn = status === 'withdrawn';
  const showFile = status === 'draft';
  const showAdvance = status === 'pending';
  const showApprove = status === 'pending';
  const showPublish = status === 'approved' && PUBLISH_ROLES.includes(userRole);
  const showWithdraw = !isWithdrawn;
  const showSoftDelete = userRole === 'secretary' && !isWithdrawn;

  if (isWithdrawn) {
    return (
      <div className="text-ink-faint font-mono text-xs italic">
        This resolution has been withdrawn. No further actions available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {showFile && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(fileResolution({ resolutionId }))}
            className="font-medium"
          >
            <Send />
            File for first reading
          </Button>
        )}

        {showAdvance && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(advanceToSecondReading({ resolutionId }))}
            className="font-medium"
          >
            <ArrowRight />
            Advance to second reading
          </Button>
        )}

        {showApprove && (
          <ApproveDialog resolutionId={resolutionId} disabled={isPending} onResult={run} />
        )}

        {showPublish && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(publishResolution({ resolutionId }))}
            className="font-medium"
          >
            <Upload />
            Publish
          </Button>
        )}

        {showWithdraw && (
          <WithdrawDialog resolutionId={resolutionId} disabled={isPending} onResult={run} />
        )}

        {showSoftDelete && (
          <SoftDeleteDialog resolutionId={resolutionId} disabled={isPending} onResult={run} />
        )}
      </div>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

type DialogProps = {
  resolutionId: string;
  disabled: boolean;
  onResult: <T>(
    p: Promise<{ ok: true; data: T } | { ok: false; error: string; code: string }>,
  ) => void;
};

function ApproveDialog({ resolutionId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [voteSummary, setVoteSummary] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={disabled} className="font-medium">
          <CheckCircle2 />
          Mark approved
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark resolution approved</AlertDialogTitle>
          <AlertDialogDescription>
            Record the vote tally as it was read in session. This snapshot is preserved in the audit
            trail and the version history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Vote summary" required hint="e.g. 12 – 1 – 1 (Yea–Nay–Abstain)">
          <FieldTextarea
            value={voteSummary}
            onChange={(e) => setVoteSummary(e.target.value)}
            placeholder="12 – 1 – 1 (Yea–Nay–Abstain)"
            rows={2}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(approveResolution({ resolutionId, voteSummary }));
              setOpen(false);
            }}
            disabled={voteSummary.trim().length < 3}
          >
            <Vote />
            Mark approved
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WithdrawDialog({ resolutionId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="font-medium">
          <X />
          Withdraw
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this resolution?</AlertDialogTitle>
          <AlertDialogDescription>
            Withdrawal is final. The resolution stays on file for the audit trail but is no longer
            available for advancement, approval, or publication.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason for withdrawal" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Sponsor request; superseded by RES-2026-018"
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(withdrawResolution({ resolutionId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
            className="bg-warn text-paper hover:bg-warn/85"
          >
            <X />
            Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SoftDeleteDialog({ resolutionId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          className="text-warn hover:bg-warn/10 hover:text-warn font-medium"
        >
          <Archive />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this resolution?</AlertDialogTitle>
          <AlertDialogDescription>
            Archiving hides the resolution from list views but preserves it in the audit trail and
            version history. Only the Secretary can archive. This cannot be undone from the UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason for archival" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Filed in error; duplicate of RES-2026-014"
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(softDeleteResolution({ resolutionId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
            className="bg-warn text-paper hover:bg-warn/85"
          >
            <FileUp className="rotate-180" />
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
