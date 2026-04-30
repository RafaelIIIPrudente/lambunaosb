import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles, type Profile } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type UserRowData = {
  id: string;
  fullName: string;
  email: string;
  role: Profile['role'];
  active: boolean;
  invitedAt: Date | null;
  lastSignInAt: Date | null;
};

export async function getUsersList(): Promise<UserRowData[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      active: profiles.active,
      invitedAt: profiles.invitedAt,
      lastSignInAt: profiles.lastSignInAt,
    })
    .from(profiles)
    .where(eq(profiles.tenantId, tenantId))
    .orderBy(asc(profiles.fullName));

  return rows;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, userId)))
    .limit(1);
  return row ?? null;
}
