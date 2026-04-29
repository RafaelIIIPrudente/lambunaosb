'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { meetings } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import { createMeetingSchema, updateMeetingSchema } from '@/lib/validators/meeting';

const ALLOWED_CREATE_ROLES = ['secretary', 'mayor', 'vice_mayor'] as const;

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

export async function createMeeting(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = createMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to create meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const scheduledAt = combineDateTime(parsed.data.scheduledDate, parsed.data.scheduledTime);

    const [row] = await db
      .insert(meetings)
      .values({
        tenantId,
        type: parsed.data.type,
        sequenceNumber: parsed.data.sequenceNumber,
        title: parsed.data.title,
        scheduledAt,
        presiderId: parsed.data.presiderId ?? null,
        location: parsed.data.location,
        primaryLocale: parsed.data.primaryLocale,
        createdBy: ctx.userId,
      })
      .returning({ id: meetings.id });

    if (!row) return err('Failed to create meeting.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.created',
      category: 'meeting',
      targetType: 'meeting',
      targetId: row.id,
      metadata: { title: parsed.data.title, type: parsed.data.type },
    });

    revalidatePath('/admin/meetings');
    revalidatePath('/admin/dashboard');
    return ok({ id: row.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create meeting.', 'E_UNKNOWN');
  }
}

export async function updateMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = updateMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to update meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const scheduledAt = combineDateTime(parsed.data.scheduledDate, parsed.data.scheduledTime);

    const result = await db
      .update(meetings)
      .set({
        type: parsed.data.type,
        sequenceNumber: parsed.data.sequenceNumber,
        title: parsed.data.title,
        scheduledAt,
        presiderId: parsed.data.presiderId ?? null,
        location: parsed.data.location,
        primaryLocale: parsed.data.primaryLocale,
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)))
      .returning({ id: meetings.id });

    if (result.length === 0) return err('Meeting not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.updated',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: { title: parsed.data.title },
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update meeting.', 'E_UNKNOWN');
  }
}
