import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citizenQueries,
  type CitizenQuery,
  citizenQueryReplies,
  type CitizenQueryReply,
  profiles,
  type Profile,
} from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

const ADMIN_ROLES = [
  'secretary',
  'vice_mayor',
  'mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
] as const satisfies readonly Profile['role'][];

export type CitizenQueryStatus = CitizenQuery['status'];
export type CitizenQueryCategory = CitizenQuery['category'];

export type CitizenQueryRowData = {
  id: string;
  ref: string;
  submitterName: string;
  submitterEmail: string;
  subject: string;
  status: CitizenQueryStatus;
  category: CitizenQueryCategory;
  submittedAt: Date;
  assignedTo: string | null;
  assignedToName: string | null;
};

export const QUERIES_PAGE_SIZE = 50;

export type GetCitizenQueriesOptions = {
  status?: CitizenQueryStatus;
  assignedTo?: string | 'unassigned';
  q?: string;
  limit?: number;
  cursor?: Date;
};

export type GetCitizenQueriesResult = {
  rows: CitizenQueryRowData[];
  nextCursor: string | null;
};

export async function getCitizenQueries(
  options: GetCitizenQueriesOptions = {},
): Promise<GetCitizenQueriesResult> {
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(citizenQueries.tenantId, tenantId)];
  if (options.status) conditions.push(eq(citizenQueries.status, options.status));
  if (options.assignedTo === 'unassigned') {
    conditions.push(isNull(citizenQueries.assignedTo));
  } else if (options.assignedTo) {
    conditions.push(eq(citizenQueries.assignedTo, options.assignedTo));
  }
  if (options.q && options.q.trim().length > 0) {
    const needle = `%${options.q.trim()}%`;
    const orMatch = or(
      ilike(citizenQueries.subject, needle),
      ilike(citizenQueries.submitterName, needle),
      ilike(citizenQueries.submitterEmail, needle),
      ilike(citizenQueries.ref, needle),
    );
    if (orMatch) conditions.push(orMatch);
  }
  if (options.cursor) {
    conditions.push(lt(citizenQueries.submittedAt, options.cursor));
  }

  const pageSize = options.limit ?? QUERIES_PAGE_SIZE;

  const dbRows = await db
    .select({
      id: citizenQueries.id,
      ref: citizenQueries.ref,
      submitterName: citizenQueries.submitterName,
      submitterEmail: citizenQueries.submitterEmail,
      subject: citizenQueries.subject,
      status: citizenQueries.status,
      category: citizenQueries.category,
      submittedAt: citizenQueries.submittedAt,
      assignedTo: citizenQueries.assignedTo,
      assigneeName: profiles.fullName,
    })
    .from(citizenQueries)
    .leftJoin(profiles, eq(profiles.id, citizenQueries.assignedTo))
    .where(and(...conditions))
    .orderBy(desc(citizenQueries.submittedAt))
    .limit(pageSize + 1);

  const hasMore = dbRows.length > pageSize;
  const pageRows = hasMore ? dbRows.slice(0, pageSize) : dbRows;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.submittedAt.toISOString() : null;

  return {
    rows: pageRows.map((row) => ({
      id: row.id,
      ref: row.ref,
      submitterName: row.submitterName,
      submitterEmail: row.submitterEmail,
      subject: row.subject,
      status: row.status,
      category: row.category,
      submittedAt: row.submittedAt,
      assignedTo: row.assignedTo,
      assignedToName: row.assigneeName,
    })),
    nextCursor,
  };
}

export type AssignmentCounts = {
  unassigned: number;
  mine: number;
};

export async function getAssignmentCounts(userId: string): Promise<AssignmentCounts> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      unassigned: sql<number>`count(*) filter (where ${citizenQueries.assignedTo} is null and ${citizenQueries.status} not in ('closed','spam'))`,
      mine: sql<number>`count(*) filter (where ${citizenQueries.assignedTo} = ${userId} and ${citizenQueries.status} not in ('closed','spam'))`,
    })
    .from(citizenQueries)
    .where(eq(citizenQueries.tenantId, tenantId));

  return {
    unassigned: Number(row?.unassigned ?? 0),
    mine: Number(row?.mine ?? 0),
  };
}

export type CitizenQueryDetail = CitizenQueryRowData & {
  messageMd: string;
  ipInet: string | null;
  userAgent: string | null;
  honeypotTripped: string | null;
  turnstileScore: string | null;
  acknowledgedAt: Date | null;
  answeredAt: Date | null;
  closedAt: Date | null;
  tags: string[];
};

export async function getCitizenQueryById(id: string): Promise<CitizenQueryDetail | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      query: citizenQueries,
      assigneeName: profiles.fullName,
    })
    .from(citizenQueries)
    .leftJoin(profiles, eq(profiles.id, citizenQueries.assignedTo))
    .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, id)))
    .limit(1);

  if (!row) return null;

  const q = row.query;
  return {
    id: q.id,
    ref: q.ref,
    submitterName: q.submitterName,
    submitterEmail: q.submitterEmail,
    subject: q.subject,
    messageMd: q.messageMd,
    status: q.status,
    category: q.category,
    submittedAt: q.submittedAt,
    assignedTo: q.assignedTo,
    assignedToName: row.assigneeName,
    ipInet: q.ipInet,
    userAgent: q.userAgent,
    honeypotTripped: q.honeypotTripped,
    turnstileScore: q.turnstileScore,
    acknowledgedAt: q.acknowledgedAt,
    answeredAt: q.answeredAt,
    closedAt: q.closedAt,
    tags: q.tags,
  };
}

export async function getCitizenQueryReplies(
  queryId: string,
): Promise<(CitizenQueryReply & { authorName: string | null })[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      reply: citizenQueryReplies,
      authorName: profiles.fullName,
    })
    .from(citizenQueryReplies)
    .leftJoin(profiles, eq(profiles.id, citizenQueryReplies.authorId))
    .where(
      and(eq(citizenQueryReplies.tenantId, tenantId), eq(citizenQueryReplies.queryId, queryId)),
    )
    .orderBy(asc(citizenQueryReplies.sentAt));

  return rows.map((row) => ({ ...row.reply, authorName: row.authorName }));
}

export type AdminAssigneeOption = {
  id: string;
  fullName: string;
  role: Profile['role'];
};

export async function getAdminAssigneeOptions(): Promise<AdminAssigneeOption[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      role: profiles.role,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.tenantId, tenantId),
        eq(profiles.active, true),
        inArray(profiles.role, [...ADMIN_ROLES]),
      ),
    )
    .orderBy(profiles.fullName);

  return rows;
}

export type StatusCounts = Record<CitizenQueryStatus | 'all', number>;

export async function getCitizenQueryStatusCounts(): Promise<StatusCounts> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({ status: citizenQueries.status, total: count() })
    .from(citizenQueries)
    .where(eq(citizenQueries.tenantId, tenantId))
    .groupBy(citizenQueries.status);

  const out: StatusCounts = {
    all: 0,
    new: 0,
    in_progress: 0,
    awaiting_citizen: 0,
    answered: 0,
    closed: 0,
    spam: 0,
  };
  for (const row of rows) {
    out[row.status] = Number(row.total);
    out.all += Number(row.total);
  }
  return out;
}
