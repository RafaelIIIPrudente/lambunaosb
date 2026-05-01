import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { diffLines } from 'diff';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getResolutionById, getResolutionVersionById } from '@/lib/db/queries/resolutions';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Compare resolution versions' };

type DiffPart = { value: string; added?: boolean; removed?: boolean };

function splitParts(parts: DiffPart[]): {
  lines: { kind: 'add' | 'remove' | 'unchanged'; text: string }[];
  added: number;
  removed: number;
} {
  const lines: { kind: 'add' | 'remove' | 'unchanged'; text: string }[] = [];
  let added = 0;
  let removed = 0;
  for (const part of parts) {
    const kind: 'add' | 'remove' | 'unchanged' = part.added
      ? 'add'
      : part.removed
        ? 'remove'
        : 'unchanged';
    const partLines = part.value.replace(/\n$/, '').split('\n');
    for (const line of partLines) {
      lines.push({ kind, text: line });
      if (kind === 'add') added++;
      if (kind === 'remove') removed++;
    }
  }
  return { lines, added, removed };
}

export default async function CompareVersionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;

  const resolution = await safeBuildtimeQuery(() => getResolutionById(id), null);
  if (!resolution) notFound();

  if (!from || !to) {
    return <MissingParamsCard resolutionId={resolution.id} resolutionNumber={resolution.number} />;
  }

  const [fromVersion, toVersion] = await Promise.all([
    safeBuildtimeQuery(() => getResolutionVersionById(resolution.id, from), null),
    safeBuildtimeQuery(() => getResolutionVersionById(resolution.id, to), null),
  ]);

  if (!fromVersion || !toVersion) {
    notFound();
  }

  const sameVersion = fromVersion.id === toVersion.id;
  const parts = sameVersion
    ? []
    : (diffLines(fromVersion.bodyMdSnapshot, toVersion.bodyMdSnapshot) as DiffPart[]);
  const { lines, added, removed } = splitParts(parts);

  // Order display: lower version on the left, higher on the right.
  const [leftVersion, rightVersion] =
    fromVersion.versionNumber <= toVersion.versionNumber
      ? [fromVersion, toVersion]
      : [toVersion, fromVersion];

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
        <Link href={`/admin/resolutions/${resolution.id}/history`} className="hover:text-rust">
          Version history
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">Compare</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink font-script text-3xl leading-tight">Compare versions</h1>
          <p className="text-ink-soft mt-1 text-sm italic">
            {resolution.number} · {resolution.title}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="font-medium">
          <Link href={`/admin/resolutions/${resolution.id}/history`}>
            <ArrowLeft />
            Back to history
          </Link>
        </Button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <VersionHeader label="Base" version={leftVersion} />
        <VersionHeader label="Compared" version={rightVersion} />
      </div>

      {sameVersion ? (
        <Card>
          <CardEyebrow>No diff</CardEyebrow>
          <CardTitle>You picked the same version on both sides.</CardTitle>
          <CardDescription>
            Pick a different version to compare against — the body snapshots are identical.
          </CardDescription>
        </Card>
      ) : (
        <>
          <div className="text-ink-faint mb-3 flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <Badge variant="success">+{added} lines</Badge>
            <Badge variant="destructive">−{removed} lines</Badge>
            {added === 0 && removed === 0 && (
              <span className="italic">No body content changed between these versions.</span>
            )}
          </div>

          {added === 0 && removed === 0 ? null : (
            <pre className="border-ink/15 bg-paper-2/40 max-h-[70vh] overflow-auto rounded-md border text-xs leading-relaxed">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2 px-3 py-0.5',
                    line.kind === 'add' && 'bg-success/12 text-ink',
                    line.kind === 'remove' && 'bg-destructive/12 text-ink',
                    line.kind === 'unchanged' && 'text-ink-soft',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'text-ink-faint w-3 shrink-0 font-mono select-none',
                      line.kind === 'add' && 'text-success font-semibold',
                      line.kind === 'remove' && 'text-destructive font-semibold',
                    )}
                  >
                    {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
                  </span>
                  <span className="font-mono break-words whitespace-pre-wrap">
                    {line.text || ' '}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

function VersionHeader({
  label,
  version,
}: {
  label: string;
  version: { versionNumber: number; label: string; createdAt: Date };
}) {
  return (
    <div className="border-ink/15 rounded-md border p-4">
      <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-ink font-script mt-1 text-lg">v{version.versionNumber}</p>
      <p className="text-ink-soft text-xs italic">{version.label}</p>
      <p className="text-ink-faint mt-1 font-mono text-[11px]">
        {format(version.createdAt, 'MMM d, yyyy · h:mm a')}
      </p>
    </div>
  );
}

function MissingParamsCard({
  resolutionId,
  resolutionNumber,
}: {
  resolutionId: string;
  resolutionNumber: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardEyebrow>Pick two versions</CardEyebrow>
        <CardTitle>Choose which versions to compare.</CardTitle>
        <CardDescription>
          Open the version history for {resolutionNumber} and pick a base + compared version from
          the dropdowns.
        </CardDescription>
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link href={`/admin/resolutions/${resolutionId}/history`}>
              <ArrowLeft />
              Open version history
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
