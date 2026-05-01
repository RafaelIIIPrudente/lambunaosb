import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Home, Newspaper } from 'lucide-react';

import { FadeUp } from '@/components/motion/fade-up';
import { SpringScaleIn } from '@/components/motion/spring-scale-in';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Query received',
    description: 'Confirmation of citizen query submission.',
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>;
}) {
  const { ref, email } = await searchParams;
  if (!ref || ref.trim().length === 0) {
    redirect('/submit-query');
  }

  const replyTo = email && email.length > 0 && email !== 'silent@honeypot' ? email : null;

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 py-16 text-center sm:px-8 md:py-24">
      <SpringScaleIn>
        <CheckCircle2 className="text-success size-20 stroke-[1.5]" aria-hidden="true" />
      </SpringScaleIn>

      <FadeUp as="div" delay={0.2}>
        <h1
          role="status"
          className="text-ink font-display mt-8 text-3xl leading-tight font-bold tracking-tight md:text-4xl"
        >
          Thank you. We received your message.
        </h1>
      </FadeUp>

      {replyTo && (
        <FadeUp
          as="p"
          delay={0.35}
          className="text-navy-primary font-display mt-5 max-w-md text-base leading-relaxed italic"
        >
          A confirmation has been sent to{' '}
          <strong className="font-semibold not-italic">{replyTo}</strong>. The Office of the
          Sangguniang typically replies within 1–3 business days.
        </FadeUp>
      )}

      <FadeUp
        as="div"
        delay={0.45}
        className="bg-paper-2 border-ink/15 mt-12 w-full rounded-md border p-6 text-left"
      >
        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
          Your reference number
        </p>
        <p className="text-rust mt-2 font-mono text-3xl font-semibold tracking-wide tabular-nums select-all md:text-4xl">
          {ref}
        </p>
        <p className="text-ink-faint mt-3 text-sm italic">
          Save this — quote it if you need to follow up.
        </p>
      </FadeUp>

      <FadeUp as="div" delay={0.55} className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-10 items-center gap-2 border border-dashed px-5 text-base transition-colors"
        >
          <Home className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <Link
          href="/news"
          className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-10 items-center gap-2 border border-dashed px-5 text-base transition-colors"
        >
          <Newspaper className="size-4" aria-hidden="true" />
          Read the news
        </Link>
      </FadeUp>
    </section>
  );
}
