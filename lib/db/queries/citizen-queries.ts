import 'server-only';

import { and, asc, count, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citizenQueries,
  type CitizenQuery,
  citizenQueryReplies,
  type CitizenQueryReply,
  profiles,
} from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

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
  assignedToName: string | null;
};

export type GetCitizenQueriesOptions = {
  status?: CitizenQueryStatus;
  assignedTo?: string | 'unassigned';
  limit?: number;
};

export async function getCitizenQueries(
  options: GetCitizenQueriesOptions = {},
): Promise<CitizenQueryRowData[]> {
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(citizenQueries.tenantId, tenantId)];
  if (options.status) conditions.push(eq(citizenQueries.status, options.status));

  const baseQuery = db
    .select({
      id: citizenQueries.id,
      ref: citizenQueries.ref,
      submitterName: citizenQueries.submitterName,
      submitterEmail: citizenQueries.submitterEmail,
      subject: citizenQueries.subject,
      status: citizenQueries.status,
      category: citizenQueries.category,
      submittedAt: citizenQueries.submittedAt,
      assigneeName: profiles.fullName,
    })
    .from(citizenQueries)
    .leftJoin(profiles, eq(profiles.id, citizenQueries.assignedTo))
    .where(and(...conditions))
    .orderBy(desc(citizenQueries.submittedAt));

  const rows = await (options.limit ? baseQuery.limit(options.limit) : baseQuery);

  return rows.map((row) => ({
    id: row.id,
    ref: row.ref,
    submitterName: row.submitterName,
    submitterEmail: row.submitterEmail,
    subject: row.subject,
    status: row.status,
    category: row.category,
    submittedAt: row.submittedAt,
    assignedToName: row.assigneeName,
  }));
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
