'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type Control, useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { UseFormRegister } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';

import { updateMinutes } from '@/app/_actions/minutes';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  MINUTES_DISPOSITIONS,
  MINUTES_DISPOSITION_LABELS,
  type UpdateMinutesInput,
  updateMinutesSchema,
} from '@/lib/validators/minutes';

type Member = { id: string; honorific: string; fullName: string };

type Props = {
  minutesId: string;
  meetingId: string;
  initialValues: Omit<UpdateMinutesInput, 'minutesId'>;
  members: Member[];
  canEdit: boolean;
};

function emptyItem() {
  return {
    id: crypto.randomUUID(),
    topic: '',
    motionText: null,
    motionedByName: null,
    motionedById: null,
    secondedByName: null,
    secondedById: null,
    discussionSummary: '',
    disposition: 'noted' as const,
    voteSummary: null,
  };
}

export function MinutesForm({ minutesId, meetingId, initialValues, members, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const form = useForm<UpdateMinutesInput>({
    resolver: standardSchemaResolver(updateMinutesSchema),
    defaultValues: { minutesId, ...initialValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: 'itemsOfBusiness',
    keyName: '_key',
  });

  function onMemberChange(index: number, field: 'motionedBy' | 'secondedBy', memberId: string) {
    const idKey = field === 'motionedBy' ? 'motionedById' : 'secondedById';
    const nameKey = field === 'motionedBy' ? 'motionedByName' : 'secondedByName';
    if (memberId === '') {
      form.setValue(`itemsOfBusiness.${index}.${idKey}`, null);
      form.setValue(`itemsOfBusiness.${index}.${nameKey}`, null);
      return;
    }
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    form.setValue(`itemsOfBusiness.${index}.${idKey}`, m.id);
    form.setValue(`itemsOfBusiness.${index}.${nameKey}`, `${m.honorific} ${m.fullName}`);
  }

  function onSubmit(values: UpdateMinutesInput) {
    setError(null);
    startTransition(async () => {
      const result = await updateMinutes(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Cover header
        </p>
        <Field
          label="Cover header"
          hint="2–3 lines. Meeting type, day + date, time called to order, location, presiding officer."
          error={form.formState.errors.coverHeader?.message}
        >
          <FieldTextarea
            rows={4}
            disabled={!canEdit || isPending}
            {...form.register('coverHeader')}
          />
        </Field>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Attendance
        </p>
        <Field
          label="Attendance roster (free text)"
          hint="Members present, absent (with reason), excused, late arrivals. Extracted from the transcript by gpt-4o; verify against the actual session."
          error={form.formState.errors.attendeesText?.message}
        >
          <FieldTextarea
            rows={5}
            disabled={!canEdit || isPending}
            {...form.register('attendeesText')}
          />
        </Field>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Items of business · {fields.length}
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => append(emptyItem())}
              className="font-medium"
            >
              <Plus />
              Add item
            </Button>
          )}
        </div>

        {fields.length === 0 ? (
          <p className="text-ink-faint border-ink/15 rounded-md border border-dashed p-6 text-center font-mono text-xs italic">
            No items of business. Add one with the button above.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <ItemRow
                key={field._key}
                index={index}
                control={form.control}
                register={form.register}
                isPending={isPending}
                canEdit={canEdit}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
                onSwapUp={() => swap(index, index - 1)}
                onSwapDown={() => swap(index, index + 1)}
                onRemove={() => remove(index)}
                onMemberChange={onMemberChange}
                members={members}
                topicError={form.formState.errors.itemsOfBusiness?.[index]?.topic?.message}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Adjournment
        </p>
        <Field label="Adjournment summary" hint="1–2 lines. Time of adjournment + any final notes.">
          <FieldTextarea
            rows={3}
            disabled={!canEdit || isPending}
            {...form.register('adjournmentSummary')}
          />
        </Field>
      </section>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending} className="font-medium">
            <Save />
            {isPending ? 'Saving…' : 'Save draft'}
          </Button>
          {savedAt && (
            <span className="text-ink-faint font-mono text-[11px] italic">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          <span className="text-ink-faint font-mono text-[11px] italic">
            Meeting ID: {meetingId}
          </span>
        </div>
      )}
    </form>
  );
}

type ItemRowProps = {
  index: number;
  control: Control<UpdateMinutesInput>;
  register: UseFormRegister<UpdateMinutesInput>;
  isPending: boolean;
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSwapUp: () => void;
  onSwapDown: () => void;
  onRemove: () => void;
  onMemberChange: (index: number, field: 'motionedBy' | 'secondedBy', memberId: string) => void;
  members: Member[];
  topicError?: string;
};

function ItemRow({
  index,
  control,
  register,
  isPending,
  canEdit,
  isFirst,
  isLast,
  onSwapUp,
  onSwapDown,
  onRemove,
  onMemberChange,
  members,
  topicError,
}: ItemRowProps) {
  const motionedByName = useWatch({
    control,
    name: `itemsOfBusiness.${index}.motionedByName`,
  });
  const secondedByName = useWatch({
    control,
    name: `itemsOfBusiness.${index}.secondedByName`,
  });
  const motionedById = useWatch({
    control,
    name: `itemsOfBusiness.${index}.motionedById`,
  });
  const secondedById = useWatch({
    control,
    name: `itemsOfBusiness.${index}.secondedById`,
  });

  return (
    <li className="border-ink/15 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink font-mono text-[11px] font-semibold tracking-wide">
          Item {index + 1}
        </p>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending || isFirst}
              onClick={onSwapUp}
              aria-label="Move up"
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending || isLast}
              onClick={onSwapDown}
              aria-label="Move down"
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={onRemove}
              aria-label="Remove item"
              className="text-warn hover:text-warn"
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      <input type="hidden" {...register(`itemsOfBusiness.${index}.id`)} />
      <input type="hidden" {...register(`itemsOfBusiness.${index}.motionedByName`)} />
      <input type="hidden" {...register(`itemsOfBusiness.${index}.secondedByName`)} />

      <Field label="Topic" required error={topicError}>
        <FieldInput
          disabled={!canEdit || isPending}
          {...register(`itemsOfBusiness.${index}.topic`)}
        />
      </Field>

      <Field label="Motion text (verbatim)" hint="Empty if no formal motion was moved.">
        <FieldTextarea
          rows={3}
          disabled={!canEdit || isPending}
          {...register(`itemsOfBusiness.${index}.motionText`, {
            setValueAs: (v) => (v === '' || v == null ? null : v),
          })}
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Motioned by"
          hint={motionedByName ? `gpt-4o saw: ${motionedByName}` : undefined}
        >
          <FieldSelect
            value={motionedById ?? ''}
            disabled={!canEdit || isPending}
            onChange={(e) => onMemberChange(index, 'motionedBy', e.target.value)}
          >
            <option value="">— None / unmatched —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.honorific} {m.fullName}
              </option>
            ))}
          </FieldSelect>
        </Field>

        <Field
          label="Seconded by"
          hint={secondedByName ? `gpt-4o saw: ${secondedByName}` : undefined}
        >
          <FieldSelect
            value={secondedById ?? ''}
            disabled={!canEdit || isPending}
            onChange={(e) => onMemberChange(index, 'secondedBy', e.target.value)}
          >
            <option value="">— None / unmatched —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.honorific} {m.fullName}
              </option>
            ))}
          </FieldSelect>
        </Field>
      </div>

      <Field label="Discussion summary" hint="1–3 sentences.">
        <FieldTextarea
          rows={3}
          disabled={!canEdit || isPending}
          {...register(`itemsOfBusiness.${index}.discussionSummary`)}
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-[200px_1fr]">
        <Field label="Disposition" required>
          <FieldSelect
            disabled={!canEdit || isPending}
            {...register(`itemsOfBusiness.${index}.disposition`)}
          >
            {MINUTES_DISPOSITIONS.map((d) => (
              <option key={d} value={d}>
                {MINUTES_DISPOSITION_LABELS[d]}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <Field
          label="Vote summary"
          hint='e.g. "Yea 12 / Nay 1 / Abstain 1". Leave blank if no recorded tally.'
        >
          <FieldInput
            disabled={!canEdit || isPending}
            {...register(`itemsOfBusiness.${index}.voteSummary`, {
              setValueAs: (v) => (v === '' || v == null ? null : v),
            })}
          />
        </Field>
      </div>
    </li>
  );
}
