import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';

import * as schema from './schema';

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: env.NODE_ENV === 'production' ? 10 : 1,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
export * from './schema';
