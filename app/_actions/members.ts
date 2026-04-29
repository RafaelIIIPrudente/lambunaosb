'use server';

import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { committeeAssignments, sbMembers } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import { memberSchema, updateMemberSchema } from '@/lib/validators/member';

const ALLOWED_ROLES = ['secretary', 'vice_mayor'] as const;

export async function createMember(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_ROLES.includes(ctx.profile.role as (typeof ALLOWED_ROLES)[number])) {
    return err('You do not have permission to create members.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const today = new Date().toISOString().slice(0, 10);

    const [row] = await db
      .insert(sbMembers)
      .values({
        tenantId,
        fullName: parsed.data.fullName,
        honorific: parsed.data.honorific,
        position: parsed.data.position,
        termStartYear: parsed.data.termStartYear,
        termEndYear: parsed.data.termEndYear,
        seniority: parsed.data.seniority ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        contactPhone: parsed.data.contactPhone ?? null,
        bioMd: parsed.data.bioMd ?? null,
        photoStoragePath: parsed.data.photoStoragePath ?? null,
        showOnPublic: parsed.data.showOnPublic,
      })
      .returning({ id: sbMembers.id });

    if (!row) return err('Failed to create member.', 'E_INSERT_FAILED');

    if (parsed.data.committeeAssignments.length > 0) {
      await db.insert(committeeAssignments).values(
        parsed.data.committeeAssignments.map((a) => ({
          tenantId,
          memberId: row.id,
          committeeId: a.committeeId,
          role: a.role,
          startDate: today,
        })),
      );
    }

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.created',
      category: 'member',
      targetType: 'sb_member',
      targetId: row.id,
      metadata: { fullName: parsed.data.fullName, position: parsed.data.position },
    });

    revalidatePath('/admin/members');
    revalidatePath('/members');
    return ok({ id: row.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create member.', 'E_UNKNOWN');
  }
}

export async function updateMember(raw: unknown): Promise<Result<void>> {
  const parsed = updateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  const isSelf = ctx.profile.memberId === parsed.data.memberId;
  const isAuthorized = ALLOWED_ROLES.includes(ctx.profile.role as (typeof ALLOWED_ROLES)[number]);
  if (!isAuthorized && !isSelf) {
    return err('You can only edit your own profile.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const today = new Date().toISOString().slice(0, 10);

    const result = await db
      .update(sbMembers)
      .set({
        fullName: parsed.data.fullName,
        honorific: parsed.data.honorific,
        position: parsed.data.position,
        termStartYear: parsed.data.termStartYear,
        termEndYear: parsed.data.termEndYear,
        seniority: parsed.data.seniority ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        contactPhone: parsed.data.contactPhone ?? null,
        bioMd: parsed.data.bioMd ?? null,
        photoStoragePath: parsed.data.photoStoragePath ?? null,
        showOnPublic: parsed.data.showOnPublic,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .returning({ id: sbMembers.id });

    if (result.length === 0) return err('Member not found.', 'E_NOT_FOUND');

    if (isAuthorized) {
      await db
        .delete(committeeAssignments)
        .where(
          and(
            eq(committeeAssignments.tenantId, tenantId),
            eq(committeeAssignments.memberId, parsed.data.memberId),
            isNull(committeeAssignments.endDate),
          ),
        );
      if (parsed.data.committeeAssignments.length > 0) {
        await db.insert(committeeAssignments).values(
          parsed.data.committeeAssignments.map((a) => ({
            tenantId,
            memberId: parsed.data.memberId,
            committeeId: a.committeeId,
            role: a.role,
            startDate: today,
          })),
        );
      }
    }

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.updated',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      metadata: { fullName: parsed.data.fullName },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    revalidatePath(`/members/${parsed.data.memberId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update member.', 'E_UNKNOWN');
  }
}
