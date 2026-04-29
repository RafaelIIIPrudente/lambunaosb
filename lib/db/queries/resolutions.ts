import 'server-only';

import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { env } from '@/env';
import { db } from '@/lib/db';
import {
  resolutions,
  type Resolution,
  resolutionVersions,
  type ResolutionVersion,
  sbMembers,
} from '@/lib/db/schema';

import { mockGetResolutionById, mockGetResolutionsList } from './_mock-data';
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
};

export async function getResolutionsList(
  options: GetResolutionsListOptions = {},
): Promise<ResolutionRowData[]> {
  if (env.MOCK_DATA) return mockGetResolutionsList(options);
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(resolutions.tenantId, tenantId), isNull(resolutions.deletedAt)];
  if (options.status) conditions.push(eq(resolutions.status, options.status));
  if (options.year) conditions.push(eq(resolutions.year, options.year));
  if (options.publicOnly) conditions.push(eq(resolutions.status, 'published'));

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
  if (env.MOCK_DATA) return mockGetResolutionById(id);
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
  if (env.MOCK_DATA) return [];
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
