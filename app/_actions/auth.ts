'use server';

import 'server-only';

import { redirect } from 'next/navigation';

import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';
import { ok, err, type Result } from '@/lib/types/result';
import {
  resetPasswordRequestSchema,
  setNewPasswordSchema,
  signInSchema,
} from '@/lib/validators/auth';

export async function signIn(raw: unknown): Promise<Result<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return err('Please check your email and password.', 'E_VALIDATION');
  }

  // MOCK_DATA mode: accept any non-empty creds. No real session is created —
  // the admin layout's auth guard is also bypassed because AUTH_ENABLED should
  // be false in this mode (otherwise the redirect target loops back here).
  if (env.MOCK_DATA) {
    return ok({ redirectTo: parsed.data.redirectTo ?? '/admin/dashboard' });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return err('Invalid email or password.', 'E_INVALID_CREDENTIALS');
    }

    return ok({ redirectTo: parsed.data.redirectTo ?? '/admin/dashboard' });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Sign-in failed.', 'E_UNKNOWN');
  }
}

export async function signOut(): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password/callback`,
    });
    if (error) {
      return err(error.message, 'E_RESET_FAILED');
    }
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Reset request failed.', 'E_UNKNOWN');
  }
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
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) {
      return err(error.message, 'E_UPDATE_FAILED');
    }
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Password update failed.', 'E_UNKNOWN');
  }
}
