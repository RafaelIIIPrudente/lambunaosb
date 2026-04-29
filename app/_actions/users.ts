'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { profiles } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  deactivateUserSchema,
  inviteUserSchema,
  updateUserRoleSchema,
} from '@/lib/validators/user';

export async function inviteUser(raw: unknown): Promise<Result<{ userId: string }>> {
  const parsed = inviteUserSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can invite users.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password/callback`,
    });

    if (error || !data.user) {
      return err(error?.message ?? 'Invite failed.', 'E_INVITE_FAILED');
    }

    await db.insert(profiles).values({
      id: data.user.id,
      tenantId,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      memberId: parsed.data.memberId ?? null,
      invitedAt: new Date(),
      active: true,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'user.invited',
      category: 'user',
      targetType: 'profile',
      targetId: data.user.id,
      alert: true,
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath('/admin/users');
    return ok({ userId: data.user.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to invite user.', 'E_UNKNOWN');
  }
}

export async function updateUserRole(raw: unknown): Promise<Result<void>> {
  const parsed = updateUserRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can change roles.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)))
      .limit(1);

    if (!existing) return err('User not found.', 'E_NOT_FOUND');

    await db
      .update(profiles)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'user.role_changed',
      category: 'user',
      targetType: 'profile',
      targetId: parsed.data.userId,
      alert: true,
      metadata: { previousRole: existing.role, newRole: parsed.data.role },
    });

    revalidatePath('/admin/users');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update role.', 'E_UNKNOWN');
  }
}

export async function deactivateUser(raw: unknown): Promise<Result<void>> {
  const parsed = deactivateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can deactivate users.', 'E_FORBIDDEN');
  }

  if (parsed.data.userId === ctx.userId) {
    return err('You cannot deactivate yourself.', 'E_SELF_ACTION');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const result = await db
      .update(profiles)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)))
      .returning({ id: profiles.id });

    if (result.length === 0) return err('User not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'user.deactivated',
      category: 'user',
      targetType: 'profile',
      targetId: parsed.data.userId,
      alert: true,
    });

    revalidatePath('/admin/users');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to deactivate user.', 'E_UNKNOWN');
  }
}
