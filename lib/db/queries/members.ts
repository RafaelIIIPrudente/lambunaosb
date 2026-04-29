import 'server-only';

import { and, asc, eq, inArray, isNull, not } from 'drizzle-orm';

import { env } from '@/env';
import { db } from '@/lib/db';
import {
  committeeAssignments,
  committees,
  type Committee,
  type CommitteeAssignment,
  sbMembers,
  type SBMember,
} from '@/lib/db/schema';

import { mockGetActiveMembers, mockGetAllMemberIds, mockGetMemberById } from './_mock-data';
import { getCurrentTenantId } from './tenant';

export type MemberPosition = SBMember['position'];

export type CommitteeMembership = {
  committee: Pick<Committee, 'id' | 'name' | 'slug'>;
  role: CommitteeAssignment['role'];
};

export type MemberCardData = {
  id: string;
  fullName: string;
  honorific: string;
  position: MemberPosition;
  termStartYear: number;
  termEndYear: number;
  initials: string;
  photoStoragePath: string | null;
  committees: string[];
};

export type MemberDetail = MemberCardData & {
  contactEmail: string | null;
  contactPhone: string | null;
  bioMd: string | null;
  seniority: string | null;
  showOnPublic: boolean;
  active: boolean;
  committeeAssignments: CommitteeMembership[];
};

function computeInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

async function loadCommitteesForMembers(
  memberIds: string[],
): Promise<Map<string, CommitteeMembership[]>> {
  if (memberIds.length === 0) return new Map();
  const rows = await db
    .select({
      memberId: committeeAssignments.memberId,
      role: committeeAssignments.role,
      committeeId: committees.id,
      committeeName: committees.name,
      committeeSlug: committees.slug,
    })
    .from(committeeAssignments)
    .innerJoin(committees, eq(committees.id, committeeAssignments.committeeId))
    .where(
      and(inArray(committeeAssignments.memberId, memberIds), isNull(committeeAssignments.endDate)),
    );

  const map = new Map<string, CommitteeMembership[]>();
  for (const row of rows) {
    const list = map.get(row.memberId) ?? [];
    list.push({
      committee: { id: row.committeeId, name: row.committeeName, slug: row.committeeSlug },
      role: row.role,
    });
    map.set(row.memberId, list);
  }
  return map;
}

export type GetActiveMembersOptions = {
  excludePositions?: MemberPosition[];
  showOnPublicOnly?: boolean;
};

export async function getActiveMembers(
  options: GetActiveMembersOptions = {},
): Promise<MemberCardData[]> {
  if (env.MOCK_DATA) return mockGetActiveMembers(options);
  const tenantId = await getCurrentTenantId();
  const conditions = [
    eq(sbMembers.tenantId, tenantId),
    eq(sbMembers.active, true),
    isNull(sbMembers.deletedAt),
  ];
  if (options.excludePositions && options.excludePositions.length > 0) {
    conditions.push(not(inArray(sbMembers.position, options.excludePositions)));
  }
  if (options.showOnPublicOnly) {
    conditions.push(eq(sbMembers.showOnPublic, true));
  }

  const rows = await db
    .select()
    .from(sbMembers)
    .where(and(...conditions))
    .orderBy(asc(sbMembers.sortOrder), asc(sbMembers.fullName));

  const committeesByMember = await loadCommitteesForMembers(rows.map((r) => r.id));

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    honorific: row.honorific ?? 'Hon.',
    position: row.position,
    termStartYear: row.termStartYear,
    termEndYear: row.termEndYear,
    initials: computeInitials(row.fullName),
    photoStoragePath: row.photoStoragePath,
    committees: (committeesByMember.get(row.id) ?? []).map((m) => m.committee.name),
  }));
}

export async function getMemberById(id: string): Promise<MemberDetail | null> {
  if (env.MOCK_DATA) return mockGetMemberById(id);
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select()
    .from(sbMembers)
    .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, id), isNull(sbMembers.deletedAt)))
    .limit(1);
  if (!row) return null;

  const committeesByMember = await loadCommitteesForMembers([id]);
  const memberships = committeesByMember.get(id) ?? [];

  return {
    id: row.id,
    fullName: row.fullName,
    honorific: row.honorific ?? 'Hon.',
    position: row.position,
    termStartYear: row.termStartYear,
    termEndYear: row.termEndYear,
    initials: computeInitials(row.fullName),
    photoStoragePath: row.photoStoragePath,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    bioMd: row.bioMd,
    seniority: row.seniority,
    showOnPublic: row.showOnPublic,
    active: row.active,
    committees: memberships.map((m) => m.committee.name),
    committeeAssignments: memberships,
  };
}

export async function getAllMemberIds(): Promise<{ id: string }[]> {
  if (env.MOCK_DATA) return mockGetAllMemberIds();
  const tenantId = await getCurrentTenantId();
  return db
    .select({ id: sbMembers.id })
    .from(sbMembers)
    .where(and(eq(sbMembers.tenantId, tenantId), isNull(sbMembers.deletedAt)));
}
