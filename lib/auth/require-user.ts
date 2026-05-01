import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { profiles, type Profile } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type AuthContext = {
  userId: string;
  email: string;
  profile: Profile;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile || !profile.active) return null;

  return { userId: user.id, email: user.email ?? profile.email, profile };
}

export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function requireRole(roles: Profile['role'][]): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!roles.includes(ctx.profile.role)) {
    redirect('/admin/dashboard');
  }
  return ctx;
}
