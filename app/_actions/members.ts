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
import {
  archiveMemberSchema,
  changeMemberPositionSchema,
  deactivateMemberSchema,
  memberSchema,
  reactivateMemberSchema,
  replaceCommitteeAssignmentsSchema,
  updateMemberPhotoSchema,
  updateMemberSchema,
} from '@/lib/validators/member';

const AUTHOR_ROLES = ['secretary', 'vice_mayor'] as const;

type Role = 'secretary' | 'mayor' | 'vice_mayor' | 'sb_member';

function hasAuthorRole(role: string): boolean {
  return (AUTHOR_ROLES as readonly string[]).includes(role);
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createMember(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to create members.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const today = todayDateString();

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
        sortOrder: parsed.data.sortOrder,
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
      metadata: {
        fullName: parsed.data.fullName,
        position: parsed.data.position,
        committeeCount: parsed.data.committeeAssignments.length,
      },
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
  if (!hasAuthorRole(ctx.profile.role) && !isSelf) {
    return err('You can only edit your own profile.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    // Position changes go through changeMemberPosition. updateMember intentionally
    // ignores incoming position to keep audit categories distinct.
    const result = await db
      .update(sbMembers)
      .set({
        fullName: parsed.data.fullName,
        honorific: parsed.data.honorific,
        termStartYear: parsed.data.termStartYear,
        termEndYear: parsed.data.termEndYear,
        seniority: parsed.data.seniority ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        contactPhone: parsed.data.contactPhone ?? null,
        bioMd: parsed.data.bioMd ?? null,
        showOnPublic: parsed.data.showOnPublic,
        sortOrder: parsed.data.sortOrder,
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

export async function changeMemberPosition(raw: unknown): Promise<Result<void>> {
  const parsed = changeMemberPositionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to change member positions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ position: sbMembers.position })
      .from(sbMembers)
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Member not found.', 'E_NOT_FOUND');
    if (existing.position === parsed.data.newPosition) {
      return err('Position is already set to that value.', 'E_NO_CHANGE');
    }

    await db
      .update(sbMembers)
      .set({ position: parsed.data.newPosition, updatedAt: new Date() })
      .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, parsed.data.memberId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.position_changed',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      alert: true,
      metadata: { from: existing.position, to: parsed.data.newPosition },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to change position.', 'E_UNKNOWN');
  }
}

export async function updateMemberPhoto(raw: unknown): Promise<Result<void>> {
  const parsed = updateMemberPhotoSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  const isSelf = ctx.profile.memberId === parsed.data.memberId;
  if (!hasAuthorRole(ctx.profile.role) && !isSelf) {
    return err('You can only update your own photo.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const result = await db
      .update(sbMembers)
      .set({ photoStoragePath: parsed.data.storagePath, updatedAt: new Date() })
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .returning({ id: sbMembers.id });

    if (result.length === 0) return err('Member not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.photo_uploaded',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      metadata: { storagePath: parsed.data.storagePath, byteSize: parsed.data.byteSize ?? null },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    revalidatePath(`/members/${parsed.data.memberId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update photo.', 'E_UNKNOWN');
  }
}

export async function deactivateMember(raw: unknown): Promise<Result<void>> {
  const parsed = deactivateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to deactivate members.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ active: sbMembers.active })
      .from(sbMembers)
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Member not found.', 'E_NOT_FOUND');
    if (!existing.active) return err('Member is already inactive.', 'E_INVALID_STATE');

    await db
      .update(sbMembers)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, parsed.data.memberId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.deactivated',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to deactivate member.', 'E_UNKNOWN');
  }
}

export async function reactivateMember(raw: unknown): Promise<Result<void>> {
  const parsed = reactivateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to reactivate members.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ active: sbMembers.active })
      .from(sbMembers)
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Member not found.', 'E_NOT_FOUND');
    if (existing.active) return err('Member is already active.', 'E_INVALID_STATE');

    await db
      .update(sbMembers)
      .set({ active: true, updatedAt: new Date() })
      .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, parsed.data.memberId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.reactivated',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to reactivate member.', 'E_UNKNOWN');
  }
}

export async function archiveMember(raw: unknown): Promise<Result<void>> {
  const parsed = archiveMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== ('secretary' satisfies Role)) {
    return err('Only the Secretary can archive members.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ id: sbMembers.id, deletedAt: sbMembers.deletedAt })
      .from(sbMembers)
      .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, parsed.data.memberId)))
      .limit(1);
    if (!existing) return err('Member not found.', 'E_NOT_FOUND');
    if (existing.deletedAt) return err('Member is already archived.', 'E_INVALID_STATE');

    const deletedAt = new Date();
    await db
      .update(sbMembers)
      .set({ deletedAt, active: false, updatedAt: deletedAt })
      .where(and(eq(sbMembers.tenantId, tenantId), eq(sbMembers.id, parsed.data.memberId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.archived',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      alert: true,
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to archive member.', 'E_UNKNOWN');
  }
}

export async function replaceCommitteeAssignments(raw: unknown): Promise<Result<void>> {
  const parsed = replaceCommitteeAssignmentsSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasAuthorRole(ctx.profile.role)) {
    return err('You do not have permission to manage committee assignments.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const today = todayDateString();

    // Verify member exists.
    const [member] = await db
      .select({ id: sbMembers.id })
      .from(sbMembers)
      .where(
        and(
          eq(sbMembers.tenantId, tenantId),
          eq(sbMembers.id, parsed.data.memberId),
          isNull(sbMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!member) return err('Member not found.', 'E_NOT_FOUND');

    // Diff against currently active assignments. End-date the removals (preserves
    // history) and insert new rows for the additions. Role changes are an end + insert.
    const current = await db
      .select({
        id: committeeAssignments.id,
        committeeId: committeeAssignments.committeeId,
        role: committeeAssignments.role,
      })
      .from(committeeAssignments)
      .where(
        and(
          eq(committeeAssignments.tenantId, tenantId),
          eq(committeeAssignments.memberId, parsed.data.memberId),
          isNull(committeeAssignments.endDate),
        ),
      );

    const currentByKey = new Map(current.map((c) => [`${c.committeeId}:${c.role}`, c]));
    const desiredByKey = new Map(
      parsed.data.assignments.map((a) => [`${a.committeeId}:${a.role}`, a]),
    );

    const toEnd = current.filter((c) => !desiredByKey.has(`${c.committeeId}:${c.role}`));
    const toAdd = parsed.data.assignments.filter(
      (a) => !currentByKey.has(`${a.committeeId}:${a.role}`),
    );

    for (const row of toEnd) {
      await db
        .update(committeeAssignments)
        .set({ endDate: today })
        .where(eq(committeeAssignments.id, row.id));
    }

    if (toAdd.length > 0) {
      await db.insert(committeeAssignments).values(
        toAdd.map((a) => ({
          tenantId,
          memberId: parsed.data.memberId,
          committeeId: a.committeeId,
          role: a.role,
          startDate: today,
        })),
      );
    }

    if (toEnd.length === 0 && toAdd.length === 0) {
      return ok(undefined);
    }

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'member.committee_assignments_updated',
      category: 'member',
      targetType: 'sb_member',
      targetId: parsed.data.memberId,
      metadata: {
        added: toAdd.map((a) => ({ committeeId: a.committeeId, role: a.role })),
        ended: toEnd.map((r) => ({ committeeId: r.committeeId, role: r.role })),
      },
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${parsed.data.memberId}`);
    revalidatePath('/members');
    revalidatePath(`/members/${parsed.data.memberId}`);
    return ok(undefined);
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Failed to update committee assignments.',
      'E_UNKNOWN',
    );
  }
}
