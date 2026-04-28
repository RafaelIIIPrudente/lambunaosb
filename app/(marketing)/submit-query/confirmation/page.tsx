import Link from 'next/link';
import { CheckCircle2, Home, Newspaper } from 'lucide-react';

export const metadata = {
  title: 'Query received',
  description: 'Confirmation of citizen query submission.',
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>;
}) {
  const { ref, email } = await searchParams;
  const reference = ref ?? 'Q-2026-0142';
  const replyTo = email ?? 'juan@example.com';

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 py-16 text-center sm:px-8 md:py-24">
      <CheckCircle2 className="text-success size-20 stroke-[1.5]" aria-hidden="true" />

      <h1
        role="status"
        className="text-ink font-display mt-8 text-3xl leading-tight font-bold tracking-tight md:text-4xl"
      >
        Thank you. We received your message.
      </h1>

      <p className="text-navy-primary font-display mt-5 max-w-md text-base leading-relaxed italic">
        A confirmation has been sent to{' '}
        <strong className="font-semibold not-italic">{replyTo}</strong>. The Office of the
        Sangguniang typically replies within 1–3 business days.
      </p>

      <div className="bg-paper-2 border-ink/15 mt-12 w-full rounded-md border p-6 text-left">
        <p className="text-rust font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
          Your reference number
        </p>
        <p className="text-rust mt-2 font-mono text-3xl font-semibold tracking-wide tabular-nums select-all md:text-4xl">
          {reference}
        </p>
        <p className="text-ink-faint mt-3 text-sm italic">
          Save this — quote it if you need to follow up.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
      </div>
    </section>
  );
}
