'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Save, X } from 'lucide-react';

import { updateMeeting } from '@/app/_actions/meetings';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  MEETING_LOCALES,
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  updateMeetingSchema,
  type UpdateMeetingInput,
} from '@/lib/validators/meeting';

const LOCALE_LABELS: Record<(typeof MEETING_LOCALES)[number], string> = {
  hil: 'Hiligaynon',
  en: 'English',
  tl: 'Tagalog',
};

type Option = { id: string; label: string };

type Props = {
  meetingId: string;
  presiderOptions: Option[];
  initialValues: Omit<UpdateMeetingInput, 'meetingId'>;
};

export function EditMeetingForm({ meetingId, presiderOptions, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateMeetingInput>({
    resolver: standardSchemaResolver(updateMeetingSchema),
    defaultValues: { meetingId, ...initialValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: UpdateMeetingInput) {
    startTransition(async () => {
      const result = await updateMeeting(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(`/admin/meetings/${meetingId}`);
      router.refresh();
    });
  }

  return (
    <form className="grid max-w-3xl gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Session details
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Title" required error={form.formState.errors.title?.message}>
            <FieldInput {...form.register('title')} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Type" required>
              <FieldSelect {...form.register('type')}>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEETING_TYPE_LABELS[t]}
                  </option>
                ))}
              </FieldSelect>
            </Field>
            <Field
              label="Sequence №"
              required
              error={form.formState.errors.sequenceNumber?.message}
            >
              <FieldInput
                type="number"
                min={1}
                max={9999}
                {...form.register('sequenceNumber', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Scheduled date"
              required
              error={form.formState.errors.scheduledDate?.message}
            >
              <FieldInput type="date" {...form.register('scheduledDate')} />
            </Field>
            <Field
              label="Scheduled time"
              required
              error={form.formState.errors.scheduledTime?.message}
            >
              <FieldInput type="time" {...form.register('scheduledTime')} />
            </Field>
            <Field label="Presider">
              <FieldSelect
                {...form.register('presiderId', {
                  setValueAs: (v) => (v === '' || v == null ? null : v),
                })}
              >
                <option value="">No presider selected</option>
                {presiderOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </FieldSelect>
            </Field>
            <Field label="Primary locale" required>
              <FieldSelect {...form.register('primaryLocale')}>
                {MEETING_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_LABELS[l]}
                  </option>
                ))}
              </FieldSelect>
            </Field>
          </div>

          <Field label="Location" required error={form.formState.errors.location?.message}>
            <FieldInput {...form.register('location')} />
          </Field>

          <Field
            label="Expected duration (minutes)"
            hint="Optional. Used to estimate recording length and transcription cost."
          >
            <FieldInput
              type="number"
              min={15}
              max={480}
              step={15}
              {...form.register('expectedDurationMinutes', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </Field>
        </div>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Agenda
        </p>
        <Field label="Agenda items" hint="One per line. Order is preserved.">
          <FieldTextarea rows={6} {...form.register('agendaText')} />
        </Field>
      </section>

      <section className="border-ink/15 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Transcription
        </p>
        <label className="border-ink/30 flex items-start justify-between gap-4 rounded-md border border-dashed p-4">
          <span>
            <span className="text-ink block font-medium">Hiligaynon cleanup pass</span>
            <span className="text-ink-soft mt-1 block text-xs italic">
              Adds ~30s latency and ~$0.30 per 2hr session. Flip on for HIL-heavy sessions.
            </span>
          </span>
          <input
            type="checkbox"
            className="accent-rust mt-1 size-4 shrink-0"
            {...form.register('cleanupEnabled')}
          />
        </label>
      </section>

      {form.formState.errors.root && (
        <p role="alert" className="text-warn text-sm font-medium">
          {form.formState.errors.root.message}
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
          onClick={() => router.push(`/admin/meetings/${meetingId}`)}
          className="font-medium"
        >
          <X />
          Cancel
        </Button>
      </div>
    </form>
  );
}
