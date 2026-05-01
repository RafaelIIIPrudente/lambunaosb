'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';

import { signUp } from '@/app/_actions/auth';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { TurnstileWidget } from '@/components/marketing/turnstile-widget';
import { signUpSchema, type SignUpInput } from '@/lib/validators/auth';

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  const form = useForm<SignUpInput>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true, // RHF needs `false` initial; Zod refines on submit
      turnstileToken: undefined,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUp({ ...values, turnstileToken });
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push('/pending');
    });
  }

  return (
    <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Full name" required error={form.formState.errors.fullName?.message}>
        <div className="flex items-center gap-2">
          <User className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            placeholder="Hon. Juan dela Cruz"
            autoComplete="name"
            {...form.register('fullName')}
          />
        </div>
      </Field>

      <Field label="Email address" required error={form.formState.errors.email?.message}>
        <div className="flex items-center gap-2">
          <Mail className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@lambunao.gov.ph"
            {...form.register('email')}
          />
        </div>
      </Field>

      <Field
        label="Password"
        required
        hint="At least 12 characters, with one uppercase, one lowercase, one number."
        error={form.formState.errors.password?.message}
      >
        <div className="flex items-center gap-2">
          <Lock className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            {...form.register('password')}
          />
        </div>
      </Field>

      <Field
        label="Confirm password"
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

      <label className="text-ink-soft mt-2 flex items-start gap-2 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="accent-rust mt-0.5 size-4"
          {...form.register('acceptTerms')}
        />
        <span>
          I agree to the{' '}
          <Link href="/privacy" className="text-rust font-medium hover:underline">
            Data Privacy Notice
          </Link>{' '}
          and consent to the processing of my personal data per Republic Act 10173.
        </span>
      </label>
      {form.formState.errors.acceptTerms && (
        <p role="alert" className="text-warn -mt-2 text-sm font-medium">
          {form.formState.errors.acceptTerms.message}
        </p>
      )}

      <div className="mt-2">
        <TurnstileWidget onToken={setTurnstileToken} />
      </div>

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
        {isPending ? 'Creating account…' : 'Request access'}
        <ArrowRight />
      </Button>

      <p className="text-ink-faint mt-4 text-center text-xs leading-relaxed italic">
        After sign-up, your account waits in a pending queue until the Secretariat reviews and
        approves it. You will see a confirmation page next.
      </p>
    </form>
  );
}
