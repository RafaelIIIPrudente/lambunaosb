import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Newspaper } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { getFeaturedNews } from '@/lib/db/queries/news';

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health',
  notice: 'Notice',
  hearing: 'Hearing',
  event: 'Event',
  announcement: 'Announcement',
  press_release: 'Press release',
};

export default async function LandingPage() {
  const featuredNews = await getFeaturedNews(3);

  return (
    <>
      {/* HERO — asymmetric: text left, seal right */}
      <section className="border-ink/12 border-b">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div className="flex flex-col">
            <p className="text-rust mb-6 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              Official · Municipal Council · Established 1948
            </p>
            <h1 className="text-ink font-display text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl lg:text-[64px]">
              The voice of the people of <span className="gold-underline">Lambunao</span>.
            </h1>
            <p className="text-ink-soft font-script mt-8 max-w-xl text-2xl leading-snug">
              The Sangguniang Bayan is the legislative body of the municipality. Read our
              resolutions, follow our sessions, meet your council, and reach us directly.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild className="font-script text-base">
                <Link href="/submit-query">
                  Submit a query
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="font-script text-base">
                <Link href="/news">
                  <Newspaper />
                  Latest news
                </Link>
              </Button>
            </div>

            <p className="text-ink-faint mt-6 font-mono text-xs">
              [TL] / [HIL] versions of this page available · click{' '}
              <span aria-hidden="true">🌐</span> EN
            </p>
          </div>

          {/* Right column — official seal */}
          <aside className="flex flex-col items-center justify-center gap-3 lg:items-end">
            <Image
              src="/seal/lambunao-seal.png"
              width={400}
              height={400}
              alt="Official seal of Lambunao Municipality, Province of Iloilo"
              priority
              className="h-auto w-full max-w-[360px]"
            />
            <p className="text-ink-faint max-w-[280px] text-right font-mono text-[11px] tracking-wide">
              Official municipal seal · Province of Iloilo
            </p>
          </aside>
        </div>
      </section>

      {/* MISSION BAND */}
      <section className="bg-paper-2 border-ink/12 border-b">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
          <p className="text-rust mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Our mission
          </p>
          <blockquote className="text-navy-primary font-display max-w-4xl text-2xl leading-snug font-medium italic md:text-3xl">
            &ldquo;To enact responsive ordinances, exercise transparent oversight of municipal
            affairs, and faithfully represent the voice of every Lambunaonon — kabataan, kababaihan,
            magbubukid, kag mga senior.&rdquo;
          </blockquote>
          <p className="text-ink-faint mt-6 font-mono text-xs">[HIL] excerpt above · placeholder</p>
        </div>
      </section>

      {/* LATEST NEWS */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
        <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-ink font-display text-3xl font-bold md:text-4xl">Latest news</h2>
          <Link
            href="/news"
            className="font-script text-ink hover:text-rust gold-underline group/seeall inline-flex items-center gap-1.5 self-start text-lg sm:self-end"
          >
            See all news
            <ArrowRight className="size-4 transition-transform group-hover/seeall:translate-x-0.5" />
          </Link>
        </header>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredNews.map((post) => (
            <li key={post.id}>
              <Link
                href={`/news/${post.slug}`}
                className="group/news border-ink/30 hover:border-ink/50 hover:shadow-e1 focus-visible:ring-rust bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-4 transition-all focus-visible:ring-2 focus-visible:outline-none"
              >
                <ImagePlaceholder ratio="16:9" />
                <div className="flex flex-col gap-2 px-1 pb-1">
                  <p className="text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                    {CATEGORY_LABELS[post.category]}
                  </p>
                  <h3 className="text-ink font-display group-hover/news:text-rust text-lg leading-snug font-semibold">
                    {post.title}
                  </h3>
                  <p className="text-ink-faint font-mono text-xs">
                    {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })} ·{' '}
                    {format(new Date(post.publishedAt), 'd MMM yyyy')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
