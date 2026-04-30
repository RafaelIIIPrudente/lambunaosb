import 'server-only';

import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  resolutions,
  type Resolution,
  resolutionVersions,
  type ResolutionVersion,
  sbMembers,
} from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type ResolutionStatus = Resolution['status'];
export type ResolutionType = Resolution['type'];

export type ResolutionRowData = {
  id: string;
  number: string;
  title: string;
  type: ResolutionType;
  status: ResolutionStatus;
  primarySponsorName: string | null;
  coSponsorCount: number;
  dateFiled: string | null;
  publishedAt: Date | null;
};

export type GetResolutionsListOptions = {
  status?: ResolutionStatus;
  year?: number;
  publicOnly?: boolean;
  q?: string;
  primarySponsorId?: string;
};

export async function getResolutionsList(
  options: GetResolutionsListOptions = {},
): Promise<ResolutionRowData[]> {
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(resolutions.tenantId, tenantId), isNull(resolutions.deletedAt)];
  if (options.status) conditions.push(eq(resolutions.status, options.status));
  if (options.year) conditions.push(eq(resolutions.year, options.year));
  if (options.publicOnly) conditions.push(eq(resolutions.status, 'published'));
  if (options.primarySponsorId) {
    conditions.push(eq(resolutions.primarySponsorId, options.primarySponsorId));
  }
  if (options.q && options.q.trim().length > 0) {
    const term = `%${options.q.trim()}%`;
    conditions.push(ilike(resolutions.title, term));
  }

  const rows = await db
    .select({
      id: resolutions.id,
      number: resolutions.number,
      title: resolutions.title,
      type: resolutions.type,
      status: resolutions.status,
      coSponsorIds: resolutions.coSponsorIds,
      dateFiled: resolutions.dateFiled,
      publishedAt: resolutions.publishedAt,
      sponsorName: sbMembers.fullName,
      sponsorHonorific: sbMembers.honorific,
    })
    .from(resolutions)
    .leftJoin(sbMembers, eq(sbMembers.id, resolutions.primarySponsorId))
    .where(and(...conditions))
    .orderBy(desc(resolutions.year), desc(resolutions.sequenceNumber));

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    type: row.type,
    status: row.status,
    primarySponsorName: row.sponsorName
      ? `${row.sponsorHonorific ?? 'Hon.'} ${row.sponsorName}`
      : null,
    coSponsorCount: row.coSponsorIds.length,
    dateFiled: row.dateFiled,
    publishedAt: row.publishedAt,
  }));
}

export type ResolutionDetail = {
  id: string;
  number: string;
  year: number;
  sequenceNumber: number;
  type: ResolutionType;
  title: string;
  bodyMd: string;
  status: ResolutionStatus;
  tags: string[];
  primarySponsor: { id: string; fullName: string; honorific: string } | null;
  coSponsorIds: string[];
  meetingId: string | null;
  committeeId: string | null;
  dateFiled: string | null;
  firstReadingAt: string | null;
  secondReadingAt: string | null;
  voteSummary: string | null;
  pdfStoragePath: string | null;
  pdfPageCount: number | null;
  pdfByteSize: number | null;
  publishedAt: Date | null;
  withdrawnAt: Date | null;
};

export async function getResolutionById(id: string): Promise<ResolutionDetail | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      resolution: resolutions,
      sponsorId: sbMembers.id,
      sponsorName: sbMembers.fullName,
      sponsorHonorific: sbMembers.honorific,
    })
    .from(resolutions)
    .leftJoin(sbMembers, eq(sbMembers.id, resolutions.primarySponsorId))
    .where(
      and(
        eq(resolutions.tenantId, tenantId),
        eq(resolutions.id, id),
        isNull(resolutions.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const r = row.resolution;
  return {
    id: r.id,
    number: r.number,
    year: r.year,
    sequenceNumber: r.sequenceNumber,
    type: r.type,
    title: r.title,
    bodyMd: r.bodyMd,
    status: r.status,
    tags: r.tags,
    primarySponsor: row.sponsorId
      ? {
          id: row.sponsorId,
          fullName: row.sponsorName ?? 'Unknown',
          honorific: row.sponsorHonorific ?? 'Hon.',
        }
      : null,
    coSponsorIds: r.coSponsorIds,
    meetingId: r.meetingId,
    committeeId: r.committeeId,
    dateFiled: r.dateFiled,
    firstReadingAt: r.firstReadingAt,
    secondReadingAt: r.secondReadingAt,
    voteSummary: r.voteSummary,
    pdfStoragePath: r.pdfStoragePath,
    pdfPageCount: r.pdfPageCount,
    pdfByteSize: r.pdfByteSize,
    publishedAt: r.publishedAt,
    withdrawnAt: r.withdrawnAt,
  };
}

export async function getResolutionVersions(resolutionId: string): Promise<ResolutionVersion[]> {
  const tenantId = await getCurrentTenantId();
  return db
    .select()
    .from(resolutionVersions)
    .where(
      and(
        eq(resolutionVersions.tenantId, tenantId),
        eq(resolutionVersions.resolutionId, resolutionId),
      ),
    )
    .orderBy(asc(resolutionVersions.versionNumber));
}

export async function getResolutionVersionById(
  resolutionId: string,
  versionId: string,
): Promise<ResolutionVersion | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select()
    .from(resolutionVersions)
    .where(
      and(
        eq(resolutionVersions.tenantId, tenantId),
        eq(resolutionVersions.resolutionId, resolutionId),
        eq(resolutionVersions.id, versionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getResolutionYears(): Promise<number[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .selectDistinct({ year: resolutions.year })
    .from(resolutions)
    .where(and(eq(resolutions.tenantId, tenantId), isNull(resolutions.deletedAt)))
    .orderBy(desc(resolutions.year));
  return rows.map((r) => r.year);
}

export type RecentSponsorship = {
  kind: 'sponsored' | 'co_sponsored';
  id: string;
  number: string;
  title: string;
  publishedAt: Date | null;
};

export async function getRecentSponsorshipsByMember(
  memberId: string,
  limit = 5,
): Promise<RecentSponsorship[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: resolutions.id,
      number: resolutions.number,
      title: resolutions.title,
      publishedAt: resolutions.publishedAt,
      primarySponsorId: resolutions.primarySponsorId,
    })
    .from(resolutions)
    .where(
      and(
        eq(resolutions.tenantId, tenantId),
        isNull(resolutions.deletedAt),
        eq(resolutions.status, 'published'),
        or(
          eq(resolutions.primarySponsorId, memberId),
          sql`${memberId} = ANY(${resolutions.coSponsorIds})`,
        ),
      ),
    )
    .orderBy(
      sql`${resolutions.publishedAt} DESC NULLS LAST`,
      desc(resolutions.year),
      desc(resolutions.sequenceNumber),
    )
    .limit(limit);

  return rows.map((row) => ({
    kind: row.primarySponsorId === memberId ? 'sponsored' : 'co_sponsored',
    id: row.id,
    number: row.number,
    title: row.title,
    publishedAt: row.publishedAt,
  }));
}

export async function getResolutionSponsors(): Promise<
  { id: string; label: string; count: number }[]
> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: sbMembers.id,
      fullName: sbMembers.fullName,
      honorific: sbMembers.honorific,
      count: sql<number>`count(${resolutions.id})::int`,
    })
    .from(sbMembers)
    .innerJoin(resolutions, eq(resolutions.primarySponsorId, sbMembers.id))
    .where(and(eq(resolutions.tenantId, tenantId), isNull(resolutions.deletedAt)))
    .groupBy(sbMembers.id, sbMembers.fullName, sbMembers.honorific)
    .orderBy(asc(sbMembers.fullName));
  return rows.map((r) => ({
    id: r.id,
    label: `${r.honorific ?? 'Hon.'} ${r.fullName}`,
    count: r.count,
  }));
}
