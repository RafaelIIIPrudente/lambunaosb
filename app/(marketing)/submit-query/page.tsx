import type { Metadata } from 'next';

import { SubmitQueryForm } from './_form';

export const metadata: Metadata = {
  title: 'Submit a query',
  description:
    'Send the Sangguniang Bayan ng Lambunao a question or request. Acknowledged within 24 hours.',
};

export default function SubmitQueryPage() {
  return (
    <section className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-8 md:py-16">
      <header className="mb-10">
        <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          We read every message
        </p>
        <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
          Submit a query
        </h1>
        <p className="text-navy-primary font-display mt-5 max-w-2xl text-lg italic">
          Question, suggestion, complaint, or request for a public document. Replies are usually
          sent within 1–3 business days.
        </p>
      </header>

      <SubmitQueryForm />
    </section>
  );
}
