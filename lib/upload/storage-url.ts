import 'server-only';

import { createSignedStorageUrl } from '@/lib/supabase/signed-urls';
import type { createAdminClient } from '@/lib/supabase/admin';

import type { ImageVariantSize } from '@/lib/upload/compress-image';

export type ImageSurface = 'thumb' | 'inline' | 'hero-mobile' | 'hero-desktop';

export function pickSizeForSurface(surface: ImageSurface): ImageVariantSize {
  switch (surface) {
    case 'thumb':
      return 400;
    case 'inline':
    case 'hero-mobile':
      return 800;
    case 'hero-desktop':
      return 1600;
  }
}

type GetCompressedImageUrlArgs = {
  supabase: ReturnType<typeof createAdminClient>;
  bucket: string;
  /** The path *prefix* stored in the DB (no extension). */
  prefix: string | null;
  size: ImageVariantSize;
};

/**
 * Build a signed URL for one pre-generated WebP variant. The DB stores the
 * upload-time prefix; this helper appends `_<size>.webp` and signs it.
 *
 * On Supabase Free plan there is no on-the-fly Image Transformations API —
 * the variants must already exist in Storage from upload-time compression.
 * The Pro upgrade swap is documented in docs/storage-optimization.md.
 */
export async function getCompressedImageUrl(
  args: GetCompressedImageUrlArgs,
): Promise<string | null> {
  const { supabase, bucket, prefix, size } = args;
  if (!prefix) return null;
  return createSignedStorageUrl(supabase, bucket, `${prefix}_${size}.webp`);
}
