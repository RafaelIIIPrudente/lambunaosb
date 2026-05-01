import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';

export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;

export async function createSignedStorageUrl(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
