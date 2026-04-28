import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <div className="bg-paper flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="text-ink-faint hover:text-rust mb-8 inline-flex items-center gap-1.5 font-mono text-xs"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          Back to sign in
        </Link>

        <p className="text-rust mb-2 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          Reset password
        </p>
        <h1 className="text-ink font-script text-4xl font-medium">Forgot your password?</h1>
        <p className="text-ink-soft mt-3 text-sm leading-relaxed italic">
          Enter the email associated with your admin account. We&apos;ll send a one-time link valid
          for 15 minutes.
        </p>

        <form className="mt-8 flex flex-col gap-4" noValidate>
          <Field label="Email address" required>
            <div className="flex items-center gap-2">
              <Mail className="text-ink-faint size-4" aria-hidden="true" />
              <FieldInput
                type="email"
                placeholder="you@lambunao.gov.ph"
                autoComplete="email"
                required
              />
            </div>
          </Field>

          <Button type="submit" size="lg" className="font-script mt-2 text-lg">
            Send reset link
          </Button>
        </form>

        <p className="text-ink-faint mt-8 text-xs leading-relaxed italic">
          Lost access entirely? Email{' '}
          <a
            href="mailto:it@lambunao.gov.ph"
            className="text-rust font-medium not-italic hover:underline"
          >
            it@lambunao.gov.ph
          </a>{' '}
          and the Secretary will reissue your invite.
        </p>
      </div>
    </div>
  );
}
