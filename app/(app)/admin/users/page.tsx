import 'server-only';

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';
import { getUsers, getUserStatusCounts } from '@/lib/db/queries/users';
import { createAdminClient } from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';
import {
  parseCursor,
  parseUserSearchParams,
  type UserActivityFilter,
  type UserFilterInput,
  type UserInvitationFilter,
  USER_ACTIVITY_FILTERS,
  USER_ACTIVITY_LABELS,
  USER_INVITATION_FILTERS,
  USER_INVITATION_LABELS,
  USER_ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from '@/lib/validators/user';

import { InviteUserDialog } from './_invite-dialog';
import { UserRowActions } from './_row-actions';

export const metadata = { title: 'Users & roles' };

const MEMBER_PHOTO_BUCKET = 'sb-member-photos';
const MEMBER_PHOTO_TTL_SECONDS = 60 * 60;

const ROLE_BADGE_VARIANT: Record<UserRole, 'success' | 'outline' | 'warn' | 'destructive' | 'new'> =
  {
    secretary: 'destructive',
    mayor: 'warn',
    vice_mayor: 'warn',
    sb_member: 'outline',
    skmf_president: 'outline',
    liga_president: 'outline',
    other_lgu: 'outline',
    pending: 'new',
  };

function buildHref(base: UserFilterInput, patch: Partial<UserFilterInput>): string {
  const next = { ...base, ...patch };
  const params = new URLSearchParams();
  if (next.role) params.set('role', next.role);
  if (next.activity !== 'all') params.set('activity', next.activity);
  if (next.invitation !== 'all') params.set('invitation', next.invitation);
  if (next.q) params.set('q', next.q);
  if (next.cursor) params.set('cursor', next.cursor);
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : '/admin/users';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    activity?: string;
    invitation?: string;
    q?: string;
    cursor?: string;
  }>;
}) {
  const ctx = await requireUser();
  if (ctx.profile.role !== 'secretary') {
    redirect('/admin/dashboard');
  }

  const params = await searchParams;
  const filters = parseUserSearchParams(params);
  const cursorDate = parseCursor(filters.cursor ?? undefined);

  const [{ rows, nextCursor }, statusCounts] = await Promise.all([
    getUsers({
      role: filters.role,
      activity: filters.activity,
      invitation: filters.invitation,
      q: filters.q,
      cursor: cursorDate,
    }),
    getUserStatusCounts(),
  ]);

  const adminClient = createAdminClient();
  const photoUrlByMemberPath = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.memberPhotoPath)
      .map(async (r) => {
        if (!r.memberPhotoPath) return;
        const { data } = await adminClient.storage
          .from(MEMBER_PHOTO_BUCKET)
          .createSignedUrl(r.memberPhotoPath, MEMBER_PHOTO_TTL_SECONDS);
        if (data?.signedUrl) photoUrlByMemberPath.set(r.memberPhotoPath, data.signedUrl);
      }),
  );

  const hasFilters =
    filters.role !== null ||
    filters.activity !== 'all' ||
    filters.invitation !== 'all' ||
    filters.q !== null;

  const roleOptions: { value: UserRole | 'all'; label: string }[] = [
    { value: 'all', label: 'All roles' },
    ...USER_ROLES.map((r) => ({ value: r, label: USER_ROLE_LABELS[r] })),
  ];

  const activityOptions: { value: UserActivityFilter; label: string }[] = USER_ACTIVITY_FILTERS.map(
    (a) => ({ value: a, label: USER_ACTIVITY_LABELS[a] }),
  );

  const invitationOptions: { value: UserInvitationFilter; label: string }[] =
    USER_INVITATION_FILTERS.map((i) => ({ value: i, label: USER_INVITATION_LABELS[i] }));

  return (
    <div>
      <AdminPageHeader
        title="Users & roles"
        accessory={
          <div className="flex items-center gap-3">
            <span className="text-ink-faint font-mono text-[11px] tracking-wide">
              {statusCounts.pendingApproval > 0 && (
                <Link
                  href="/admin/users?invitation=pending_approval"
                  className="text-rust mr-3 font-semibold hover:underline"
                >
                  {statusCounts.pendingApproval} awaiting approval ·
                </Link>
              )}
              {statusCounts.pending > 0 && (
                <span className="text-ink-soft mr-3">{statusCounts.pending} invite-pending ·</span>
              )}
              {statusCounts.active} active · {statusCounts.inactive} inactive
            </span>
            <InviteUserDialog />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col gap-6">
          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Role
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {roleOptions.map((opt) => {
                const active =
                  opt.value === 'all' ? filters.role === null : filters.role === opt.value;
                return (
                  <li key={opt.value}>
                    <Link
                      href={buildHref(filters, {
                        role: opt.value === 'all' ? null : opt.value,
                        cursor: null,
                      })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'hover:bg-paper-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                        active ? 'bg-paper-2 text-ink' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      <span className="font-script text-base">{opt.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Activity
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {activityOptions.map((opt) => {
                const active = filters.activity === opt.value;
                return (
                  <li key={opt.value}>
                    <Link
                      href={buildHref(filters, { activity: opt.value, cursor: null })}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'rounded-pill focus-visible:ring-rust/40 inline-flex h-7 items-center border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2',
                        active
                          ? 'bg-rust border-rust text-paper'
                          : 'border-ink/30 text-ink-soft hover:border-ink',
                      )}
                    >
                      {opt.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-ink-faint mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Invitation
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {invitationOptions.map((opt) => {
                const active = filters.invitation === opt.value;
                return (
                  <li key={opt.value}>
                    <Link
                      href={buildHref(filters, { invitation: opt.value, cursor: null })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'hover:bg-paper-2 flex w-full items-center rounded-md px-2 py-1.5 transition-colors',
                        active ? 'bg-paper-2 text-ink' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      <span className="font-script text-base">{opt.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <form action="/admin/users" method="get" className="flex items-center gap-2">
            {filters.role && <input type="hidden" name="role" value={filters.role} />}
            {filters.activity !== 'all' && (
              <input type="hidden" name="activity" value={filters.activity} />
            )}
            {filters.invitation !== 'all' && (
              <input type="hidden" name="invitation" value={filters.invitation} />
            )}
            <div className="relative flex-1">
              <Search
                className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={filters.q ?? ''}
                placeholder="Search by name or email…"
                aria-label="Search users"
                className="border-ink/20 bg-paper text-ink placeholder:text-ink-faint focus-visible:border-rust focus-visible:ring-rust/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="font-medium">
              Search
            </Button>
            {hasFilters && (
              <Button asChild type="button" variant="ghost" size="sm" className="font-medium">
                <Link href="/admin/users">
                  <X />
                  Clear
                </Link>
              </Button>
            )}
          </form>

          {rows.length === 0 ? (
            <Card className="max-w-xl">
              <CardEyebrow>{hasFilters ? 'No matches' : 'No users yet'}</CardEyebrow>
              <CardTitle>
                {hasFilters
                  ? 'No users match these filters.'
                  : 'No admin users have been invited yet.'}
              </CardTitle>
              <CardDescription>
                {hasFilters
                  ? 'Try widening the role or activity filters, or clearing the search.'
                  : 'Invite the Mayor, Vice Mayor, SB members, and any other LGU contacts to get started. Each person sets their own password from a magic link.'}
              </CardDescription>
              {hasFilters && (
                <CardFooter>
                  <Button asChild variant="outline" className="font-medium">
                    <Link href="/admin/users">
                      <X />
                      Clear filters
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ) : (
            <>
              <ul
                aria-label="Admin users"
                className="border-ink/15 divide-ink/10 flex flex-col divide-y rounded-md border"
              >
                {rows.map((row) => {
                  const isSelf = row.id === ctx.userId;
                  const photoUrl = row.memberPhotoPath
                    ? photoUrlByMemberPath.get(row.memberPhotoPath)
                    : null;
                  const hasSignedIn = row.lastSignInAt !== null;
                  const statusBadge: { label: string; variant: 'success' | 'warn' | 'outline' } =
                    !row.active
                      ? { label: 'Inactive', variant: 'outline' }
                      : hasSignedIn
                        ? { label: 'Active', variant: 'success' }
                        : { label: 'Pending invite', variant: 'warn' };
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        'transition-colors',
                        !row.active && 'bg-paper-2/40',
                        row.active && !hasSignedIn && 'bg-rust/5',
                      )}
                    >
                      <div className="grid items-center gap-3 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] sm:gap-4 sm:px-4">
                        <span className="bg-paper-3 border-ink/15 relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                          {photoUrl ? (
                            <Image
                              src={photoUrl}
                              alt=""
                              fill
                              sizes="36px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="text-ink-soft font-mono text-[10px] font-semibold"
                            >
                              {initials(row.fullName)}
                            </span>
                          )}
                        </span>

                        <div className="flex min-w-0 flex-col">
                          <span className="text-ink truncate font-medium">
                            {row.fullName}
                            {isSelf && (
                              <span className="text-ink-faint ml-2 font-mono text-[10px] tracking-wide uppercase">
                                You
                              </span>
                            )}
                          </span>
                          <span
                            className="text-ink-faint truncate font-mono text-[11px]"
                            title={row.email}
                          >
                            {row.email}
                          </span>
                          {row.memberName && (
                            <span className="text-ink-faint font-mono text-[10px] italic">
                              Linked to {row.memberName}
                            </span>
                          )}
                        </div>

                        <Badge variant={ROLE_BADGE_VARIANT[row.role]}>
                          {USER_ROLE_LABELS[row.role]}
                        </Badge>

                        <Badge variant={statusBadge.variant}>
                          <span className="sr-only">Status: </span>
                          {statusBadge.label}
                        </Badge>

                        <span
                          className="text-ink-faint font-mono text-[11px] whitespace-nowrap tabular-nums"
                          title={
                            row.lastSignInAt ? format(row.lastSignInAt, 'PPpp') : 'Never signed in'
                          }
                        >
                          {row.lastSignInAt ? (
                            <time dateTime={row.lastSignInAt.toISOString()}>
                              {formatDistanceToNowStrict(row.lastSignInAt, { addSuffix: true })}
                            </time>
                          ) : (
                            '—'
                          )}
                        </span>

                        {isSelf ? (
                          <span className="text-ink-faint w-32 text-right font-mono text-[10px] italic">
                            (your account)
                          </span>
                        ) : (
                          <UserRowActions
                            userId={row.id}
                            fullName={row.fullName}
                            email={row.email}
                            role={row.role}
                            active={row.active}
                            hasSignedIn={hasSignedIn}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {(filters.cursor || nextCursor) && (
                <nav
                  aria-label="Pagination"
                  className="mt-3 flex items-center justify-between gap-2"
                >
                  {filters.cursor ? (
                    <Button asChild variant="ghost" size="sm" className="font-medium">
                      <Link
                        href={buildHref(filters, { cursor: null })}
                        aria-label="Jump to the most recent page"
                      >
                        <ArrowLeft />
                        First page
                      </Link>
                    </Button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  {nextCursor ? (
                    <Button asChild variant="outline" size="sm" className="font-medium">
                      <Link
                        href={buildHref(filters, { cursor: nextCursor })}
                        aria-label="Load older users"
                      >
                        Older users
                        <ArrowRight />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-ink-faint font-mono text-[11px] italic">
                      End of results
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
