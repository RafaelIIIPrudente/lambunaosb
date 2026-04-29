'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Lock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { signInSchema, type SignInInput } from '@/lib/validators/auth';

import { signIn } from '@/app/_actions/auth';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignInInput>({
    resolver: standardSchemaResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
      redirectTo: searchParams.get('redirectTo') ?? undefined,
    },
    // Validate only on submit; once the user has tried once, re-validate on
    // every keystroke so they see errors clear as they fix them.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signIn(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Email address" required error={form.formState.errors.email?.message}>
        <div className="flex items-center gap-2">
          <Mail className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="email"
            inputMode="email"
            placeholder="you@lambunao.gov.ph"
            autoComplete="email"
            {...form.register('email')}
          />
        </div>
      </Field>

      <Field label="Password" required error={form.formState.errors.password?.message}>
        <div className="flex items-center gap-2">
          <Lock className="text-ink-faint size-4" aria-hidden="true" />
          <FieldInput
            type="password"
            placeholder="••••••••••"
            autoComplete="current-password"
            {...form.register('password')}
          />
        </div>
      </Field>

      <div className="mt-1 flex items-center justify-between text-sm">
        <label className="text-ink-soft inline-flex items-center gap-2">
          <input type="checkbox" className="accent-rust size-4" {...form.register('remember')} />
          <span>Remember me</span>
        </label>
        <Link href="/reset-password" className="text-rust font-script text-base hover:underline">
          Forgot password?
        </Link>
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
        {isPending ? 'Signing in…' : 'Sign in'}
        <ArrowRight />
      </Button>
    </form>
  );
}
