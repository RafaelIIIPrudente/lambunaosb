'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, MailIcon, Pencil, Trash2, Undo2 } from 'lucide-react';

import { deactivateUser, reactivateUser, resendInvite, updateUserRole } from '@/app/_actions/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from '@/lib/validators/user';

type Props = {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
  hasSignedIn: boolean;
};

type ActionState = 'idle' | 'change_role' | 'deactivate' | 'reactivate' | 'resend';

export function UserRowActions({ userId, fullName, email, role, active, hasSignedIn }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<ActionState>('idle');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!isPending) {
      setOpen('idle');
      setError(null);
    }
  }

  function runAction(promise: Promise<{ ok: true } | { ok: false; error: string; code: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await promise;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen('idle');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Change role for ${fullName}`}
        onClick={() => setOpen('change_role')}
        disabled={isPending}
      >
        <Pencil />
      </Button>

      {!active && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Reactivate ${fullName}`}
          onClick={() => setOpen('reactivate')}
          disabled={isPending}
        >
          <Undo2 />
        </Button>
      )}

      {active && !hasSignedIn && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Resend invite to ${fullName}`}
          onClick={() => setOpen('resend')}
          disabled={isPending}
        >
          <MailIcon />
        </Button>
      )}

      {active && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Deactivate ${fullName}`}
          onClick={() => setOpen('deactivate')}
          disabled={isPending}
          className="text-warn hover:bg-warn/10 hover:text-warn"
        >
          <Trash2 />
        </Button>
      )}

      <ChangeRoleDialog
        open={open === 'change_role'}
        onClose={close}
        currentRole={role}
        fullName={fullName}
        isPending={isPending}
        error={error}
        onConfirm={(nextRole) => runAction(updateUserRole({ userId, role: nextRole }))}
      />

      <ReactivateDialog
        open={open === 'reactivate'}
        onClose={close}
        fullName={fullName}
        isPending={isPending}
        error={error}
        onConfirm={() => runAction(reactivateUser({ userId }))}
      />

      <ResendDialog
        open={open === 'resend'}
        onClose={close}
        email={email}
        isPending={isPending}
        error={error}
        onConfirm={() => runAction(resendInvite({ userId }))}
      />

      <DeactivateDialog
        open={open === 'deactivate'}
        onClose={close}
        email={email}
        fullName={fullName}
        isPending={isPending}
        error={error}
        onConfirm={() => runAction(deactivateUser({ userId }))}
      />
    </div>
  );
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
};

function ChangeRoleDialog({
  open,
  onClose,
  currentRole,
  fullName,
  isPending,
  error,
  onConfirm,
}: DialogProps & {
  currentRole: UserRole;
  fullName: string;
  onConfirm: (next: UserRole) => void;
}) {
  const [next, setNext] = useState<UserRole>(currentRole);
  const dirty = next !== currentRole;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setNext(currentRole);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change role for {fullName}</AlertDialogTitle>
          <AlertDialogDescription>
            This is an alert-audited action. Demoting the only Secretary is blocked at the action
            layer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Current role">
            <FieldInput value={USER_ROLE_LABELS[currentRole]} disabled readOnly />
          </Field>
          <Field label="New role" required>
            <FieldSelect
              value={next}
              onChange={(e) => setNext(e.target.value as UserRole)}
              disabled={isPending}
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {USER_ROLE_LABELS[r]}
                </option>
              ))}
            </FieldSelect>
            {next && (
              <p className="text-ink-faint mt-1.5 text-xs italic">{USER_ROLE_DESCRIPTIONS[next]}</p>
            )}
          </Field>
          {error && (
            <p role="alert" className="text-warn text-sm font-medium">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending || !dirty}
              onClick={(e) => {
                e.preventDefault();
                onConfirm(next);
              }}
              className="font-medium"
            >
              {isPending ? 'Updating…' : 'Change role'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReactivateDialog({
  open,
  onClose,
  fullName,
  isPending,
  error,
  onConfirm,
}: DialogProps & { fullName: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivate {fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The user regains access at their previous role. Their auth account was never deleted, so
            they can sign in immediately. This action is alert-audited.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-warn text-sm font-medium">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              className="font-medium"
            >
              {isPending ? 'Reactivating…' : 'Reactivate user'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ResendDialog({
  open,
  onClose,
  email,
  isPending,
  error,
  onConfirm,
}: DialogProps & { email: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resend invite to {email}?</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ll fire a new magic-link invitation. The previous link is invalidated. Invites
            expire after 72 hours per Supabase defaults. This action is alert-audited.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-warn text-sm font-medium">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              className="font-medium"
            >
              {isPending ? 'Sending…' : 'Resend invite'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeactivateDialog({
  open,
  onClose,
  email,
  fullName,
  isPending,
  error,
  onConfirm,
}: DialogProps & { email: string; fullName: string; onConfirm: () => void }) {
  const [confirm, setConfirm] = useState('');
  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setConfirm('');
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="inline-flex items-center gap-2">
            <AlertTriangle className="text-warn size-4" aria-hidden="true" />
            Deactivate {fullName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The user loses sign-in access immediately. Their content (replies, resolutions, etc.)
            stays attributed. You can reactivate later. To confirm, type the user&apos;s email
            below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field
          label={`Type ${email} to confirm`}
          required
          error={confirm.length > 0 && !matches ? 'Email does not match.' : undefined}
        >
          <FieldInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
            disabled={isPending}
            autoComplete="off"
          />
        </Field>

        {error && (
          <p role="alert" className="text-warn text-sm font-medium">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending || !matches}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              className="bg-warn text-paper hover:bg-warn/85 font-medium"
            >
              {isPending ? 'Deactivating…' : 'Deactivate user'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
