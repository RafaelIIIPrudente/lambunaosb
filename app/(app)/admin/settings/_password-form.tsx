'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { CheckCircle2, KeyRound } from 'lucide-react';

import { updatePassword } from '@/app/_actions/settings';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
  PASSWORD_MIN_LENGTH,
  scorePassword,
  updatePasswordSchema,
  type UpdatePasswordInput,
} from '@/lib/validators/settings';

const STRENGTH_BAR_CLASSES = [
  'bg-destructive',
  'bg-warn',
  'bg-warn',
  'bg-success',
  'bg-success',
] as const;

export function PasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const form = useForm<UpdatePasswordInput>({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const newPassword = useWatch({ control: form.control, name: 'newPassword' });
  const strength = scorePassword(newPassword ?? '');

  function onSubmit(values: UpdatePasswordInput) {
    startTransition(async () => {
      const result = await updatePassword(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      setSavedAt(Date.now());
      form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Field
        label="Current password"
        required
        className="md:max-w-md"
        error={form.formState.errors.currentPassword?.message}
      >
        <FieldInput
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          {...form.register('currentPassword')}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="New password" required error={form.formState.errors.newPassword?.message}>
          <FieldInput
            type="password"
            autoComplete="new-password"
            disabled={isPending}
            {...form.register('newPassword')}
          />
        </Field>
        <Field
          label="Confirm new password"
          required
          error={form.formState.errors.confirmPassword?.message}
        >
          <FieldInput
            type="password"
            autoComplete="new-password"
            disabled={isPending}
            {...form.register('confirmPassword')}
          />
        </Field>
      </div>

      {newPassword && newPassword.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className="border-ink/15 bg-paper-2 flex h-2 overflow-hidden rounded border"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 transition-colors',
                  i < strength.score ? STRENGTH_BAR_CLASSES[strength.score] : 'bg-transparent',
                )}
              />
            ))}
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-ink-faint font-mono text-[11px] tracking-wide"
          >
            Strength: <span className="text-ink-soft font-semibold">{strength.label}</span>
          </p>
        </div>
      )}

      <p
        id="password-rules"
        className="text-ink-faint border-ink/15 rounded-md border border-dashed p-3 text-xs italic"
      >
        Minimum {PASSWORD_MIN_LENGTH} characters · at least one number · at least one symbol.
        Sessions on other devices stay signed in unless you also sign them out below.
      </p>

      {form.formState.errors.root && (
        <p role="alert" className="text-warn text-sm font-medium">
          {form.formState.errors.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending} className="font-medium">
          <KeyRound />
          {isPending ? 'Updating…' : 'Update password'}
        </Button>
        {savedAt && (
          <span
            role="status"
            className="text-success inline-flex items-center gap-1 font-mono text-[11px]"
          >
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Password updated
          </span>
        )}
      </div>
    </form>
  );
}
