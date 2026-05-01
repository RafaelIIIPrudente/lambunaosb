import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { profiles, type Profile } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type AuthContext = {
  status: 'approved';
  userId: string;
  email: string;
  profile: Profile;
};

export type PendingContext = {
  status: 'pending';
  userId: string;
  email: string;
};

export type AnyAuthContext = AuthContext | PendingContext;

function isApproved(profile: Profile): boolean {
  return profile.active && profile.role !== 'pending';
}

export async function getAnyAuthContext(): Promise<AnyAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) return null;

  if (isApproved(profile)) {
    return {
      status: 'approved',
      userId: user.id,
      email: user.email ?? profile.email,
      profile,
    };
  }
  return { status: 'pending', userId: user.id, email: user.email ?? profile.email };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const ctx = await getAnyAuthContext();
  if (!ctx || ctx.status !== 'approved') return null;
  return ctx;
}

export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAnyAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.status === 'pending') redirect('/pending');
  return ctx;
}

export async function requireRole(roles: Profile['role'][]): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!roles.includes(ctx.profile.role)) {
    redirect('/admin/dashboard');
  }
  return ctx;
}
