import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';

import * as schema from './schema';

// Pool sizing: each Node process (Vercel function, build worker, dev server)
// gets its own pool. Supabase's Session pooler caps at 15 sessions per
// project — and that cap is shared with Studio, drizzle-kit, and any other
// process connecting at the same time. max:2 fits ~7 build workers in the
// 15-slot ceiling and is plenty for a single Vercel function. Switch to the
// Transaction pooler (port 6543) if you need higher fan-out.
const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 2,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
export * from './schema';
