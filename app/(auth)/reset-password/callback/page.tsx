import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { SetNewPasswordForm } from './_set-form';

export const metadata = { title: 'Set new password' };

export default async function ResetPasswordCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code : null;

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
        <h1 className="text-ink font-script text-4xl font-medium">Choose a new password</h1>

        {code ? (
          <>
            <p className="text-ink-soft mt-3 text-sm leading-relaxed italic">
              Pick a password you haven&apos;t used before. We&apos;ll sign you in once the new
              password is saved.
            </p>
            <SetNewPasswordForm code={code} />
          </>
        ) : (
          <div className="border-warn/40 bg-warn/5 mt-6 rounded-md border p-4">
            <p className="text-warn text-sm font-medium">
              {params.error_description ??
                'This reset link is missing its verification code or has expired. Request a new one below.'}
            </p>
            <Link
              href="/reset-password"
              className="text-rust font-script mt-3 inline-flex text-base hover:underline"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
