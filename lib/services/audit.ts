import 'server-only';

import { db } from '@/lib/db';
import { type AuditCategory, auditLogEntries, type Profile } from '@/lib/db/schema';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';

export type WriteAuditInput = {
  actorId: string | null;
  actorRole: Profile['role'] | null;
  action: string;
  category: AuditCategory;
  targetType: string;
  targetId: string;
  alert?: boolean;
  metadata?: Record<string, unknown>;
  ipInet?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
};

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const tenantId = await getCurrentTenantId();
  await db.insert(auditLogEntries).values({
    tenantId,
    actorId: input.actorId,
    actorRoleSnapshot: input.actorRole,
    action: input.action,
    category: input.category,
    targetType: input.targetType,
    targetId: input.targetId,
    alert: input.alert ?? false,
    ipInet: input.ipInet ?? null,
    userAgent: input.userAgent ?? null,
    sessionId: input.sessionId ?? null,
    metadata: input.metadata ?? {},
  });
}
