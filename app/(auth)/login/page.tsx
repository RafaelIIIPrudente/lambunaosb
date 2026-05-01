import { Suspense } from 'react';

import { LoginForm } from './_form';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to the SB Lambunao admin console.',
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_1fr]">
      {/* LEFT — rust panel: brand + tagline + system list */}
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
            Council operations,
            <br />
            in one place.
          </p>
          <p className="text-paper/85 mt-6 max-w-sm font-mono text-xs leading-relaxed tracking-wide">
            Meetings · resolutions · citizen queries · audit trail.
            <br />
            Authorized officials only.
          </p>
        </div>

        <p className="text-paper/60 hidden font-mono text-[10px] tracking-wide lg:block">
          v1.0 · [TL] · [HIL] available · GovCloud PH
        </p>
      </aside>

      {/* RIGHT — sign-in form */}
      <main className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <p className="text-rust mb-2 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Sign in
          </p>
          <h1 className="text-ink font-script text-4xl font-medium">Welcome back</h1>

          <Suspense fallback={<div className="mt-8 h-64" aria-hidden="true" />}>
            <LoginForm />
          </Suspense>

          <div className="border-ink/30 text-ink-soft mt-6 rounded-md border border-dashed p-4 text-sm leading-relaxed">
            <strong className="text-ink font-semibold">No self-registration.</strong>{' '}
            <span className="text-ink-soft italic">
              New admins are invited by the Secretary. Lost access? Email{' '}
              <a
                href="mailto:it@lambunao.gov.ph"
                className="text-rust font-medium not-italic hover:underline"
              >
                it@lambunao.gov.ph
              </a>
              .
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
