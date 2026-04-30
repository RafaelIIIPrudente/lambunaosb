import 'server-only';

import { and, desc, eq, ilike, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles, type Profile, sbMembers } from '@/lib/db/schema';
import {
  type UserActivityFilter,
  type UserInvitationFilter,
  type UserRole,
} from '@/lib/validators/user';

import { getCurrentTenantId } from './tenant';

export const USERS_PAGE_SIZE = 50;

export type UserRowData = {
  id: string;
  fullName: string;
  email: string;
  role: Profile['role'];
  active: boolean;
  invitedAt: Date | null;
  lastSignInAt: Date | null;
  createdAt: Date;
  memberId: string | null;
  memberName: string | null;
  memberPhotoPath: string | null;
};

export type GetUsersOptions = {
  role?: UserRole | null;
  activity?: UserActivityFilter;
  invitation?: UserInvitationFilter;
  q?: string | null;
  cursor?: Date | null;
  limit?: number;
};

export type GetUsersResult = {
  rows: UserRowData[];
  nextCursor: string | null;
};

function buildUserConditions(tenantId: string, options: GetUsersOptions): SQL[] {
  const conditions: SQL[] = [eq(profiles.tenantId, tenantId)];
  if (options.role) conditions.push(eq(profiles.role, options.role));
  if (options.activity === 'active') conditions.push(eq(profiles.active, true));
  if (options.activity === 'inactive') conditions.push(eq(profiles.active, false));
  if (options.invitation === 'accepted') conditions.push(isNotNull(profiles.lastSignInAt));
  if (options.invitation === 'pending') conditions.push(isNull(profiles.lastSignInAt));
  if (options.q && options.q.trim().length > 0) {
    const needle = `%${options.q.trim()}%`;
    const orMatch = or(ilike(profiles.fullName, needle), ilike(profiles.email, needle));
    if (orMatch) conditions.push(orMatch);
  }
  if (options.cursor) conditions.push(lt(profiles.createdAt, options.cursor));
  return conditions;
}

export async function getUsers(options: GetUsersOptions = {}): Promise<GetUsersResult> {
  const tenantId = await getCurrentTenantId();
  const conditions = buildUserConditions(tenantId, options);
  const pageSize = options.limit ?? USERS_PAGE_SIZE;

  const dbRows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      active: profiles.active,
      invitedAt: profiles.invitedAt,
      lastSignInAt: profiles.lastSignInAt,
      createdAt: profiles.createdAt,
      memberId: profiles.memberId,
      memberName: sbMembers.fullName,
      memberPhotoPath: sbMembers.photoStoragePath,
    })
    .from(profiles)
    .leftJoin(sbMembers, eq(sbMembers.id, profiles.memberId))
    .where(and(...conditions))
    .orderBy(desc(profiles.createdAt))
    .limit(pageSize + 1);

  const hasMore = dbRows.length > pageSize;
  const pageRows = hasMore ? dbRows.slice(0, pageSize) : dbRows;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.createdAt.toISOString() : null;

  return {
    rows: pageRows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      active: row.active,
      invitedAt: row.invitedAt,
      lastSignInAt: row.lastSignInAt,
      createdAt: row.createdAt,
      memberId: row.memberId,
      memberName: row.memberName,
      memberPhotoPath: row.memberPhotoPath,
    })),
    nextCursor,
  };
}

export async function getUserById(userId: string): Promise<Profile | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, userId)))
    .limit(1);
  return row ?? null;
}

export type UserStatusCounts = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
};

export async function getUserStatusCounts(): Promise<UserStatusCounts> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${profiles.active} = true)::int`,
      inactive: sql<number>`count(*) filter (where ${profiles.active} = false)::int`,
      pending: sql<number>`count(*) filter (where ${profiles.lastSignInAt} is null and ${profiles.active} = true)::int`,
    })
    .from(profiles)
    .where(eq(profiles.tenantId, tenantId));

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    inactive: Number(row?.inactive ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}

export async function getActiveSecretaryCount(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(profiles)
    .where(
      and(
        eq(profiles.tenantId, tenantId),
        eq(profiles.role, 'secretary'),
        eq(profiles.active, true),
      ),
    );
  return Number(row?.total ?? 0);
}
