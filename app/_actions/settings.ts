'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { profiles, tenants } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  updateNotificationPreferencesSchema,
  updatePasswordSchema,
  updateProfileSchema,
  updateTenantSettingsSchema,
} from '@/lib/validators/settings';

export async function updateProfile(raw: unknown): Promise<Result<void>> {
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const tenantId = await getCurrentTenantId();
    await db
      .update(profiles)
      .set({
        fullName: parsed.data.fullName,
        title: parsed.data.title ?? null,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        uiLocale: parsed.data.uiLocale,
        timeZone: parsed.data.timeZone,
        updatedAt: new Date(),
      })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, ctx.userId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'profile.updated',
      category: 'user',
      targetType: 'profile',
      targetId: ctx.userId,
    });

    revalidatePath('/admin/settings');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update profile.', 'E_UNKNOWN');
  }
}

export async function updatePassword(raw: unknown): Promise<Result<void>> {
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ctx.email,
      password: parsed.data.currentPassword,
    });
    if (signInError) {
      return err('Current password is incorrect.', 'E_INVALID_CREDENTIALS');
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) return err(error.message, 'E_UPDATE_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'profile.password_changed',
      category: 'security',
      targetType: 'profile',
      targetId: ctx.userId,
      alert: true,
    });

    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update password.', 'E_UNKNOWN');
  }
}

export async function updateNotificationPreferences(raw: unknown): Promise<Result<void>> {
  const parsed = updateNotificationPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const tenantId = await getCurrentTenantId();
    await db
      .update(profiles)
      .set({ notificationPreferences: parsed.data, updatedAt: new Date() })
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, ctx.userId)));

    revalidatePath('/admin/settings');
    return ok(undefined);
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Failed to update notification preferences.',
      'E_UNKNOWN',
    );
  }
}

export async function updateTenantSettings(raw: unknown): Promise<Result<void>> {
  const parsed = updateTenantSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can update tenant settings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    await db
      .update(tenants)
      .set({
        displayName: parsed.data.displayName,
        contactEmail: parsed.data.contactEmail,
        dpoEmail: parsed.data.dpoEmail,
        contactPhone: parsed.data.contactPhone ?? null,
        officeAddress: parsed.data.officeAddress ?? null,
        officeHoursMd: parsed.data.officeHoursMd ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'tenant.updated',
      category: 'system',
      targetType: 'tenant',
      targetId: tenantId,
    });

    revalidatePath('/admin/settings');
    revalidatePath('/about');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update tenant.', 'E_UNKNOWN');
  }
}

export async function signOutOtherSessions(): Promise<Result<void>> {
  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) return err(error.message, 'E_SIGN_OUT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'profile.signed_out_others',
      category: 'security',
      targetType: 'profile',
      targetId: ctx.userId,
      alert: true,
    });

    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to sign out other sessions.', 'E_UNKNOWN');
  }
}
