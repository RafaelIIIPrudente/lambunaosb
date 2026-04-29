'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { resetPasswordRequestSchema, type ResetPasswordRequestInput } from '@/lib/validators/auth';

import { requestPasswordReset } from '@/app/_actions/auth';

export function ResetPasswordRequestForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordRequestInput>({
    resolver: standardSchemaResolver(resetPasswordRequestSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: ResetPasswordRequestInput) {
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      form.setError('root', {
        type: 'success',
        message: 'Check your inbox — the reset link is valid for 15 minutes.',
      });
    });
  }

  const isSuccess = form.formState.errors.root?.type === 'success';

  return (
    <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Email address" required error={form.formState.errors.email?.message}>
        <div className="flex items-center gap-2">
          <Mail className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="email"
            placeholder="you@lambunao.gov.ph"
            autoComplete="email"
            {...form.register('email')}
          />
        </div>
      </Field>

      {form.formState.errors.root && (
        <p
          role={isSuccess ? 'status' : 'alert'}
          className={
            isSuccess ? 'text-success text-sm font-medium' : 'text-warn text-sm font-medium'
          }
        >
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
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
