import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { SignUpForm } from './_form';

export const metadata = {
  title: 'Create account',
  description: 'Request access to the SB Lambunao admin console.',
};

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_1fr]">
      <aside className="bg-rust text-paper relative flex flex-col justify-between p-10 lg:p-16">
        <header className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="border-paper/60 bg-rust text-paper inline-flex size-12 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold"
          >
            SB
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-script text-2xl">Sangguniang Bayan</span>
            <span className="text-paper/75 font-mono text-[11px] tracking-[0.18em]">
              MUNICIPALITY OF LAMBUNAO · ILOILO
            </span>
          </div>
        </header>

        <div className="hidden lg:block">
          <p className="font-script text-5xl leading-[1.1]">
            Request access,
            <br />
            then we approve.
          </p>
          <p className="text-paper/85 mt-6 max-w-sm font-mono text-xs leading-relaxed tracking-wide">
            Accounts land in a pending queue. The Secretariat reviews and assigns your role before
            your console unlocks.
          </p>
        </div>

        <p className="text-paper/60 hidden font-mono text-[10px] tracking-wide lg:block">
          v1.0 · authorized officials only
        </p>
      </aside>

      <main className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <Link
            href="/login"
            className="text-ink-faint hover:text-rust mb-6 inline-flex items-center gap-1.5 font-mono text-xs"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Back to sign in
          </Link>

          <p className="text-rust mb-2 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Sign up
          </p>
          <h1 className="text-ink font-script text-4xl font-medium">Create your account</h1>
          <p className="text-ink-soft mt-3 text-sm leading-relaxed italic">
            Fill in your details below. The Secretariat will review your request and assign your
            role before you can access the admin console.
          </p>

          <Suspense fallback={<div className="mt-8 h-96" aria-hidden="true" />}>
            <SignUpForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
