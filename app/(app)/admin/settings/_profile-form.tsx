'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { CheckCircle2, Save } from 'lucide-react';

import { updateProfile } from '@/app/_actions/settings';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';
import {
  TIMEZONE_OPTIONS,
  UI_LOCALE_LABELS,
  UI_LOCALES,
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/validators/settings';

type Props = {
  defaults: UpdateProfileInput;
};

export function ProfileForm({ defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const form = useForm<UpdateProfileInput>({
    resolver: standardSchemaResolver(updateProfileSchema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      setSavedAt(Date.now());
      form.reset(values);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" required error={form.formState.errors.fullName?.message}>
          <FieldInput disabled={isPending} {...form.register('fullName')} />
        </Field>
        <Field
          label="Title"
          hint="e.g. Secretary to the Sangguniang Bayan"
          error={form.formState.errors.title?.message}
        >
          <FieldInput disabled={isPending} {...form.register('title')} />
        </Field>
        <Field label="Email" required error={form.formState.errors.email?.message}>
          <FieldInput
            type="email"
            inputMode="email"
            disabled={isPending}
            {...form.register('email')}
          />
        </Field>
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <FieldInput inputMode="tel" disabled={isPending} {...form.register('phone')} />
        </Field>
        <Field label="UI language" required error={form.formState.errors.uiLocale?.message}>
          <FieldSelect disabled={isPending} {...form.register('uiLocale')}>
            {UI_LOCALES.map((l) => (
              <option key={l} value={l}>
                {UI_LOCALE_LABELS[l]}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <Field label="Time zone" required error={form.formState.errors.timeZone?.message}>
          <FieldSelect disabled={isPending} {...form.register('timeZone')}>
            {TIMEZONE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FieldSelect>
        </Field>
      </div>

      {form.formState.errors.root && (
        <p role="alert" className="text-warn text-sm font-medium">
          {form.formState.errors.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !form.formState.isDirty}
          className="font-medium"
        >
          <Save />
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
        {savedAt && !form.formState.isDirty && (
          <span
            role="status"
            className="text-success inline-flex items-center gap-1 font-mono text-[11px]"
          >
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
