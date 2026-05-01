import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/env';

/**
 * Service-role Supabase client. Bypasses RLS — confine to admin tasks
 * (auth invites, retention sweeps, system jobs). Never import from a Client
 * Component or any module a Client Component can transitively reach.
 */
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
