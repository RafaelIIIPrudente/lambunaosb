import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { getPublishedNews } from '@/lib/db/queries/news';

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

const FILTERS = ['All', 'Health', 'Notice', 'Hearing', 'Events'];

export const metadata = {
  title: 'News & Updates',
  description:
    'Bulletins, public hearings, and announcements from the Sangguniang Bayan ng Lambunao.',
};

export default async function NewsPage() {
  const items = await getPublishedNews();

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
      <header className="mb-10">
        <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          Bulletin
        </p>
        <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
          News &amp; Updates
        </h1>
      </header>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="text-ink-faint absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search posts…"
            aria-label="Search news posts"
            className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 rounded-pill h-10 w-full border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-3"
          />
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {FILTERS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={i === 0}
              className="border-ink/30 text-ink hover:border-ink aria-[pressed=true]:bg-ink aria-[pressed=true]:text-paper aria-[pressed=true]:border-ink font-script rounded-pill inline-flex h-9 items-center border px-4 text-sm transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-8 lg:grid-cols-2">
        {items.map((post, i) => (
          <li key={`${post.id}-${i}`}>
            <article className="border-ink/30 hover:border-ink/50 hover:shadow-e1 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-6 transition-all">
              <Link
                href={`/news/${post.slug}`}
                className="focus-visible:ring-rust block focus-visible:ring-2 focus-visible:outline-none"
              >
                <ImagePlaceholder ratio="16:9" />
              </Link>
              <div className="flex flex-col gap-3 px-1">
                <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                  {CATEGORY_LABELS[post.category]}
                </p>
                <h2 className="text-ink font-display text-2xl leading-snug font-semibold">
                  <Link href={`/news/${post.slug}`} className="hover:text-rust">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-ink-faint font-mono text-xs">
                  {format(new Date(post.publishedAt), 'd MMM yyyy')} ·{' '}
                  {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: false })} ago
                </p>
                <p className="text-ink-soft font-script text-base italic">{post.excerpt}</p>
                <Link
                  href={`/news/${post.slug}`}
                  className="border-ink/30 text-ink hover:border-ink hover:bg-paper-2 font-script rounded-pill mt-2 inline-flex h-9 w-fit items-center gap-1.5 border border-dashed px-4 text-sm transition-colors"
                >
                  Read more
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
