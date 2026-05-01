'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { CheckCircle2, Save } from 'lucide-react';

import { updateTenantSettings } from '@/app/_actions/settings';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldTextarea } from '@/components/ui/field';
import {
  updateTenantSettingsSchema,
  type UpdateTenantSettingsInput,
} from '@/lib/validators/settings';

type Props = {
  defaults: UpdateTenantSettingsInput;
};

export function TenantForm({ defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const form = useForm<UpdateTenantSettingsInput>({
    resolver: standardSchemaResolver(updateTenantSettingsSchema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: UpdateTenantSettingsInput) {
    startTransition(async () => {
      const result = await updateTenantSettings(values);
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
        <Field
          label="Display name"
          required
          hint="Shown in the public footer and email signatures."
          error={form.formState.errors.displayName?.message}
        >
          <FieldInput disabled={isPending} {...form.register('displayName')} />
        </Field>
        <Field label="Contact phone" error={form.formState.errors.contactPhone?.message}>
          <FieldInput inputMode="tel" disabled={isPending} {...form.register('contactPhone')} />
        </Field>
        <Field
          label="Contact email"
          required
          hint="Public-facing inquiry inbox."
          error={form.formState.errors.contactEmail?.message}
        >
          <FieldInput
            type="email"
            inputMode="email"
            disabled={isPending}
            {...form.register('contactEmail')}
          />
        </Field>
        <Field
          label="DPO email"
          required
          hint="Data Protection Officer (RA 10173)."
          error={form.formState.errors.dpoEmail?.message}
        >
          <FieldInput
            type="email"
            inputMode="email"
            disabled={isPending}
            {...form.register('dpoEmail')}
          />
        </Field>
      </div>

      <Field label="Office address" error={form.formState.errors.officeAddress?.message}>
        <FieldTextarea rows={2} disabled={isPending} {...form.register('officeAddress')} />
      </Field>

      <Field
        label="Office hours"
        hint="Markdown supported. Shown on /about."
        error={form.formState.errors.officeHoursMd?.message}
      >
        <FieldTextarea rows={4} disabled={isPending} {...form.register('officeHoursMd')} />
      </Field>

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
          {isPending ? 'Saving…' : 'Save organization'}
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
