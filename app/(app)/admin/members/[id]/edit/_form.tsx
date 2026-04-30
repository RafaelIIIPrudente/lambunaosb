'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { AlertTriangle, Plus, Save, Trash2, X } from 'lucide-react';

import {
  changeMemberPosition,
  replaceCommitteeAssignments,
  updateMember,
} from '@/app/_actions/members';
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
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  COMMITTEE_ROLE_LABELS,
  COMMITTEE_ROLES,
  MEMBER_POSITION_LABELS,
  MEMBER_POSITIONS,
  type CommitteeRoleValue,
  type MemberPositionValue,
  updateMemberSchema,
  type UpdateMemberInput,
} from '@/lib/validators/member';

type CommitteeOption = { id: string; name: string };

type Assignment = { committeeId: string; role: CommitteeRoleValue };

type EditorInitialValues = Omit<
  UpdateMemberInput,
  'memberId' | 'committeeAssignments' | 'photoStoragePath'
>;

type Props = {
  memberId: string;
  initialValues: EditorInitialValues;
  initialAssignments: Assignment[];
  committeeOptions: CommitteeOption[];
  canChangePosition: boolean;
};

function assignmentsEqual(a: Assignment[], b: Assignment[]): boolean {
  if (a.length !== b.length) return false;
  const key = (x: Assignment) => `${x.committeeId}:${x.role}`;
  const sortedA = [...a].map(key).sort();
  const sortedB = [...b].map(key).sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function MemberEditorForm({
  memberId,
  initialValues,
  initialAssignments,
  committeeOptions,
  canChangePosition,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [pendingPositionChange, setPendingPositionChange] = useState<MemberPositionValue | null>(
    null,
  );
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<UpdateMemberInput>({
    resolver: standardSchemaResolver(updateMemberSchema),
    defaultValues: {
      memberId,
      ...initialValues,
      photoStoragePath: null,
      committeeAssignments: initialAssignments,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function addAssignment() {
    const firstUnused = committeeOptions.find(
      (opt) => !assignments.some((a) => a.committeeId === opt.id),
    );
    if (!firstUnused) return;
    setAssignments((prev) => [...prev, { committeeId: firstUnused.id, role: 'member' }]);
  }

  function removeAssignment(index: number) {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAssignment(index: number, patch: Partial<Assignment>) {
    setAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  async function performSave(values: UpdateMemberInput) {
    setGlobalError(null);
    const positionChanged = values.position !== initialValues.position;

    // 1. Always run updateMember (handles all fields except position).
    const updateResult = await updateMember({
      ...values,
      committeeAssignments: assignments,
    });
    if (!updateResult.ok) {
      setGlobalError(updateResult.error);
      return false;
    }

    // 2. If position changed and user is allowed, call changeMemberPosition.
    if (positionChanged && canChangePosition) {
      const positionResult = await changeMemberPosition({
        memberId,
        newPosition: values.position,
      });
      if (!positionResult.ok) {
        setGlobalError(`Profile saved but position change failed: ${positionResult.error}`);
        return false;
      }
    }

    // 3. If assignments diff, call replaceCommitteeAssignments.
    if (!assignmentsEqual(initialAssignments, assignments)) {
      const assignResult = await replaceCommitteeAssignments({
        memberId,
        assignments,
      });
      if (!assignResult.ok) {
        setGlobalError(`Profile saved but committee update failed: ${assignResult.error}`);
        return false;
      }
    }

    return true;
  }

  function onSubmit(values: UpdateMemberInput) {
    const positionChanged = values.position !== initialValues.position;

    if (positionChanged && canChangePosition) {
      setPendingPositionChange(values.position);
      return;
    }
    if (positionChanged && !canChangePosition) {
      setGlobalError('You do not have permission to change the position.');
      return;
    }

    startTransition(async () => {
      const ok = await performSave(values);
      if (ok) {
        router.push(`/admin/members/${memberId}`);
        router.refresh();
      }
    });
  }

  function confirmPositionChange() {
    if (!pendingPositionChange) return;
    const values = form.getValues();
    setPendingPositionChange(null);
    startTransition(async () => {
      const ok = await performSave(values);
      if (ok) {
        router.push(`/admin/members/${memberId}`);
        router.refresh();
      }
    });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Identity
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <Field label="Full name" required error={form.formState.errors.fullName?.message}>
              <FieldInput {...form.register('fullName')} />
            </Field>
            <Field label="Honorific" required>
              <FieldInput {...form.register('honorific')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Position" required>
              <FieldSelect {...form.register('position')} disabled={!canChangePosition}>
                {MEMBER_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {MEMBER_POSITION_LABELS[p]}
                  </option>
                ))}
              </FieldSelect>
            </Field>
            <Field label="Seniority (optional)">
              <FieldInput {...form.register('seniority')} />
            </Field>
          </div>

          {canChangePosition && (
            <div className="border-warn/40 bg-warn/5 flex items-start gap-2 rounded-md border border-dashed p-3">
              <AlertTriangle className="text-warn mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="text-ink-soft text-xs">
                Changing position writes a high-priority audit row. You&apos;ll be asked to confirm
                before saving.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Term start year"
              required
              error={form.formState.errors.termStartYear?.message}
            >
              <FieldInput
                type="number"
                min={2000}
                max={2100}
                {...form.register('termStartYear', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Term end year"
              required
              error={form.formState.errors.termEndYear?.message}
            >
              <FieldInput
                type="number"
                min={2000}
                max={2100}
                {...form.register('termEndYear', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Sort order">
              <FieldInput
                type="number"
                min={0}
                max={9999}
                {...form.register('sortOrder', { valueAsNumber: true })}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Contact
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email (optional)" error={form.formState.errors.contactEmail?.message}>
            <FieldInput type="email" {...form.register('contactEmail')} />
          </Field>
          <Field label="Phone (optional)">
            <FieldInput {...form.register('contactPhone')} />
          </Field>
        </div>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Committee assignments
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAssignment}
            disabled={assignments.length >= committeeOptions.length}
            className="font-medium"
          >
            <Plus />
            Add
          </Button>
        </div>
        {assignments.length === 0 ? (
          <p className="text-ink-faint font-mono text-xs">
            No committees assigned. Add one or save without — this member will hold no committee
            seats.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {assignments.map((a, i) => (
              <li key={i} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                <Field label={`Committee ${i + 1}`}>
                  <FieldSelect
                    value={a.committeeId}
                    onChange={(e) => updateAssignment(i, { committeeId: e.target.value })}
                  >
                    {committeeOptions.map((opt) => {
                      const taken = assignments.some(
                        (other, oi) => oi !== i && other.committeeId === opt.id,
                      );
                      return (
                        <option key={opt.id} value={opt.id} disabled={taken}>
                          {opt.name}
                          {taken && ' (taken)'}
                        </option>
                      );
                    })}
                  </FieldSelect>
                </Field>
                <Field label="Role">
                  <FieldSelect
                    value={a.role}
                    onChange={(e) =>
                      updateAssignment(i, { role: e.target.value as CommitteeRoleValue })
                    }
                  >
                    {COMMITTEE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {COMMITTEE_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </FieldSelect>
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAssignment(i)}
                    aria-label={`Remove committee assignment ${i + 1}`}
                    className="text-warn hover:bg-warn/10 hover:text-warn font-medium"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Bio &amp; visibility
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Bio" hint="Plain text or markdown.">
            <FieldTextarea rows={6} {...form.register('bioMd')} />
          </Field>
          <label className="border-ink/30 flex items-center justify-between rounded-md border border-dashed p-4">
            <span className="text-ink font-medium">Show on public directory</span>
            <input
              type="checkbox"
              className="accent-rust size-4"
              {...form.register('showOnPublic')}
            />
          </label>
        </div>
      </section>

      {globalError && (
        <p role="alert" className="text-warn text-sm font-medium">
          {globalError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="font-medium">
          <Save />
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => router.push(`/admin/members/${memberId}`)}
          className="font-medium"
        >
          <X />
          Cancel
        </Button>
      </div>

      <AlertDialog
        open={pendingPositionChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPositionChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm position change</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re changing position from{' '}
              <strong>{MEMBER_POSITION_LABELS[initialValues.position]}</strong> to{' '}
              <strong>
                {pendingPositionChange ? MEMBER_POSITION_LABELS[pendingPositionChange] : ''}
              </strong>
              . This writes a high-priority audit row tied to your account. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPositionChange(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmPositionChange();
              }}
            >
              Confirm change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
