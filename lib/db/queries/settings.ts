import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles, type Profile, tenants, type Tenant } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return row ?? null;
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row ?? null;
}
