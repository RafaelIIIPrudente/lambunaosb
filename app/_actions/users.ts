'use server';

import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
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
  reactivateUserSchema,
  resendInviteSchema,
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
      .select({ role: profiles.role, active: profiles.active })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)))
      .limit(1);

    if (!existing) return err('User not found.', 'E_NOT_FOUND');

    // Decision 10 (b): block demoting the only active Secretary. Counted at
    // mutation time so it can't drift between page render and submit.
    if (existing.role === 'secretary' && parsed.data.role !== 'secretary') {
      const [counts] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(profiles)
        .where(
          and(
            eq(profiles.tenantId, tenantId),
            eq(profiles.role, 'secretary'),
            eq(profiles.active, true),
          ),
        );
      const activeSecretaries = Number(counts?.total ?? 0);
      if (activeSecretaries <= 1) {
        return err(
          'Cannot demote the only active Secretary. Promote another user to Secretary first.',
          'E_LAST_SECRETARY',
        );
      }
    }

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

export async function reactivateUser(raw: unknown): Promise<Result<void>> {
  const parsed = reactivateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can reactivate users.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ active: profiles.active, email: profiles.email, role: profiles.role })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)))
      .limit(1);

    if (!existing) return err('User not found.', 'E_NOT_FOUND');
    if (existing.active) return ok(undefined);

    await db
      .update(profiles)
      .set({ active: true, updatedAt: new Date() })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'user.reactivated',
      category: 'user',
      targetType: 'profile',
      targetId: parsed.data.userId,
      alert: true,
      metadata: { email: existing.email, role: existing.role },
    });

    revalidatePath('/admin/users');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to reactivate user.', 'E_UNKNOWN');
  }
}

export async function resendInvite(raw: unknown): Promise<Result<void>> {
  const parsed = resendInviteSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can resend invites.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        email: profiles.email,
        role: profiles.role,
        active: profiles.active,
        lastSignInAt: profiles.lastSignInAt,
      })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)))
      .limit(1);

    if (!existing) return err('User not found.', 'E_NOT_FOUND');
    if (!existing.active) {
      return err('Reactivate the user before resending the invite.', 'E_INACTIVE');
    }
    if (existing.lastSignInAt !== null) {
      return err(
        'This user has already signed in. Use a password reset instead.',
        'E_ALREADY_ACCEPTED',
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(existing.email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password/callback`,
    });

    if (error) {
      return err(error.message, 'E_INVITE_FAILED');
    }

    await db
      .update(profiles)
      .set({ invitedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, parsed.data.userId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'user.invite_resent',
      category: 'user',
      targetType: 'profile',
      targetId: parsed.data.userId,
      alert: true,
      metadata: { email: existing.email, role: existing.role },
    });

    revalidatePath('/admin/users');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to resend invite.', 'E_UNKNOWN');
  }
}
