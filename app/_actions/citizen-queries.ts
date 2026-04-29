'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { citizenQueries, citizenQueryReplies } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  assignCitizenQuerySchema,
  replyToCitizenQuerySchema,
  updateCitizenQueryStatusSchema,
  updateCitizenQueryTagsSchema,
} from '@/lib/validators/citizen-query-admin';

const ADMIN_ROLES = ['secretary', 'vice_mayor', 'mayor', 'sb_member'] as const;

export async function replyToCitizenQuery(raw: unknown): Promise<Result<{ replyId: string }>> {
  const parsed = replyToCitizenQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ADMIN_ROLES.includes(ctx.profile.role as (typeof ADMIN_ROLES)[number])) {
    return err('You do not have permission to reply.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    const [query] = await db
      .select({ submitterEmail: citizenQueries.submitterEmail })
      .from(citizenQueries)
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .limit(1);

    if (!query) return err('Query not found.', 'E_NOT_FOUND');

    const [reply] = await db
      .insert(citizenQueryReplies)
      .values({
        tenantId,
        queryId: parsed.data.queryId,
        authorId: ctx.userId,
        bodyMd: parsed.data.bodyMd,
        sentToEmail: query.submitterEmail,
      })
      .returning({ id: citizenQueryReplies.id });

    if (!reply) return err('Failed to send reply.', 'E_INSERT_FAILED');

    const now = new Date();
    await db
      .update(citizenQueries)
      .set({ status: 'answered', answeredAt: now, updatedAt: now })
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
      metadata: { replyId: reply.id, sentToEmail: query.submitterEmail },
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
  if (!ADMIN_ROLES.includes(ctx.profile.role as (typeof ADMIN_ROLES)[number])) {
    return err('You do not have permission.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const now = new Date();
    const result = await db
      .update(citizenQueries)
      .set({
        status: parsed.data.status,
        closedAt: parsed.data.status === 'closed' ? now : null,
        updatedAt: now,
      })
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .returning({ id: citizenQueries.id });

    if (result.length === 0) return err('Query not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.status_updated',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath('/admin/queries');
    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
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
  if (!ADMIN_ROLES.includes(ctx.profile.role as (typeof ADMIN_ROLES)[number])) {
    return err('You do not have permission.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const result = await db
      .update(citizenQueries)
      .set({ assignedTo: parsed.data.assigneeId, updatedAt: new Date() })
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .returning({ id: citizenQueries.id });

    if (result.length === 0) return err('Query not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.assigned',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { assigneeId: parsed.data.assigneeId },
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
  if (!ADMIN_ROLES.includes(ctx.profile.role as (typeof ADMIN_ROLES)[number])) {
    return err('You do not have permission.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const result = await db
      .update(citizenQueries)
      .set({ tags: parsed.data.tags, updatedAt: new Date() })
      .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.id, parsed.data.queryId)))
      .returning({ id: citizenQueries.id });

    if (result.length === 0) return err('Query not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'citizen_query.tags_updated',
      category: 'query',
      targetType: 'citizen_query',
      targetId: parsed.data.queryId,
      metadata: { tags: parsed.data.tags },
    });

    revalidatePath(`/admin/queries/${parsed.data.queryId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update tags.', 'E_UNKNOWN');
  }
}
