import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { committees, type Committee } from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export async function getCommittees(): Promise<Committee[]> {
  const tenantId = await getCurrentTenantId();
  return db
    .select()
    .from(committees)
    .where(eq(committees.tenantId, tenantId))
    .orderBy(asc(committees.sortOrder), asc(committees.name));
}
