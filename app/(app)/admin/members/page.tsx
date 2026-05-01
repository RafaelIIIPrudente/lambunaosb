import 'server-only';

import Image from 'next/image';
import Link from 'next/link';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { ArrowRight, Edit3, Eye, Plus } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { sbMembers } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';
import { cn } from '@/lib/utils';
import { MEMBER_POSITION_LABELS } from '@/lib/validators/member';

export const metadata = { title: 'SB Members' };

export default async function MembersAdminPage() {
  const tenantId = await getCurrentTenantId();
  // Local query (not via getActiveMembers) so the admin list shows inactive
  // members too — only archived (deletedAt) rows are excluded.
  const rows = await db
    .select()
    .from(sbMembers)
    .where(and(eq(sbMembers.tenantId, tenantId), isNull(sbMembers.deletedAt)))
    .orderBy(asc(sbMembers.sortOrder), asc(sbMembers.fullName));

  // Generate signed URLs in parallel only for members with portraits.
  const adminClient = createAdminClient();
  const signedUrlByMemberId = new Map<string, string>();
  await Promise.all(
    rows
      .filter((m) => m.photoStoragePath)
      .map(async (m) => {
        const url = await getCompressedImageUrl({
          supabase: adminClient,
          bucket: 'members-portraits',
          prefix: m.photoStoragePath,
          size: pickSizeForSurface('thumb'),
        });
        if (url) signedUrlByMemberId.set(m.id, url);
      }),
  );

  const activeCount = rows.filter((r) => r.active).length;
  const total = rows.length;

  return (
    <div>
      <AdminPageHeader
        title="SB Members"
        accessory={
          <Button className="font-script text-base" asChild>
            <Link href="/admin/members/new" aria-label="Add a new SB member">
              <Plus />
              Add member
            </Link>
          </Button>
        }
      />
      <p className="text-ink-faint -mt-4 mb-6 font-mono text-xs">
        {activeCount} of {total} active · roster sorted by sort order, then name
      </p>

      {rows.length === 0 ? (
        <Card className="max-w-xl">
          <CardEyebrow>Roster is empty</CardEyebrow>
          <CardTitle>No members on file yet.</CardTitle>
          <CardDescription>
            Run <code className="font-mono">pnpm db:seed</code> for the initial roster, or add
            members one by one from here.
          </CardDescription>
          <CardFooter>
            <Button asChild className="font-medium">
              <Link href="/admin/members/new">
                <Plus />
                Add the first member
                <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <ul className="flex flex-wrap gap-5">
          {rows.map((m) => {
            const initials = m.fullName
              .split(/\s+/)
              .map((p) => p.charAt(0))
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const portraitUrl = signedUrlByMemberId.get(m.id);
            return (
              <li key={m.id} className="w-full sm:w-[230px]">
                <article
                  className={cn(
                    'border-ink/15 hover:border-ink/40 flex flex-col rounded-md border p-4 transition-colors',
                    !m.active && 'opacity-70',
                  )}
                >
                  <div className="bg-paper-2 border-ink/15 relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border">
                    {portraitUrl ? (
                      <Image
                        src={portraitUrl}
                        alt={`Portrait of ${m.fullName}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="bg-paper border-ink/25 text-ink-soft font-script flex size-20 items-center justify-center rounded-full border text-2xl"
                      >
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-1 flex-col gap-1.5">
                    <h3 className="text-ink font-display text-base font-semibold">
                      {m.honorific} {m.fullName}
                    </h3>
                    <p className="text-rust font-mono text-[10px] tracking-[0.16em] uppercase">
                      {MEMBER_POSITION_LABELS[m.position]} · {m.termStartYear}–{m.termEndYear}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!m.active && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[9px]">
                          Inactive
                        </Badge>
                      )}
                      {!m.showOnPublic && (
                        <Badge variant="warn" className="h-5 px-1.5 text-[9px]">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <div className="mt-auto flex gap-1.5 pt-2">
                      <Link
                        href={`/admin/members/${m.id}`}
                        aria-label={`Open ${m.fullName}`}
                        className="border-ink/30 text-ink hover:bg-paper-2 focus-visible:ring-rust/40 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs outline-none focus-visible:ring-2"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/admin/members/${m.id}/edit`}
                        aria-label={`Edit ${m.fullName}`}
                        className="border-ink/30 text-ink hover:bg-paper-2 focus-visible:ring-rust/40 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs outline-none focus-visible:ring-2"
                      >
                        <Edit3 className="size-3" />
                        Edit
                      </Link>
                      {m.showOnPublic && m.active && (
                        <Link
                          href={`/members/${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open public profile of ${m.fullName}`}
                          className="border-ink/30 text-ink hover:bg-paper-2 focus-visible:ring-rust/40 font-script rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 text-xs outline-none focus-visible:ring-2"
                        >
                          <Eye className="size-3" />
                          Public
                        </Link>
                      )}
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
