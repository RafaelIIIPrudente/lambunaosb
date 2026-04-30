import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ChevronRight, Mail, MailX } from 'lucide-react';

import { markCitizenQueryViewed } from '@/app/_actions/citizen-queries';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/auth/require-user';
import { env } from '@/env';
import {
  getAdminAssigneeOptions,
  getCitizenQueryById,
  getCitizenQueryReplies,
} from '@/lib/db/queries/citizen-queries';
import type { CitizenQueryStatus } from '@/lib/db/queries/citizen-queries';
import { CITIZEN_QUERY_CATEGORY_LABELS } from '@/lib/validators/citizen-query';
import { CITIZEN_QUERY_STATUS_LABELS } from '@/lib/validators/citizen-query-admin';

import { AssignPanel } from './_assign-panel';
import { ReplyForm } from './_reply-form';
import { StatusPanel } from './_status-panel';
import { TagsEditor } from './_tags-editor';

export const metadata = { title: 'Citizen query' };

const STATUS_BADGE_VARIANT: Record<
  CitizenQueryStatus,
  'new' | 'outline' | 'success' | 'warn' | 'destructive'
> = {
  new: 'new',
  in_progress: 'warn',
  awaiting_citizen: 'outline',
  answered: 'success',
  closed: 'outline',
  spam: 'destructive',
};

const ARCHIVE_ROLES = new Set(['secretary']);
const REPLIES_LOCKED: Partial<Record<CitizenQueryStatus, string>> = {
  spam: 'This query is marked as spam — replies are disabled.',
  closed: 'This query is closed. Reopen it (set status to In progress) to send another reply.',
};

export default async function QueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  const query = await getCitizenQueryById(id);
  if (!query) notFound();

  if (query.status === 'new') {
    await markCitizenQueryViewed({ queryId: id });
  }

  const [replies, assigneeOptions] = await Promise.all([
    getCitizenQueryReplies(id),
    getAdminAssigneeOptions(),
  ]);

  const canArchive = ARCHIVE_ROLES.has(ctx.profile.role);
  const emailEnabled = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
  const replyDisabledReason = REPLIES_LOCKED[query.status];

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-4 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/queries" className="hover:text-rust">
          Citizen queries
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink line-clamp-1">{query.subject}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink-faint mb-1 font-mono text-[11px] tracking-wide">{query.ref}</p>
            <h1 className="text-ink font-display text-2xl leading-tight font-semibold">
              {query.subject}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={STATUS_BADGE_VARIANT[query.status]}>
              {CITIZEN_QUERY_STATUS_LABELS[query.status]}
            </Badge>
            <Badge variant="outline">{CITIZEN_QUERY_CATEGORY_LABELS[query.category]}</Badge>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <article className="border-ink/15 rounded-md border p-5">
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-ink font-medium">{query.submitterName}</p>
                <p className="text-ink-faint font-mono text-[11px]">
                  <a href={`mailto:${query.submitterEmail}`} className="hover:text-rust">
                    {query.submitterEmail}
                  </a>
                  {' · '}
                  <span title={format(query.submittedAt, 'PPpp')}>
                    {formatDistanceToNowStrict(query.submittedAt, { addSuffix: true })}
                  </span>
                </p>
              </div>
            </header>
            <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-wrap">
              {query.messageMd}
            </p>
          </article>

          {replies.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Reply thread · {replies.length}
              </p>
              <ol className="flex flex-col gap-3">
                {replies.map((reply) => (
                  <li key={reply.id}>
                    <article className="border-ink/15 bg-paper-2/40 rounded-md border p-5">
                      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-ink font-medium">
                          {reply.authorName ?? 'Office of the Sanggunian'}
                        </p>
                        <p className="text-ink-faint font-mono text-[11px]">
                          {reply.resendMessageId ? (
                            <span
                              className="inline-flex items-center gap-1"
                              title={`Email sent · Resend id ${reply.resendMessageId}`}
                            >
                              <Mail className="size-3" aria-hidden="true" />
                              Sent via email
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1"
                              title="Email not delivered (Resend not configured at the time)"
                            >
                              <MailX className="size-3" aria-hidden="true" />
                              Recorded only
                            </span>
                          )}
                          {' · '}
                          <span title={format(reply.sentAt, 'PPpp')}>
                            {formatDistanceToNowStrict(reply.sentAt, { addSuffix: true })}
                          </span>
                        </p>
                      </header>
                      <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-wrap">
                        {reply.bodyMd}
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <ReplyForm
            queryId={query.id}
            recipientEmail={query.submitterEmail}
            recipientName={query.submitterName}
            emailEnabled={emailEnabled}
            disabled={Boolean(replyDisabledReason)}
            disabledReason={replyDisabledReason}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <StatusPanel queryId={query.id} currentStatus={query.status} canArchive={canArchive} />

          <AssignPanel
            queryId={query.id}
            currentAssigneeId={query.assignedTo}
            options={assigneeOptions}
          />

          <TagsEditor queryId={query.id} initialTags={query.tags} />

          <section className="border-ink/15 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Submission metadata
            </p>
            <dl className="text-ink-soft grid grid-cols-[110px_1fr] gap-y-2 text-xs">
              <dt className="text-ink-faint">Submitted</dt>
              <dd className="font-mono">{format(query.submittedAt, 'MMM d, yyyy · h:mm a')}</dd>
              {query.acknowledgedAt && (
                <>
                  <dt className="text-ink-faint">First viewed</dt>
                  <dd className="font-mono">
                    {format(query.acknowledgedAt, 'MMM d, yyyy · h:mm a')}
                  </dd>
                </>
              )}
              {query.answeredAt && (
                <>
                  <dt className="text-ink-faint">Last reply</dt>
                  <dd className="font-mono">{format(query.answeredAt, 'MMM d, yyyy · h:mm a')}</dd>
                </>
              )}
              {query.closedAt && (
                <>
                  <dt className="text-ink-faint">Closed</dt>
                  <dd className="font-mono">{format(query.closedAt, 'MMM d, yyyy · h:mm a')}</dd>
                </>
              )}
              {query.ipInet && (
                <>
                  <dt className="text-ink-faint">IP</dt>
                  <dd className="font-mono break-all">{query.ipInet}</dd>
                </>
              )}
              {query.turnstileScore !== null && (
                <>
                  <dt className="text-ink-faint">Turnstile</dt>
                  <dd className="font-mono">{query.turnstileScore}</dd>
                </>
              )}
              {query.honeypotTripped && (
                <>
                  <dt className="text-ink-faint">Honeypot</dt>
                  <dd className="text-warn font-mono">Tripped: {query.honeypotTripped}</dd>
                </>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
