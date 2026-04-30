'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Edit3, Power, PowerOff, X } from 'lucide-react';

import { archiveMember, deactivateMember, reactivateMember } from '@/app/_actions/members';
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
import type { Profile } from '@/lib/db/schema';

type Props = {
  memberId: string;
  active: boolean;
  userRole: Profile['role'];
};

const AUTHOR_ROLES: Profile['role'][] = ['secretary', 'vice_mayor'];

export function MemberActionsBar({ memberId, active, userRole }: Props) {
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

  const isAuthor = AUTHOR_ROLES.includes(userRole);
  const isSecretary = userRole === 'secretary';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" asChild className="font-medium">
          <Link href={`/admin/members/${memberId}/edit`} aria-label="Edit member">
            <Edit3 />
            Edit
          </Link>
        </Button>

        {isAuthor && active && (
          <DeactivateDialog memberId={memberId} disabled={isPending} onResult={run} />
        )}

        {isAuthor && !active && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(reactivateMember({ memberId }))}
            className="font-medium"
          >
            <Power />
            Reactivate
          </Button>
        )}

        {isSecretary && <ArchiveDialog memberId={memberId} disabled={isPending} onResult={run} />}
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
  memberId: string;
  disabled: boolean;
  onResult: <T>(
    p: Promise<{ ok: true; data: T } | { ok: false; error: string; code: string }>,
  ) => void;
};

function DeactivateDialog({ memberId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="font-medium">
          <PowerOff />
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate this member?</AlertDialogTitle>
          <AlertDialogDescription>
            Inactive members are hidden from the public directory and the active filter, but stay on
            file for the audit trail and history. You can reactivate later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. End of term — June 30, 2028"
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(deactivateMember({ memberId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
          >
            <PowerOff />
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchiveDialog({ memberId, disabled, onResult }: DialogProps) {
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
          <AlertDialogTitle>Archive this member?</AlertDialogTitle>
          <AlertDialogDescription>
            Archiving hides the member from all list views and queries but preserves the row in the
            audit trail. Only the Secretary can archive. This cannot be undone from the UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason for archival" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Filed in error; duplicate of another member"
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(archiveMember({ memberId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
            className="bg-warn text-paper hover:bg-warn/85"
          >
            <X />
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
