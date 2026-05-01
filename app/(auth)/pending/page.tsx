import 'server-only';

import { redirect } from 'next/navigation';
import { Clock, LogOut, Mail } from 'lucide-react';

import { signOut } from '@/app/_actions/auth';
import { Button } from '@/components/ui/button';
import { getAnyAuthContext } from '@/lib/auth/require-user';

export const metadata = {
  title: 'Awaiting approval',
  description: 'Your account is pending review by the SB Lambunao Secretariat.',
};

export default async function PendingApprovalPage() {
  const ctx = await getAnyAuthContext();

  // Defensive: middleware already routes approved users away; double-check here.
  if (!ctx) redirect('/login');
  if (ctx.status === 'approved') redirect('/admin/dashboard');

  return (
    <div className="bg-paper flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="border-rust/30 bg-rust/5 mb-6 flex items-center gap-3 rounded-md border p-4">
          <Clock className="text-rust size-5 shrink-0" aria-hidden="true" />
          <p className="text-ink font-mono text-[11px] tracking-[0.18em] uppercase">
            Awaiting approval
          </p>
        </div>

        <h1 className="text-ink font-script text-4xl leading-tight font-medium">
          Your account is pending review.
        </h1>

        <p className="text-ink-soft mt-4 text-base leading-relaxed italic">
          Welcome, <span className="text-ink font-medium not-italic">{ctx.email}</span>. The SB
          Lambunao Secretariat will review your sign-up and assign your role. You&apos;ll get an
          email when your account is active.
        </p>

        <p className="text-ink-faint mt-6 text-sm leading-relaxed italic">
          This usually takes one to two business days. If you don&apos;t hear back within 72 hours,
          email the Secretariat directly:
        </p>

        <a
          href="mailto:sb@lambunao.gov.ph"
          className="text-rust font-script mt-2 inline-flex items-center gap-1.5 text-base hover:underline"
        >
          <Mail className="size-4" aria-hidden="true" />
          sb@lambunao.gov.ph
        </a>

        <div className="border-ink/15 mt-10 border-t pt-6">
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <Button type="submit" variant="outline" size="sm" className="font-medium">
              <LogOut />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
