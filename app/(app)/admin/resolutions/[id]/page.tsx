import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { inArray } from 'drizzle-orm';
import { ChevronRight, History } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getMeetingById } from '@/lib/db/queries/meetings';
import { getResolutionById, getResolutionVersions } from '@/lib/db/queries/resolutions';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { sbMembers } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { RESOLUTION_STATUS_LABELS, RESOLUTION_TYPE_LABELS } from '@/lib/validators/resolution';

import { ResolutionActionsBar } from './_actions-bar';
import { PdfSection } from './_pdf-section';

const PDF_BUCKET = 'resolutions-pdfs';
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60;
const AUTHOR_ROLES = ['secretary', 'mayor', 'vice_mayor', 'sb_member'] as const;

export const metadata = { title: 'Resolution detail' };

const STATUS_BADGE_VARIANT = {
  draft: 'warn',
  pending: 'outline',
  approved: 'success',
  withdrawn: 'destructive',
  published: 'success',
} as const;

export default async function ResolutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireUser();

  const resolution = await getResolutionById(id);
  if (!resolution) notFound();

  const [versions, meeting, coSponsors, tenantId, signedDownloadUrl] = await Promise.all([
    getResolutionVersions(resolution.id),
    resolution.meetingId ? getMeetingById(resolution.meetingId) : Promise.resolve(null),
    resolution.coSponsorIds.length > 0
      ? db
          .select({
            id: sbMembers.id,
            fullName: sbMembers.fullName,
            honorific: sbMembers.honorific,
          })
          .from(sbMembers)
          .where(inArray(sbMembers.id, resolution.coSponsorIds))
      : Promise.resolve([] as { id: string; fullName: string; honorific: string | null }[]),
    getCurrentTenantId(),
    resolution.pdfStoragePath
      ? createAdminClient()
          .storage.from(PDF_BUCKET)
          .createSignedUrl(resolution.pdfStoragePath, PDF_SIGNED_URL_TTL_SECONDS)
          .then((res) => res.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ]);

  const recentVersions = versions.slice(-5).reverse();
  const canUploadPdf = (AUTHOR_ROLES as readonly string[]).includes(ctx.profile.role);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="text-ink-faint mb-2 flex items-center gap-1.5 font-mono text-xs"
          >
            <Link href="/admin/resolutions" className="hover:text-rust">
              Resolutions
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span className="text-ink">{resolution.number}</span>
          </nav>
          <h1 className="text-ink font-script text-3xl leading-tight">{resolution.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[resolution.status]}>
              {RESOLUTION_STATUS_LABELS[resolution.status]}
            </Badge>
            <Badge variant="outline">{RESOLUTION_TYPE_LABELS[resolution.type]}</Badge>
            {resolution.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <ResolutionActionsBar
          resolutionId={resolution.id}
          status={resolution.status}
          userRole={ctx.profile.role}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <article className="border-ink/15 rounded-md border p-6">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Body
          </p>
          {resolution.bodyMd.trim().length > 0 ? (
            <div className="text-ink prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
              {resolution.bodyMd}
            </div>
          ) : (
            <p className="text-ink-faint font-mono text-xs">
              No body content yet. Edit the draft to add WHEREAS clauses and the resolved text.
            </p>
          )}
        </article>

        <aside className="flex flex-col gap-5">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata
            </p>
            <p className="text-ink font-mono text-xs">{resolution.number}</p>
            <hr className="border-ink/15 my-4 border-t border-dashed" />
            <dl className="text-ink-soft grid grid-cols-[110px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Sponsor</dt>
              <dd>
                {resolution.primarySponsor
                  ? `${resolution.primarySponsor.honorific} ${resolution.primarySponsor.fullName}`
                  : '—'}
              </dd>
              {coSponsors.length > 0 && (
                <>
                  <dt className="text-ink-faint">Co-sponsors</dt>
                  <dd>
                    {coSponsors.map((c) => `${c.honorific ?? 'Hon.'} ${c.fullName}`).join(', ')}
                  </dd>
                </>
              )}
              <dt className="text-ink-faint">Date filed</dt>
              <dd className="font-mono">{resolution.dateFiled ?? '—'}</dd>
              <dt className="text-ink-faint">1st reading</dt>
              <dd className="font-mono">{resolution.firstReadingAt ?? '—'}</dd>
              <dt className="text-ink-faint">2nd reading</dt>
              <dd className="font-mono">{resolution.secondReadingAt ?? '—'}</dd>
              {resolution.voteSummary && (
                <>
                  <dt className="text-ink-faint">Vote</dt>
                  <dd className="font-mono">{resolution.voteSummary}</dd>
                </>
              )}
              {resolution.publishedAt && (
                <>
                  <dt className="text-ink-faint">Published</dt>
                  <dd className="font-mono">
                    {format(resolution.publishedAt, 'MMM d, yyyy · h:mm a')}
                  </dd>
                </>
              )}
              {resolution.withdrawnAt && (
                <>
                  <dt className="text-ink-faint">Withdrawn</dt>
                  <dd className="font-mono">
                    {format(resolution.withdrawnAt, 'MMM d, yyyy · h:mm a')}
                  </dd>
                </>
              )}
              {meeting && (
                <>
                  <dt className="text-ink-faint">Linked meeting</dt>
                  <dd>
                    <Link
                      href={`/admin/meetings/${meeting.id}`}
                      className="text-rust hover:underline"
                    >
                      {meeting.title}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Signed PDF
            </p>
            <PdfSection
              resolutionId={resolution.id}
              tenantId={tenantId}
              pdfStoragePath={resolution.pdfStoragePath}
              pdfByteSize={resolution.pdfByteSize}
              pdfPageCount={resolution.pdfPageCount}
              signedDownloadUrl={signedDownloadUrl}
              canUpload={canUploadPdf}
            />
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Version history
              </p>
              <Button variant="ghost" size="sm" asChild className="font-mono text-[11px]">
                <Link
                  href={`/admin/resolutions/${resolution.id}/history`}
                  aria-label="Open full version history"
                >
                  <History className="size-3" />
                  All
                </Link>
              </Button>
            </div>
            {recentVersions.length === 0 ? (
              <p className="text-ink-faint font-mono text-xs">No version snapshots yet.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {recentVersions.map((v, i) => (
                  <li key={v.id} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${i === 0 ? 'bg-rust' : 'bg-ink-ghost'}`}
                    />
                    <div className="flex-1">
                      <p className="text-ink text-sm">
                        <span className="font-semibold">v{v.versionNumber}</span>
                        {i === 0 && <span className="text-rust ml-1 text-xs">· current</span>}
                      </p>
                      <p className="text-ink-soft mt-0.5 text-xs italic">
                        {format(v.createdAt, 'MMM d')} · {v.label}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
