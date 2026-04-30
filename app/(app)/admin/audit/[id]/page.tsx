import 'server-only';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, ArrowLeft, ChevronRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/require-user';
import { getAuditEntryById } from '@/lib/db/queries/audit';
import { SB_MEMBER_TIER_ROLES } from '@/lib/validators/user';
import {
  AUDIT_CATEGORY_LABELS,
  type AuditCategoryValue,
  targetTypeLabel,
} from '@/lib/validators/audit';

import { MetadataRenderer } from './_metadata-renderer';

export const metadata = { title: 'Audit entry' };

const CATEGORY_BADGE_VARIANT: Record<
  AuditCategoryValue,
  'success' | 'outline' | 'warn' | 'destructive' | 'new'
> = {
  resolution: 'success',
  meeting: 'success',
  query: 'outline',
  user: 'warn',
  member: 'outline',
  news: 'new',
  security: 'destructive',
  system: 'outline',
};

const ROLE_LABELS: Record<string, string> = {
  secretary: 'Secretary',
  vice_mayor: 'Vice Mayor',
  mayor: 'Mayor',
  sb_member: 'SB Member',
};

const TARGET_DEEP_LINKS: Partial<Record<string, (id: string) => string>> = {
  resolution: (id) => `/admin/resolutions/${id}`,
  news_post: (id) => `/admin/news/${id}`,
  citizen_query: (id) => `/admin/queries/${id}`,
  sb_member: (id) => `/admin/members/${id}`,
};

export default async function AuditEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireUser();
  if ((SB_MEMBER_TIER_ROLES as readonly string[]).includes(ctx.profile.role)) {
    redirect('/admin/dashboard');
  }

  const entry = await getAuditEntryById(id);
  if (!entry) notFound();

  const deepLink = TARGET_DEEP_LINKS[entry.targetType]?.(entry.targetId);

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-4 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/audit" className="hover:text-rust">
          Audit log
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink line-clamp-1">{entry.action}</span>
      </nav>

      <AdminPageHeader
        title={entry.action}
        accessory={
          <span className="text-ink-faint font-mono text-[11px] tracking-wide">
            <time dateTime={entry.createdAt.toISOString()} title={format(entry.createdAt, 'PPpp')}>
              {formatDistanceToNowStrict(entry.createdAt, { addSuffix: true })}
            </time>
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <Badge variant={CATEGORY_BADGE_VARIANT[entry.category]}>
          {AUDIT_CATEGORY_LABELS[entry.category]}
        </Badge>
        <Badge variant="outline">{targetTypeLabel(entry.targetType)}</Badge>
        {entry.alert && (
          <Badge
            variant="warn"
            className="inline-flex items-center gap-1"
            aria-label="High-severity event"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            Alert
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata
            </p>
            <MetadataRenderer metadata={entry.metadata} />
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Target
            </p>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Type</dt>
              <dd className="font-mono">{targetTypeLabel(entry.targetType)}</dd>
              <dt className="text-ink-faint">ID</dt>
              <dd className="font-mono break-all">{entry.targetId}</dd>
            </dl>
            {deepLink && (
              <Button asChild variant="outline" size="sm" className="mt-3 font-medium">
                <Link href={deepLink}>
                  Open {targetTypeLabel(entry.targetType).toLowerCase()}
                  <ChevronRight />
                </Link>
              </Button>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Actor
            </p>
            <dl className="text-ink-soft grid grid-cols-[90px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Name</dt>
              <dd>
                {entry.actorName ?? (entry.actorId ? '(deleted user)' : 'System / anonymous')}
              </dd>
              {entry.actorRole && (
                <>
                  <dt className="text-ink-faint">Role</dt>
                  <dd>{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</dd>
                </>
              )}
              {entry.actorId && (
                <>
                  <dt className="text-ink-faint">User ID</dt>
                  <dd className="font-mono break-all">{entry.actorId}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Request
            </p>
            <dl className="text-ink-soft grid grid-cols-[90px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Recorded</dt>
              <dd className="font-mono">{format(entry.createdAt, 'MMM d, yyyy · h:mm a')}</dd>
              {entry.ipInet && (
                <>
                  <dt className="text-ink-faint">IP</dt>
                  <dd className="font-mono break-all">{entry.ipInet}</dd>
                </>
              )}
              {entry.userAgent && (
                <>
                  <dt className="text-ink-faint">Agent</dt>
                  <dd className="font-mono break-all">{entry.userAgent}</dd>
                </>
              )}
              {entry.sessionId && (
                <>
                  <dt className="text-ink-faint">Session</dt>
                  <dd className="font-mono break-all">{entry.sessionId}</dd>
                </>
              )}
            </dl>
          </section>

          <Button asChild variant="ghost" size="sm" className="font-medium">
            <Link href="/admin/audit">
              <ArrowLeft />
              Back to audit log
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
