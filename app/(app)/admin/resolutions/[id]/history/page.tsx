import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { inArray } from 'drizzle-orm';
import { ArrowLeft, ChevronRight, GitCompareArrows } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getResolutionById, getResolutionVersions } from '@/lib/db/queries/resolutions';
import { profiles } from '@/lib/db/schema';

export const metadata = { title: 'Resolution version history' };

export default async function ResolutionHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const resolution = await safeBuildtimeQuery(() => getResolutionById(id), null);
  if (!resolution) notFound();

  const versions = await safeBuildtimeQuery(() => getResolutionVersions(resolution.id), []);
  const orderedVersions = [...versions].reverse();

  const authorIds = Array.from(
    new Set(orderedVersions.map((v) => v.authorId).filter((x): x is string => x !== null)),
  );
  const authors =
    authorIds.length > 0
      ? await safeBuildtimeQuery(
          () =>
            db
              .select({ id: profiles.id, fullName: profiles.fullName, role: profiles.role })
              .from(profiles)
              .where(inArray(profiles.id, authorIds)),
          [] as { id: string; fullName: string; role: string }[],
        )
      : [];
  const authorById = new Map(authors.map((a) => [a.id, a]));

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-2 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/resolutions" className="hover:text-rust">
          Resolutions
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link href={`/admin/resolutions/${resolution.id}`} className="hover:text-rust">
          {resolution.number}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Version history</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink font-script text-3xl leading-tight">Version history</h1>
          <p className="text-ink-soft mt-1 text-sm italic">
            {resolution.number} · {resolution.title}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="font-medium">
          <Link href={`/admin/resolutions/${resolution.id}`}>
            <ArrowLeft />
            Back to resolution
          </Link>
        </Button>
      </header>

      {orderedVersions.length === 0 ? (
        <Card className="max-w-xl">
          <CardEyebrow>No versions yet</CardEyebrow>
          <CardTitle>No version snapshots have been recorded.</CardTitle>
          <CardDescription>
            Snapshots are written automatically every time the resolution moves through a workflow
            step (filed, advanced, approved, published, withdrawn, archived).
          </CardDescription>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link href={`/admin/resolutions/${resolution.id}`}>
                <ArrowLeft />
                Back to resolution
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {orderedVersions.length >= 2 && (
            <form
              method="GET"
              action={`/admin/resolutions/${resolution.id}/compare`}
              className="border-ink/15 mb-5 flex flex-wrap items-end gap-3 rounded-md border p-4"
              aria-label="Compare two versions"
            >
              <fieldset className="grow">
                <legend className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Base version
                </legend>
                <select
                  name="from"
                  required
                  defaultValue={orderedVersions[orderedVersions.length - 1]?.id ?? ''}
                  aria-label="Base version"
                  className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 mt-1 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  {orderedVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {v.label}
                    </option>
                  ))}
                </select>
              </fieldset>
              <fieldset className="grow">
                <legend className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Compared with
                </legend>
                <select
                  name="to"
                  required
                  defaultValue={orderedVersions[0]?.id ?? ''}
                  aria-label="Compared version"
                  className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 mt-1 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  {orderedVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {v.label}
                    </option>
                  ))}
                </select>
              </fieldset>
              <Button type="submit" variant="outline" className="font-medium">
                <GitCompareArrows />
                Compare
              </Button>
            </form>
          )}

          <ol className="flex flex-col gap-3">
            {orderedVersions.map((v, i) => {
              const author = v.authorId ? authorById.get(v.authorId) : null;
              const isCurrent = i === 0;
              return (
                <li key={v.id}>
                  <article className="border-ink/15 rounded-md border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-ink font-script text-lg leading-tight">
                          v{v.versionNumber} · {v.label}
                        </p>
                        <p className="text-ink-soft mt-1 font-mono text-xs">
                          {format(v.createdAt, 'MMM d, yyyy · h:mm a')}
                          {author && (
                            <>
                              {' · '}by {author.fullName}{' '}
                              <span className="text-ink-faint">({author.role})</span>
                            </>
                          )}
                        </p>
                      </div>
                      {isCurrent && <Badge variant="success">Current</Badge>}
                    </div>
                    {v.bodyMdSnapshot.trim().length > 0 && (
                      <details className="mt-4">
                        <summary className="text-rust focus-visible:ring-rust/40 cursor-pointer rounded font-mono text-[11px] font-medium tracking-[0.18em] uppercase outline-none focus-visible:ring-2">
                          View body snapshot
                        </summary>
                        <pre className="border-ink/15 bg-paper-2/40 text-ink mt-3 max-h-96 overflow-auto rounded border p-4 text-xs whitespace-pre-wrap">
                          {v.bodyMdSnapshot}
                        </pre>
                      </details>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
