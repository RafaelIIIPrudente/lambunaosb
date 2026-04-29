import 'server-only';

import { eq } from 'drizzle-orm';

import { env } from '@/env';
import { db } from '@/lib/db';
import { tenants, type Tenant } from '@/lib/db/schema';

import { MOCK_TENANT } from './_mock-data';

export const TENANT_SLUG = 'lambunao';

let cachedTenant: Tenant | null = null;

export async function getCurrentTenant(): Promise<Tenant> {
  if (env.MOCK_DATA) return MOCK_TENANT;
  if (cachedTenant) return cachedTenant;
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, TENANT_SLUG)).limit(1);
  if (!row) {
    throw new Error(`Tenant "${TENANT_SLUG}" not found. Run \`pnpm db:seed\` to seed it.`);
  }
  cachedTenant = row;
  return row;
}

export async function getCurrentTenantId(): Promise<string> {
  const tenant = await getCurrentTenant();
  return tenant.id;
}
