'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Save, X } from 'lucide-react';

import { createResolution } from '@/app/_actions/resolutions';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  createResolutionSchema,
  type CreateResolutionInput,
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
} from '@/lib/validators/resolution';
import { cn } from '@/lib/utils';

type Option = { id: string; label: string };

type Props = {
  sponsorOptions: Option[];
  meetingOptions: Option[];
};

const TODAY_DATE = new Date().toISOString().slice(0, 10);

export function NewResolutionForm({ sponsorOptions, meetingOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coSponsorIds, setCoSponsorIds] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  const form = useForm<CreateResolutionInput>({
    resolver: standardSchemaResolver(createResolutionSchema),
    defaultValues: {
      type: 'resolution',
      title: '',
      bodyMd: '',
      primarySponsorId: undefined,
      coSponsorIds: [],
      meetingId: undefined,
      committeeId: undefined,
      tags: [],
      dateFiled: TODAY_DATE,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: CreateResolutionInput) {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: CreateResolutionInput = {
      ...values,
      coSponsorIds,
      tags,
      primarySponsorId: values.primarySponsorId || null,
      meetingId: values.meetingId || null,
    };

    startTransition(async () => {
      const result = await createResolution(payload);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(`/admin/resolutions/${result.data.id}`);
      router.refresh();
    });
  }

  function toggleCoSponsor(id: string) {
    setCoSponsorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[1fr_320px]"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Type" required>
            <FieldSelect {...form.register('type')}>
              {RESOLUTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RESOLUTION_TYPE_LABELS[t]}
                </option>
              ))}
            </FieldSelect>
          </Field>
          <Field label="Date filed" required error={form.formState.errors.dateFiled?.message}>
            <FieldInput type="date" {...form.register('dateFiled')} />
          </Field>
        </div>

        <Field label="Title" required error={form.formState.errors.title?.message}>
          <FieldInput
            placeholder="An ordinance regulating tricycle franchising in poblacion areas"
            {...form.register('title')}
          />
        </Field>

        <Field
          label="Body (markdown)"
          hint="WHEREAS clauses, NOW THEREFORE BE IT RESOLVED, signatures. Plain markdown."
          error={form.formState.errors.bodyMd?.message}
        >
          <FieldTextarea
            rows={14}
            placeholder={'WHEREAS, …\n\nNOW, THEREFORE, BE IT RESOLVED, …'}
            {...form.register('bodyMd')}
          />
        </Field>

        <Field label="Primary sponsor">
          <FieldSelect {...form.register('primarySponsorId')}>
            <option value="">Select an SB member…</option>
            {sponsorOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </FieldSelect>
        </Field>

        <fieldset className="border-ink/25 rounded-md border px-4 pt-3 pb-3">
          <legend className="text-rust px-1 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
            Co-sponsors · multi-select
          </legend>
          {sponsorOptions.length === 0 ? (
            <p className="text-ink-faint font-mono text-xs">No SB members available.</p>
          ) : (
            <ul role="group" aria-label="Co-sponsors" className="mt-2 flex flex-wrap gap-1.5">
              {sponsorOptions.map((s) => {
                const active = coSponsorIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggleCoSponsor(s.id)}
                      aria-pressed={active}
                      className={cn(
                        'border-ink/30 text-ink-soft hover:border-ink rounded-pill focus-visible:ring-rust/40 inline-flex h-8 items-center gap-1.5 border px-3 text-sm transition-colors outline-none focus-visible:ring-2',
                        active && 'bg-ink border-ink text-paper hover:border-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <Field label="Linked meeting">
          <FieldSelect {...form.register('meetingId')}>
            <option value="">No linked meeting yet</option>
            {meetingOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </FieldSelect>
        </Field>

        <Field label="Tags" hint="Comma-separated, e.g. health, infrastructure, public-safety">
          <FieldInput
            placeholder="health, infrastructure"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </Field>

        {form.formState.errors.root && (
          <p role="alert" className="text-warn text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending} className="font-medium">
            <Save />
            {isPending ? 'Saving…' : 'Save draft'}
            <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => router.push('/admin/resolutions')}
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
            <li>1. Save this as a draft.</li>
            <li>2. File for first reading once sponsors are confirmed.</li>
            <li>3. Advance to second reading after debate.</li>
            <li>4. Mark approved with the recorded vote.</li>
            <li>5. Secretary or Mayor publishes.</li>
          </ol>
        </div>

        <div className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Auto-numbered
          </p>
          <p className="text-ink-soft text-xs italic">
            The resolution number is generated from the year in <strong>Date filed</strong> and the
            next sequence for that year. You don&apos;t enter it manually.
          </p>
        </div>
      </aside>
    </form>
  );
}
