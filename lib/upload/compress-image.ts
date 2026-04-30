import imageCompression from 'browser-image-compression';

export type ImageVariantSize = 400 | 800 | 1600;

export type ImageVariant = {
  size: ImageVariantSize;
  blob: Blob;
  byteSize: number;
};

export type CompressImageResult = {
  variants: ImageVariant[];
  totalBytes: number;
};

export type CompressImageOptions = {
  /** Initial WebP quality. 0.72 default; portrait surface passes 0.78. */
  quality?: number;
};

const VARIANT_SIZES_LARGEST_FIRST = [1600, 800, 400] as const satisfies readonly ImageVariantSize[];

const DEFAULT_QUALITY = 0.72;

export async function compressImage(
  file: File,
  opts: CompressImageOptions = {},
): Promise<CompressImageResult> {
  const initialQuality = opts.quality ?? DEFAULT_QUALITY;

  // Process largest → smallest so we can drop a smaller-target variant whose
  // produced bytes are not actually smaller than the next-larger one we kept.
  // Defensive: a 600 px source re-encoded at WebP/q72 may produce identical
  // bytes for the 800 and 1600 targets; in that case shipping both is waste.
  const kept: ImageVariant[] = [];
  let largestKeptBytes = Number.POSITIVE_INFINITY;

  for (const size of VARIANT_SIZES_LARGEST_FIRST) {
    const blob = await imageCompression(file, {
      maxWidthOrHeight: size,
      fileType: 'image/webp',
      useWebWorker: true,
      initialQuality,
      alwaysKeepResolution: false,
    });
    if (blob.size < largestKeptBytes) {
      kept.push({ size, blob, byteSize: blob.size });
      largestKeptBytes = blob.size;
    }
  }

  // Caller expects ascending sizes (400, 800, 1600) for predictable iteration.
  kept.sort((a, b) => a.size - b.size);

  const totalBytes = kept.reduce((acc, v) => acc + v.byteSize, 0);
  return { variants: kept, totalBytes };
}
