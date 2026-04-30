'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { citizenQueries, citizenQueryReplies, profiles } from '@/lib/db/schema';
import { sendQueryReplyEmail } from '@/lib/services/email';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  assignCitizenQuerySchema,
  markCitizenQueryViewedSchema,
  replyToCitizenQuerySchema,
  updateCitizenQueryStatusSchema,
  updateCitizenQueryTagsSchema,
} from '@/lib/validators/citizen-query-admin';

const ADMIN_ROLES = ['secretary', 'vice_mayor', 'mayor', 'sb_member'] as const;
const ARCHIVE_ROLES = ['secretary'] as const;

type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdmin(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

function isArchiveRole(role: string): boolean {
  return (ARCHIVE_ROLES as readonly string[]).includes(role);
}

export async function markCitizenQueryViewed(raw: unknown): Promise<Result<void>> {
  const parsed = markCitizenQueryViewedSchema.safeParse(raw);
  if (!parsed.success) return err('Invalid input.', 'E_VALIDATION');

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!isAdmin(ctx.profile.role)) return err('You do not have permission.', 'E_FORBIDDEN');

  try {
    const tenantId = await getCurrentTenantId();
    const now = new Date();

    const [updated] = await db
      .update(citizenQueries)
      .set({ status: 'in_progress', acknowledgedAt: now, updatedAt: now })
      .where(
        and(
          eq(citizenQueries.tenantId, tenantId),
          eq(citizenQueries.id, parsed.data.queryId),
          eq(citizenQueries.status, 'new'),
        ),
      )
      .returning({ id: citizenQueries.id, ref: citizenQueries.ref });

    if (!updated) return ok(undefined);

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.acknowledged',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { ref: updated.ref },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to acknowledge query.', 'E_UNKNOWN');
  }
}

export async function replyToCitizenQuery(raw: unknown): Promise<Result<{ replyId: string }>> {
  const parsed = replyToCitizenQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!isAdmin(ctx.profile.role)) return err('You do not have permission to reply.', 'E_FORBIDDEN');

  try {
    const tenantId = await getCurrentTenantId();

    const [query] = await db
      .select({
        ref: citizenQueries.ref,
        subject: citizenQueries.subject,
        status: citizenQueries.status,
        submitterEmail: citizenQueries.submitterEmail,
        submitterName: citizenQueries.submitterName,
      })
      .from(citizenQueries)
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .limit(1);

    if (!query) return err('Query not found.', 'E_NOT_FOUND');
    if (query.status === 'spam') {
      return err('Cannot reply to a query marked as spam.', 'E_INVALID_STATE');
    }
    if (query.status === 'closed') {
      return err('Reopen the query before replying.', 'E_INVALID_STATE');
    }

    const sendResult = await sendQueryReplyEmail({
      to: query.submitterEmail,
      recipientName: query.submitterName,
      referenceNumber: query.ref,
      subject: query.subject,
      bodyMd: parsed.data.bodyMd,
      authorName: ctx.profile.fullName,
    });

    const resendMessageId =
      'messageId' in sendResult && !sendResult.skipped ? sendResult.messageId : null;
    const sendError = 'error' in sendResult ? sendResult.error : null;

    const [reply] = await db
      .insert(citizenQueryReplies)
      .values({
        tenantId,
        queryId: parsed.data.queryId,
        authorId: ctx.userId,
        bodyMd: parsed.data.bodyMd,
        sentToEmail: query.submitterEmail,
        resendMessageId,
      })
      .returning({ id: citizenQueryReplies.id });

    if (!reply) return err('Failed to record the reply.', 'E_INSERT_FAILED');

    const now = new Date();
    await db
      .update(citizenQueries)
      .set({
        status: 'answered',
        answeredAt: now,
        acknowledgedAt: query.status === 'new' ? now : undefined,
        updatedAt: now,
      })
      .where(
        and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)),
      );

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.replied',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: {
        ref: query.ref,
        replyId: reply.id,
        emailDelivered: resendMessageId !== null,
        emailSkipReason:
          sendResult.skipped === true ? sendResult.reason : sendError ? 'send_failed' : null,
      },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    revalidatePath('/admin/dashboard');
    return ok({ replyId: reply.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to send reply.', 'E_UNKNOWN');
  }
}

export async function updateCitizenQueryStatus(raw: unknown): Promise<Result<void>> {
  const parsed = updateCitizenQueryStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!isAdmin(ctx.profile.role)) return err('You do not have permission.', 'E_FORBIDDEN');

  const archiveStatuses = new Set(['closed', 'spam']);
  if (archiveStatuses.has(parsed.data.status) && !isArchiveRole(ctx.profile.role)) {
    return err('Only the Secretary can close or mark a query as spam.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    const [current] = await db
      .select({
        ref: citizenQueries.ref,
        status: citizenQueries.status,
        acknowledgedAt: citizenQueries.acknowledgedAt,
      })
      .from(citizenQueries)
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .limit(1);

    if (!current) return err('Query not found.', 'E_NOT_FOUND');
    if (current.status === parsed.data.status) return ok(undefined);

    const now = new Date();
    const closingNow = parsed.data.status === 'closed' || parsed.data.status === 'spam';
    const acknowledgingNow =
      parsed.data.status === 'in_progress' && current.acknowledgedAt === null;

    await db
      .update(citizenQueries)
      .set({
        status: parsed.data.status,
        closedAt: closingNow ? now : null,
        acknowledgedAt: acknowledgingNow ? now : current.acknowledgedAt,
        updatedAt: now,
      })
      .where(
        and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)),
      );

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.status_updated',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      alert: parsed.data.status === 'spam',
      metadata: {
        ref: current.ref,
        from: current.status,
        to: parsed.data.status,
      },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    revalidatePath('/admin/dashboard');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update status.', 'E_UNKNOWN');
  }
}

export async function assignCitizenQuery(raw: unknown): Promise<Result<void>> {
  const parsed = assignCitizenQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!isAdmin(ctx.profile.role)) return err('You do not have permission.', 'E_FORBIDDEN');

  try {
    const tenantId = await getCurrentTenantId();

    if (parsed.data.assigneeId !== null) {
      const [assignee] = await db
        .select({ role: profiles.role, active: profiles.active })
        .from(profiles)
        .where(and(eq(profiles.id, parsed.data.assigneeId), eq(profiles.tenantId, tenantId)))
        .limit(1);

      if (!assignee) return err('Assignee not found.', 'E_NOT_FOUND');
      if (!assignee.active) return err('Assignee is not an active admin.', 'E_INVALID_ASSIGNEE');
      if (!isAdmin(assignee.role)) {
        return err('Assignee is not an admin.', 'E_INVALID_ASSIGNEE');
      }
    }

    const [updated] = await db
      .update(citizenQueries)
      .set({ assignedTo: parsed.data.assigneeId, updatedAt: new Date() })
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .returning({ id: citizenQueries.id, ref: citizenQueries.ref });

    if (!updated) return err('Query not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action:
        parsed.data.assigneeId === null ? 'citizen_query.unassigned' : 'citizen_query.assigned',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { ref: updated.ref, assigneeId: parsed.data.assigneeId },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to assign query.', 'E_UNKNOWN');
  }
}

export async function updateCitizenQueryTags(raw: unknown): Promise<Result<void>> {
  const parsed = updateCitizenQueryTagsSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!isAdmin(ctx.profile.role)) return err('You do not have permission.', 'E_FORBIDDEN');

  try {
    const tenantId = await getCurrentTenantId();
    const [updated] = await db
      .update(citizenQueries)
      .set({ tags: parsed.data.tags, updatedAt: new Date() })
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .returning({ id: citizenQueries.id, ref: citizenQueries.ref });

    if (!updated) return err('Query not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.tags_updated',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { ref: updated.ref, tags: parsed.data.tags },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update tags.', 'E_UNKNOWN');
  }
}
