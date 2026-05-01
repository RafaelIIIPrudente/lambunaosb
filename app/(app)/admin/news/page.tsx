import 'server-only';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Edit3, ImageIcon, Pin, Plus, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getAdminNewsList, getNewsCommittees } from '@/lib/db/queries/news';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';
import { cn } from '@/lib/utils';
import {
  NEWS_CATEGORY_LABELS,
  NEWS_STATUS_LABELS,
  NEWS_STATUSES,
  NEWS_VISIBILITY_LABELS,
  type NewsStatusValue,
} from '@/lib/validators/news-post';

export const metadata = { title: 'News' };

type FilterValue = NewsStatusValue | 'all';

const STATUS_BADGE_VARIANT: Record<
  NewsStatusValue,
  'success' | 'outline' | 'destructive' | 'warn'
> = {
  draft: 'warn',
  scheduled: 'outline',
  published: 'success',
  archived: 'destructive',
};

function isFilterValue(value: string | undefined): value is FilterValue {
  if (!value) return false;
  if (value === 'all') return true;
  return (NEWS_STATUSES as readonly string[]).includes(value);
}

function buildHref(params: { status?: FilterValue; committee?: string }): string {
  const sp = new URLSearchParams();
  if (params.status && params.status !== 'all') sp.set('status', params.status);
  if (params.committee) sp.set('committee', params.committee);
  const qs = sp.toString();
  return qs.length > 0 ? `/admin/news?${qs}` : '/admin/news';
}

export default async function NewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; committee?: string }>;
}) {
  const params = await searchParams;
  const filter: FilterValue = isFilterValue(params.status) ? params.status : 'all';
  const committeeParam = params.committee?.trim() ?? '';

  const [allRows, committees] = await Promise.all([
    safeBuildtimeQuery(
      () => getAdminNewsList(committeeParam ? { committeeId: committeeParam } : {}),
      [],
    ),
    safeBuildtimeQuery(() => getNewsCommittees(), []),
  ]);
  const rows = filter === 'all' ? allRows : allRows.filter((r) => r.status === filter);

  const adminClient = createAdminClient();
  const signedUrlByPostId = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.coverStoragePath)
      .map(async (r) => {
        const url = await getCompressedImageUrl({
          supabase: adminClient,
          bucket: 'news-covers',
          prefix: r.coverStoragePath,
          size: pickSizeForSurface('thumb'),
        });
        if (url) signedUrlByPostId.set(r.id, url);
      }),
  );

  const filterOptions: { value: FilterValue; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: allRows.length },
    {
      value: 'draft',
      label: 'Drafts',
      count: allRows.filter((r) => r.status === 'draft').length,
    },
    {
      value: 'published',
      label: 'Published',
      count: allRows.filter((r) => r.status === 'published').length,
    },
    {
      value: 'archived',
      label: 'Archived',
      count: allRows.filter((r) => r.status === 'archived').length,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="News &amp; updates"
        accessory={
          <Button className="font-script text-base" asChild>
            <Link href="/admin/news/new" aria-label="Create a new news post">
              <Plus />
              New post
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ul role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {filterOptions.map((opt) => {
            const active = filter === opt.value;
            return (
              <li key={opt.value}>
                <Link
                  href={buildHref({ status: opt.value, committee: committeeParam })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'border-ink/30 text-ink-soft hover:border-ink font-script rounded-pill focus-visible:ring-rust/40 inline-flex h-8 items-center gap-1.5 border px-3 text-sm transition-colors outline-none focus-visible:ring-2',
                    active && 'bg-rust border-rust text-paper hover:border-rust',
                  )}
                >
                  {opt.label}
                  <span className="font-mono text-[10px] tabular-nums opacity-75">
                    ({opt.count})
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <form
          action="/admin/news"
          method="get"
          className="flex items-center gap-2"
          aria-label="Filter news by committee"
        >
          {filter !== 'all' && <input type="hidden" name="status" value={filter} />}
          <select
            name="committee"
            defaultValue={committeeParam}
            aria-label="Filter by referring committee"
            className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 h-8 max-w-xs rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-2"
          >
            <option value="">All committees</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm" className="font-medium">
            Apply
          </Button>
          {committeeParam && (
            <Button asChild type="button" variant="ghost" size="sm" className="font-medium">
              <Link href={buildHref({ status: filter })} aria-label="Clear committee filter">
                <X />
              </Link>
            </Button>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <Card className="max-w-xl">
          <CardEyebrow>{filter === 'all' ? 'No news posts yet' : 'No matches'}</CardEyebrow>
          <CardTitle>
            {filter === 'all'
              ? 'Nothing has been posted yet.'
              : `No posts in "${NEWS_STATUS_LABELS[filter as NewsStatusValue]}".`}
          </CardTitle>
          <CardDescription>
            Drafts and published announcements appear here. Start a new one to seed the audit trail.
          </CardDescription>
          <CardFooter>
            {filter === 'all' ? (
              <Button asChild className="font-medium">
                <Link href="/admin/news/new">
                  <Plus />
                  Create the first post
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="font-medium">
                <Link href="/admin/news">
                  <X />
                  Clear filter
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((post) => {
            const coverUrl = signedUrlByPostId.get(post.id);
            return (
              <li key={post.id}>
                <article className="border-ink/15 hover:border-ink/40 grid gap-4 rounded-md border p-4 transition-colors sm:grid-cols-[200px_1fr]">
                  <div className="bg-paper-2 border-ink/15 relative flex aspect-video items-center justify-center overflow-hidden rounded-md border">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={`Cover for ${post.title}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 200px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="text-ink-faint size-8" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_BADGE_VARIANT[post.status]}>
                        {NEWS_STATUS_LABELS[post.status]}
                      </Badge>
                      <Badge variant="outline">{NEWS_VISIBILITY_LABELS[post.visibility]}</Badge>
                      <Badge variant="outline">{NEWS_CATEGORY_LABELS[post.category]}</Badge>
                      {post.pinned && (
                        <Badge variant="success" className="inline-flex items-center gap-1">
                          <Pin className="size-3" aria-hidden="true" />
                          Pinned
                        </Badge>
                      )}
                    </div>

                    <Link
                      href={`/admin/news/${post.id}`}
                      className="text-ink hover:text-rust focus-visible:ring-rust/40 font-display rounded text-lg leading-snug font-semibold break-words outline-none focus-visible:ring-2"
                    >
                      {post.title}
                    </Link>

                    {post.excerpt && (
                      <p className="text-ink-soft line-clamp-2 text-sm break-words italic">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="text-ink-faint mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                      <span>{post.authorName}</span>
                      {post.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Published {format(post.publishedAt, 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Link
                        href={`/admin/news/${post.id}`}
                        aria-label={`Open ${post.title}`}
                        className="border-ink/30 text-ink hover:bg-paper-2 focus-visible:ring-rust/40 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs outline-none focus-visible:ring-2"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/admin/news/${post.id}/edit`}
                        aria-label={`Edit ${post.title}`}
                        className="border-ink/30 text-ink hover:bg-paper-2 focus-visible:ring-rust/40 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs outline-none focus-visible:ring-2"
                      >
                        <Edit3 className="size-3" />
                        Edit
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
