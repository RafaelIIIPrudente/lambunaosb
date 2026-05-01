import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';

import * as schema from './schema';

// Pool sizing: each Node process (Vercel function, build worker, dev server)
// gets its own pool. Use Supabase's Transaction pooler (port 6543) — it
// scales to thousands of concurrent clients because each query borrows and
// releases a connection immediately. Session pooler (port 5432) caps at 15
// project-wide and runs out under parallel prerender. max:1 is plenty per
// worker since RSC fetches are sequential within a render.
const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 1,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
export * from './schema';
