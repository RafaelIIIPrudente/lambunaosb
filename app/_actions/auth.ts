'use server';

import 'server-only';

import { redirect } from 'next/navigation';

import { env } from '@/env';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeAudit } from '@/lib/services/audit';
import { createClient } from '@/lib/supabase/server';
import { ok, err, type Result } from '@/lib/types/result';
import {
  resetPasswordRequestSchema,
  setNewPasswordSchema,
  signInSchema,
} from '@/lib/validators/auth';

export async function signIn(raw: unknown): Promise<Result<never>> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return err('Please check your email and password.', 'E_VALIDATION');
  }

  const redirectTo = parsed.data.redirectTo ?? '/admin/dashboard';

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      // Log the failed attempt with the attempted email (no password). actor
      // is null because the credential didn't validate.
      await writeAudit({
        actorId: null,
        actorRole: null,
        action: 'auth.signin_failed',
        category: 'security',
        targetType: 'auth',
        targetId: parsed.data.email,
        alert: true,
        metadata: { email: parsed.data.email, reason: error?.message ?? 'unknown' },
      });
      return err('Invalid email or password.', 'E_INVALID_CREDENTIALS');
    }

    // Successful sign-in: log + bump last_sign_in_at on the profile so the
    // /admin/users list can distinguish "Pending invite" from "Active".
    const userId = data.user.id;
    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    await Promise.all([
      db
        .update(profiles)
        .set({ lastSignInAt: new Date(), updatedAt: new Date() })
        .where(eq(profiles.id, userId)),
      writeAudit({
        actorId: userId,
        actorRole: profile?.role ?? null,
        action: 'auth.signin_succeeded',
        category: 'security',
        targetType: 'auth',
        targetId: userId,
        metadata: { email: parsed.data.email },
      }),
    ]);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Sign-in failed.', 'E_UNKNOWN');
  }

  redirect(redirectTo);
}

export async function signOut(): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    if (user) {
      await writeAudit({
        actorId: user.id,
        actorRole: null,
        action: 'auth.signout',
        category: 'security',
        targetType: 'auth',
        targetId: user.id,
      });
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Sign-out failed.', 'E_UNKNOWN');
  }
  redirect('/login');
}

export async function requestPasswordReset(raw: unknown): Promise<Result<void>> {
  const parsed = resetPasswordRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return err('Please enter a valid email.', 'E_VALIDATION');
  }

  // Always return ok regardless of whether the email exists. Surfacing
  // Supabase's raw error here would let an attacker enumerate valid admin
  // emails by toggling the form. Errors are logged + audited server-side
  // only.
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password/callback`,
    });
    await writeAudit({
      actorId: null,
      actorRole: null,
      action: 'auth.password_reset_requested',
      category: 'security',
      targetType: 'auth',
      targetId: parsed.data.email,
      metadata: {
        email: parsed.data.email,
        ...(error ? { supabaseError: error.message } : {}),
      },
    });
  } catch (e) {
    // Log but still return ok — we don't tell the caller whether the email
    // matched a user.
    await writeAudit({
      actorId: null,
      actorRole: null,
      action: 'auth.password_reset_requested',
      category: 'security',
      targetType: 'auth',
      targetId: parsed.data.email,
      metadata: {
        email: parsed.data.email,
        error: e instanceof Error ? e.message : 'unknown',
      },
    });
  }
  return ok(undefined);
}

export async function setNewPassword(raw: unknown): Promise<Result<void>> {
  const parsed = setNewPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
    if (exchangeError) {
      return err('This reset link has expired. Please request a new one.', 'E_INVALID_TOKEN');
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) {
      return err(error.message, 'E_UPDATE_FAILED');
    }
    if (user) {
      await writeAudit({
        actorId: user.id,
        actorRole: null,
        action: 'auth.password_changed',
        category: 'security',
        targetType: 'auth',
        targetId: user.id,
        alert: true,
      });
    }
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Password update failed.', 'E_UNKNOWN');
  }
}
