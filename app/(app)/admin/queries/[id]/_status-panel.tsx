'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';

import { updateCitizenQueryStatus } from '@/app/_actions/citizen-queries';
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
import { cn } from '@/lib/utils';
import {
  CITIZEN_QUERY_STATUS_LABELS,
  type UpdateCitizenQueryStatusInput,
} from '@/lib/validators/citizen-query-admin';

type Status = UpdateCitizenQueryStatusInput['status'];

type Props = {
  queryId: string;
  currentStatus: Status;
  canArchive: boolean;
};

const SAFE_STATUSES: Status[] = ['new', 'in_progress', 'awaiting_citizen', 'answered'];
const STATUS_DOT: Record<Status, string> = {
  new: 'bg-rust',
  in_progress: 'bg-gold',
  awaiting_citizen: 'bg-ink-ghost',
  answered: 'bg-success',
  closed: 'bg-ink-ghost',
  spam: 'bg-destructive',
};

export function StatusPanel({ queryId, currentStatus, canArchive }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: Status) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCitizenQueryStatus({ queryId, status: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="border-ink/15 rounded-md border p-5">
      <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        Status
      </p>
      <ul className="flex flex-col gap-0.5 text-sm">
        {SAFE_STATUSES.map((s) => {
          const active = currentStatus === s;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={isPending || active}
                onClick={() => setStatus(s)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'hover:bg-paper-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed',
                  active ? 'bg-rust/10 text-rust' : 'text-ink-soft hover:text-ink',
                )}
              >
                <span aria-hidden="true" className={cn('size-2 rounded-full', STATUS_DOT[s])} />
                <span className="font-script text-base">{CITIZEN_QUERY_STATUS_LABELS[s]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {canArchive && (
        <div className="border-ink/15 mt-3 flex flex-col gap-1.5 border-t border-dashed pt-3">
          <CloseDialog
            queryId={queryId}
            currentStatus={currentStatus}
            disabled={isPending}
            onResult={(p) =>
              startTransition(async () => {
                const result = await p;
                if (!result.ok) setError(result.error);
                else router.refresh();
              })
            }
          />
          <SpamDialog
            queryId={queryId}
            currentStatus={currentStatus}
            disabled={isPending}
            onResult={(p) =>
              startTransition(async () => {
                const result = await p;
                if (!result.ok) setError(result.error);
                else router.refresh();
              })
            }
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-warn mt-3 text-xs font-medium">
          {error}
        </p>
      )}
    </section>
  );
}

type DialogProps = {
  queryId: string;
  currentStatus: Status;
  disabled: boolean;
  onResult: (
    p: Promise<{ ok: true; data: void } | { ok: false; error: string; code: string }>,
  ) => void;
};

function CloseDialog({ queryId, currentStatus, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  if (currentStatus === 'closed') return null;
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-ink-soft hover:text-ink justify-start font-medium"
        >
          <X />
          Close query
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this query?</AlertDialogTitle>
          <AlertDialogDescription>
            Closing locks the conversation — you won&apos;t be able to send further replies until
            the status is changed back. Use this when the matter is resolved or no further response
            is needed. Only the Secretary can close.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(updateCitizenQueryStatus({ queryId, status: 'closed' }));
              setOpen(false);
            }}
          >
            <X />
            Close query
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SpamDialog({ queryId, currentStatus, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  if (currentStatus === 'spam') return null;
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-warn hover:bg-warn/10 hover:text-warn justify-start font-medium"
        >
          <AlertTriangle />
          Mark as spam
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this query as spam?</AlertDialogTitle>
          <AlertDialogDescription>
            Spam queries are hidden from the default inbox view and locked against replies. This
            writes a high-priority audit row. Only the Secretary can mark spam. The submitter will
            not be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(updateCitizenQueryStatus({ queryId, status: 'spam' }));
              setOpen(false);
            }}
            className="bg-warn text-paper hover:bg-warn/85"
          >
            <AlertTriangle />
            Mark as spam
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
