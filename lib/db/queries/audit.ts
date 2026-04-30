import 'server-only';

import { and, desc, eq, gte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLogEntries, type AuditLogEntry, profiles } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type AuditCategory = AuditLogEntry['category'];

export type AuditLogRowData = {
  id: string;
  createdAt: Date;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  category: AuditCategory;
  targetType: string;
  targetId: string;
  alert: boolean;
  ipInet: string | null;
};

export type GetAuditLogOptions = {
  category?: AuditCategory;
  since?: Date;
  limit?: number;
};

export async function getAuditLog(options: GetAuditLogOptions = {}): Promise<AuditLogRowData[]> {
  const tenantId = await getCurrentTenantId();
  const conditions = [eq(auditLogEntries.tenantId, tenantId)];
  if (options.category) conditions.push(eq(auditLogEntries.category, options.category));
  if (options.since) conditions.push(gte(auditLogEntries.createdAt, options.since));

  const baseQuery = db
    .select({
      id: auditLogEntries.id,
      createdAt: auditLogEntries.createdAt,
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
    .orderBy(desc(auditLogEntries.createdAt));

  return options.limit ? baseQuery.limit(options.limit) : baseQuery;
}

export async function getRecentActivity(limit = 4): Promise<AuditLogRowData[]> {
  return getAuditLog({ limit });
}
