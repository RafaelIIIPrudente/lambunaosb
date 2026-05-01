'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Plus, Save, Trash2, X } from 'lucide-react';

import { createMember } from '@/app/_actions/members';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
  COMMITTEE_ROLE_LABELS,
  COMMITTEE_ROLES,
  MEMBER_POSITION_LABELS,
  MEMBER_POSITIONS,
  memberSchema,
  type CommitteeRoleValue,
  type MemberInput,
} from '@/lib/validators/member';

type CommitteeOption = { id: string; name: string };

type Assignment = { committeeId: string; role: CommitteeRoleValue };

type Props = {
  committeeOptions: CommitteeOption[];
};

export function MemberComposerForm({ committeeOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const form = useForm<MemberInput>({
    resolver: standardSchemaResolver(memberSchema),
    defaultValues: {
      fullName: '',
      honorific: 'Hon.',
      position: 'sb_member',
      termStartYear: new Date().getFullYear(),
      termEndYear: new Date().getFullYear() + 3,
      seniority: '',
      contactEmail: '',
      contactPhone: '',
      bioMd: '',
      photoStoragePath: null,
      showOnPublic: true,
      sortOrder: 100,
      committeeAssignments: [],
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

  function onSubmit(values: MemberInput) {
    const payload: MemberInput = { ...values, committeeAssignments: assignments };

    startTransition(async () => {
      const result = await createMember(payload);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(`/admin/members/${result.data.id}/edit`);
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[1fr_320px]"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-5">
        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Identity
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-[1fr_140px]">
              <Field label="Full name" required error={form.formState.errors.fullName?.message}>
                <FieldInput placeholder="e.g. Maria dela Cruz" {...form.register('fullName')} />
              </Field>
              <Field label="Honorific" required>
                <FieldInput placeholder="Hon." {...form.register('honorific')} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Position" required>
                <FieldSelect {...form.register('position')}>
                  {MEMBER_POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {MEMBER_POSITION_LABELS[p]}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
              <Field label="Seniority (optional)">
                <FieldInput placeholder="e.g. Senior Member" {...form.register('seniority')} />
              </Field>
            </div>

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
              <Field label="Sort order" hint="Lower numbers appear first.">
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
              <FieldInput
                type="email"
                placeholder="member@lambunao.gov.ph"
                {...form.register('contactEmail')}
              />
            </Field>
            <Field label="Phone (optional)">
              <FieldInput placeholder="(033) 333-1234" {...form.register('contactPhone')} />
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
              No committees assigned yet. Add one or skip; you can manage these later from the edit
              page.
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
            <Field
              label="Bio"
              hint="Plain text or markdown. Background, advocacies, prior public service."
            >
              <FieldTextarea
                rows={6}
                placeholder="Short biography — 2 to 4 sentences."
                {...form.register('bioMd')}
              />
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

        {form.formState.errors.root && (
          <p role="alert" className="text-warn text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending} className="font-medium">
            <Save />
            {isPending ? 'Saving…' : 'Create member'}
            <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => router.push('/admin/members')}
            className="font-medium"
          >
            <X />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-5">
        <div className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Workflow
          </p>
          <ol className="text-ink-soft flex flex-col gap-2 text-xs">
            <li>1. Create the profile.</li>
            <li>2. Upload the portrait on the edit page.</li>
            <li>3. Assign committees + roles.</li>
            <li>4. Toggle public visibility.</li>
          </ol>
        </div>
        <div className={cn('border-ink/15 rounded-md border p-5', 'bg-paper-2/40')}>
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            About sort order
          </p>
          <p className="text-ink-soft text-xs italic">
            Lower numbers appear first in the public directory and admin list. Use multiples of 10
            (10, 20, 30…) so you can re-order later without renumbering everyone.
          </p>
        </div>
      </aside>
    </form>
  );
}
