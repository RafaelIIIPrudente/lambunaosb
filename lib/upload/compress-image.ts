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

  // Process largest → smallest. Keep a variant when its bytes are <= the
  // smallest already-kept (so a strictly-smaller variant always wins, but a
  // tied byte-size variant is still kept). Tied bytes happen when the source
  // is small enough that downscaling doesn't actually shrink the encoded
  // output — every consumer surface (thumb/inline/hero) still needs a file
  // at its requested size, so we'd rather store a few duplicate KB than
  // 404 the lookup.
  const kept: ImageVariant[] = [];
  let smallestKeptBytes = Number.POSITIVE_INFINITY;

  for (const size of VARIANT_SIZES_LARGEST_FIRST) {
    const blob = await imageCompression(file, {
      maxWidthOrHeight: size,
      fileType: 'image/webp',
      useWebWorker: true,
      initialQuality,
      alwaysKeepResolution: false,
    });
    if (blob.size <= smallestKeptBytes) {
      kept.push({ size, blob, byteSize: blob.size });
      smallestKeptBytes = blob.size;
    }
  }

  // Caller expects ascending sizes (400, 800, 1600) for predictable iteration.
  kept.sort((a, b) => a.size - b.size);

  const totalBytes = kept.reduce((acc, v) => acc + v.byteSize, 0);
  return { variants: kept, totalBytes };
}
