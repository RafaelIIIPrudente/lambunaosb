import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';

import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { mockNews } from '@/lib/mock/meetings';

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

export async function generateStaticParams() {
  return mockNews.map((p) => ({ slug: p.slug }));
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = mockNews.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-[860px] px-4 py-12 sm:px-8 md:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="text-ink-faint flex items-center gap-2 font-mono text-xs">
          <li>
            <Link href="/" className="hover:text-rust">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" />
          </li>
          <li>
            <Link href="/news" className="hover:text-rust">
              News
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" />
          </li>
          <li className="text-rust font-semibold tracking-[0.12em] uppercase" aria-current="page">
            {CATEGORY_LABELS[post.category]}
          </li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="text-ink font-display text-4xl leading-[1.1] font-bold tracking-tight md:text-5xl">
        {post.title}
      </h1>

      {/* Meta row */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="bg-paper-3 border-ink/20 mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-script text-ink text-base">{post.author}</span>
            <span className="text-ink-faint mt-0.5 font-mono text-[11px]">
              Posted {format(new Date(post.publishedAt), 'MMM d, yyyy')} · 5 min read
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-9 items-center gap-1.5 border border-dashed px-3.5 text-sm transition-colors"
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-9 items-center gap-1.5 border border-dashed px-3.5 text-sm transition-colors"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {/* Hero image */}
      <div className="mt-10">
        <ImagePlaceholder ratio="16:9" label="Hero image" />
      </div>

      {/* Body */}
      <div className="text-navy-primary font-display mt-10 flex flex-col gap-5 text-lg leading-relaxed italic">
        <p>{post.excerpt}</p>
        <p>
          Vaccines available include tetanus toxoid (adults), anti-rabies (post-exposure), and
          Hepatitis B (children under 12). Health workers will also accept referrals from the
          previous schedule.
        </p>
        <p>
          For more information, contact the Office of the Sangguniang at{' '}
          <strong className="font-semibold not-italic">(033) 333-1234</strong> or send a query via
          this site. Walk-ins are welcome between 8:00 AM and 12:00 NN.
        </p>
      </div>

      {/* Sentence-fragment placeholder bars (matches the mockup's faint dividers) */}
      <div className="mt-12 space-y-2">
        <div className="bg-paper-3 h-2 w-full rounded-full" />
        <div className="bg-paper-3 h-2 w-2/3 rounded-full" />
      </div>
    </article>
  );
}
