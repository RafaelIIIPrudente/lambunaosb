import 'server-only';

import { and, desc, eq, gte, ilike, inArray, lt, lte, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLogEntries, type AuditLogEntry, profiles, type Profile } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type AuditCategory = AuditLogEntry['category'];

const ADMIN_ROLES = [
  'secretary',
  'vice_mayor',
  'mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
] as const satisfies readonly Profile['role'][];

export const AUDIT_PAGE_SIZE = 10;

export type AuditLogRowData = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  category: AuditCategory;
  targetType: string;
  targetId: string;
  alert: boolean;
  ipInet: string | null;
};

export type GetAuditEntriesOptions = {
  category?: AuditCategory | null;
  actorId?: string | null;
  actionContains?: string | null;
  alertOnly?: boolean;
  since?: Date | null;
  until?: Date | null;
  cursor?: Date | null;
  limit?: number;
};

export type GetAuditEntriesResult = {
  rows: AuditLogRowData[];
  nextCursor: string | null;
};

// Decision I (c) is implemented as a one-time backfill (step 11). After that
// runs, every news_post audit row carries category='news' natively. We still
// expose a normalizer here so a future legacy row (if any are written before
// the backfill lands in production) is presented consistently.
function normalizeCategory(raw: AuditCategory, targetType: string): AuditCategory {
  if (raw === 'system' && targetType === 'news_post') return 'news';
  return raw;
}

function buildAuditConditions(tenantId: string, options: GetAuditEntriesOptions): SQL[] {
  const conditions: SQL[] = [eq(auditLogEntries.tenantId, tenantId)];

  if (options.category) {
    if (options.category === 'news') {
      // Match both natively-categorized rows AND legacy rows that may not yet
      // have been backfilled. Once decision I (c) runs and we're confident no
      // new 'system'+news_post rows are being written, this OR can be dropped.
      const newsMatch = sql`${auditLogEntries.category} = 'news' or (${auditLogEntries.category} = 'system' and ${auditLogEntries.targetType} = 'news_post')`;
      conditions.push(newsMatch);
    } else if (options.category === 'system') {
      // Exclude legacy news rows from the 'system' filter so they don't double
      // up with the news filter.
      const systemMatch = sql`${auditLogEntries.category} = 'system' and ${auditLogEntries.targetType} <> 'news_post'`;
      conditions.push(systemMatch);
    } else {
      conditions.push(eq(auditLogEntries.category, options.category));
    }
  }

  if (options.actorId) conditions.push(eq(auditLogEntries.actorId, options.actorId));
  if (options.alertOnly) conditions.push(eq(auditLogEntries.alert, true));
  if (options.since) conditions.push(gte(auditLogEntries.createdAt, options.since));
  if (options.until) conditions.push(lte(auditLogEntries.createdAt, options.until));
  if (options.actionContains && options.actionContains.trim().length > 0) {
    conditions.push(ilike(auditLogEntries.action, `%${options.actionContains.trim()}%`));
  }
  if (options.cursor) conditions.push(lt(auditLogEntries.createdAt, options.cursor));

  return conditions;
}

export async function getAuditEntries(
  options: GetAuditEntriesOptions = {},
): Promise<GetAuditEntriesResult> {
  const tenantId = await getCurrentTenantId();
  const conditions = buildAuditConditions(tenantId, options);
  const pageSize = options.limit ?? AUDIT_PAGE_SIZE;

  const dbRows = await db
    .select({
      id: auditLogEntries.id,
      createdAt: auditLogEntries.createdAt,
      actorId: auditLogEntries.actorId,
      action: auditLogEntries.action,
      category: auditLogEntries.category,
      targetType: auditLogEntries.targetType,
      targetId: auditLogEntries.targetId,
      alert: auditLogEntries.alert,
      ipInet: auditLogEntries.ipInet,
      actorRole: auditLogEntries.actorRoleSnapshot,
      actorName: profiles.fullName,
    })
    .from(auditLogEntries)
    .leftJoin(profiles, eq(profiles.id, auditLogEntries.actorId))
    .where(and(...conditions))
    .orderBy(desc(auditLogEntries.createdAt))
    .limit(pageSize + 1);

  const hasMore = dbRows.length > pageSize;
  const pageRows = hasMore ? dbRows.slice(0, pageSize) : dbRows;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.createdAt.toISOString() : null;

  return {
    rows: pageRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      actorId: row.actorId,
      actorName: row.actorName,
      actorRole: row.actorRole,
      action: row.action,
      category: normalizeCategory(row.category, row.targetType),
      targetType: row.targetType,
      targetId: row.targetId,
      alert: row.alert,
      ipInet: row.ipInet,
    })),
    nextCursor,
  };
}

export type AuditEntryDetail = AuditLogRowData & {
  metadata: Record<string, unknown>;
  userAgent: string | null;
  sessionId: string | null;
};

export async function getAuditEntryById(id: string): Promise<AuditEntryDetail | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      entry: auditLogEntries,
      actorName: profiles.fullName,
    })
    .from(auditLogEntries)
    .leftJoin(profiles, eq(profiles.id, auditLogEntries.actorId))
    .where(and(eq(auditLogEntries.tenantId, tenantId), eq(auditLogEntries.id, id)))
    .limit(1);

  if (!row) return null;
  const e = row.entry;
  return {
    id: e.id,
    createdAt: e.createdAt,
    actorId: e.actorId,
    actorName: row.actorName,
    actorRole: e.actorRoleSnapshot,
    action: e.action,
    category: normalizeCategory(e.category, e.targetType),
    targetType: e.targetType,
    targetId: e.targetId,
    alert: e.alert,
    ipInet: e.ipInet,
    metadata: e.metadata,
    userAgent: e.userAgent,
    sessionId: e.sessionId,
  };
}

export type AuditActorOption = {
  id: string;
  fullName: string;
  role: Profile['role'];
};

export async function getAuditActorOptions(): Promise<AuditActorOption[]> {
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

export async function getAlertCount(options: { since?: Date | null } = {}): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(auditLogEntries.tenantId, tenantId), eq(auditLogEntries.alert, true)];
  if (options.since) conditions.push(gte(auditLogEntries.createdAt, options.since));
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLogEntries)
    .where(and(...conditions));
  return Number(row?.total ?? 0);
}

// Preserved for the dashboard widget, which still consumes the simple array
// shape. New consumers should use getAuditEntries instead.
export async function getRecentActivity(limit = 4): Promise<AuditLogRowData[]> {
  const result = await getAuditEntries({ limit });
  return result.rows;
}
