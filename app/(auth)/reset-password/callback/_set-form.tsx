'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { setNewPasswordSchema, type SetNewPasswordInput } from '@/lib/validators/auth';

import { setNewPassword } from '@/app/_actions/auth';

export function SetNewPasswordForm({ code }: { code: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SetNewPasswordInput>({
    resolver: standardSchemaResolver(setNewPasswordSchema),
    defaultValues: { code, newPassword: '', confirmPassword: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: SetNewPasswordInput) {
    startTransition(async () => {
      const result = await setNewPassword(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push('/admin/dashboard');
      router.refresh();
    });
  }

  return (
    <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register('code')} />

      <Field label="New password" required error={form.formState.errors.newPassword?.message}>
        <div className="flex items-center gap-2">
          <Lock className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            {...form.register('newPassword')}
          />
        </div>
      </Field>

      <Field
        label="Confirm new password"
        required
        error={form.formState.errors.confirmPassword?.message}
      >
        <div className="flex items-center gap-2">
          <Lock className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
        </div>
      </Field>

      <p className="text-ink-faint text-xs italic">
        ≥ 12 characters · 1 number · 1 symbol · not previously reused.
      </p>

      {form.formState.errors.root && (
        <p role="alert" className="text-warn text-sm font-medium">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        aria-busy={isPending}
        className="font-script mt-2 text-lg"
      >
        {isPending ? 'Updating…' : 'Set password'}
        <ArrowRight />
      </Button>
    </form>
  );
}
