# SB Lambunao — Storage Optimization

**When to read this:** when adding, debugging, or extending any code path that uploads photos or resolution PDFs to Supabase Storage. This is the single source of truth for how compression, sizing, bucket policies, and URL resolution work in this project.

---

## a. Goal and Free-plan constraint

**Goal.** Keep `~1 GB Storage` and `~5 GB monthly egress` (Supabase Free plan) sufficient for SB Lambunao's first 12–18 months of operation, while serving photos that look right on every viewport and PDFs that remain text-selectable.

**Constraint.** The Supabase Free plan does **not** include:

- **Storage Image Transformations** (Pro-only) — the `?width=…&quality=…` on-the-fly resizing/format-conversion API
- **Smart CDN auto-revalidation** — uploads still hit the basic CDN, but cache invalidation guarantees aren't there

We compensate with **upload-time compression and multi-size pre-generation**:

1. Convert every photo to **WebP** in the browser before uploading.
2. Pre-generate **three size variants** per photo (`_400.webp`, `_800.webp`, `_1600.webp`) so each render surface fetches the right size without a server-side resize.
3. Re-save every PDF losslessly with `pdf-lib` (metadata strip + flate compression) and cap at 10 MB.

The Pro-upgrade swap is documented in section **l**.

---

## b. Audit snapshot

### Existing four buckets

All four are `public = false`. RLS lives in `lib/db/policies/19_storage_resolutions_pdfs.sql` through `22_storage_news_galleries.sql`.

| Bucket id           | Purpose                  | Path convention                                      |
| ------------------- | ------------------------ | ---------------------------------------------------- |
| `resolutions-pdfs`  | Resolution PDF documents | `<tenant_id>/<resolution_id>/<timestamp>_<safeName>` |
| `members-portraits` | SB member portraits      | `<tenant_id>/<member_id>/<timestamp>_<safeName>`     |
| `news-covers`       | News article cover image | `<tenant_id>/<news_post_id>/<timestamp>_<safeName>`  |
| `news-galleries`    | News article gallery     | `<tenant_id>/<news_post_id>/<timestamp>_<safeName>`  |

### Server actions

All four take `{ storagePath, byteSize }` and persist to a single column on the parent row.

| Action                  | Validator                     | Column written                                   |
| ----------------------- | ----------------------------- | ------------------------------------------------ |
| `updateNewsPostCover`   | `updateNewsPostCoverSchema`   | `news_posts.cover_storage_path`                  |
| `replaceNewsPostPhotos` | `replaceNewsPostPhotosSchema` | `news_posts.photos` (JSONB array)                |
| `updateMemberPhoto`     | `updateMemberPhotoSchema`     | `sb_members.photo_storage_path`                  |
| `uploadResolutionPdf`   | `uploadResolutionPdfSchema`   | `resolutions.pdf_storage_path` + `pdf_byte_size` |

### Storage-path semantics

- **Image surfaces (cover, gallery, portrait):** `storagePath` is the _prefix_ (no extension). The URL helper appends `_<size>.webp` per surface.
- **PDF surface:** `storagePath` is the full file path (with `.pdf` extension), unchanged from the previous design.

### byteSize semantics

- **Image surfaces:** sum of all kept variants' bytes (so the value reflects total storage cost of one upload).
- **PDF surface:** the byte size of the final compressed file.

---

## c. Per-asset-type plan

### News article cover images — `news-covers`

| Field                      | Value                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| Source size limit (client) | 8 MB raw                                                              |
| Compression                | `compressImage(file)` — quality 0.72                                  |
| Variants                   | `_400.webp`, `_800.webp`, `_1600.webp`                                |
| Per-variant bucket cap     | 500 KB (enforced in `storage.buckets`)                                |
| Storage path               | prefix: `<tenant>/<post>/<ts>_<safeNameNoExt>`                        |
| `byteSize` semantic        | sum of kept variants                                                  |
| Default render size        | thumb (400 px) for cards, hero-desktop (1600 px) for the article hero |

### News article gallery photos — `news-galleries`

Same as cover (quality 0.72, three variants, 500 KB bucket cap, sum byteSize). Up to 15 photos per post (enforced by `MAX_GALLERY_PHOTOS` in `lib/validators/news-post.ts`). Default render: inline (800 px) — gallery items are presented as 1–3-column grids on the public detail page.

### SB member portraits — `members-portraits`

| Field                      | Value                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Source size limit (client) | 8 MB raw                                                                                    |
| Compression                | `compressImage(file, { quality: 0.78 })` — higher than default; faces are quality-sensitive |
| Variants                   | `_400.webp`, `_800.webp`, `_1600.webp`                                                      |
| Per-variant bucket cap     | 500 KB                                                                                      |
| Storage path               | prefix: `<tenant>/<member>/<ts>_<safeNameNoExt>`                                            |
| `byteSize` semantic        | sum of kept variants                                                                        |
| Default render size        | thumb (400 px) for member cards, inline (800 px) for the member detail page                 |

### Sangguniang Bayan resolution PDFs — `resolutions-pdfs`

| Field                      | Value                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Source size limit (client) | 25 MB raw (defensive — bails before `pdf-lib` loads anything pathological)                         |
| Compression                | `compressPdf(file)` — lossless re-save, metadata stripped, object-stream flate compression         |
| Bucket cap                 | 10 MB (post-compression hard cap; enforced in `storage.buckets`)                                   |
| If compressed > 10 MB      | abort with hint: _"Tip: in Acrobat, File → Save as Other → Reduced Size PDF before re-uploading."_ |
| Storage path               | full path: `<tenant>/<resolution>/<timestamp>_<safeName>` (with `.pdf`)                            |
| `byteSize` semantic        | byte size of the final compressed PDF                                                              |
| Render path                | original signed URL via `createSignedStorageUrl` — PDFs are not size-variant                       |

---

## d. Library choices

### `browser-image-compression@^2.0.2`

- **What it does:** Canvas + Web Worker pipeline that resizes and re-encodes images to the requested `fileType` and `initialQuality`. Used to produce three WebP variants per photo upload.
- **Why:** battle-tested (~20k weekly downloads), zero-dependency, supports `image/webp` output, parallelizable via `useWebWorker: true`.
- **Bundle cost:** ~12 KB gzipped (excluding the worker, which is fetched lazily on first compression).
- **Worker behavior:** spawns a Web Worker for the heavy resize/encode loop so the main thread stays responsive. `useWebWorker: true` is set.
- **What it can't do:** AVIF output (we don't need it), HEIC input (defer; iOS Safari rasterizes HEIC to JPEG before File reaches us).

### `pdf-lib@^1.17.1`

- **What it does:** Pure-JS PDF reader/writer. We use `PDFDocument.load`, `setTitle/Author/Subject/Keywords/Creator/Producer` (all to `''`), then `save({ useObjectStreams: true, addDefaultPage: false })`.
- **Why:** the only Vercel-runtime-friendly PDF library that can re-save a PDF without re-rendering. Lossless. Preserves text, fonts, signatures, form fields.
- **What it can't do:** image-stream re-encoding. If a PDF contains a 5 MP scan as an embedded image, this won't shrink that image. For scan-only PDFs, ask the user to use Acrobat's "Reduced Size PDF" before upload (the UI hints this when the post-compression size exceeds 10 MB).

---

## e. Bucket SQL

These statements are appended to `lib/db/policies/19_storage_resolutions_pdfs.sql` through `22_storage_news_galleries.sql`. They run after the `insert into storage.buckets` and policy creation in those files.

```sql
-- 19_storage_resolutions_pdfs.sql
update storage.buckets
  set file_size_limit = 10485760, -- 10 MB
      allowed_mime_types = array['application/pdf']
  where id = 'resolutions-pdfs';

-- 20_storage_members_portraits.sql
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'members-portraits';

-- 21_storage_news_covers.sql
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'news-covers';

-- 22_storage_news_galleries.sql
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'news-galleries';
```

The image bucket caps are per-object — each of the three WebP variants is bounded individually. The PDF cap applies to the single uploaded PDF after `compressPdf` runs.

---

## f. Helper code

### `lib/upload/compress-image.ts`

```ts
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
```

### `lib/upload/compress-pdf.ts`

```ts
import { PDFDocument } from 'pdf-lib';

export type CompressPdfResult = {
  blob: Blob;
  byteSize: number;
};

/**
 * Lossless PDF re-save: strips identifying metadata and applies object-stream
 * (flate) compression to the cross-reference table. Image streams are NOT
 * re-encoded — text remains selectable, signatures and form fields survive.
 *
 * Typical reduction on Word-exported or signed-and-scanned PDFs: 10–25%.
 * Callers must still enforce a hard size cap after this runs.
 */
export async function compressPdf(file: File): Promise<CompressPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');

  const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return { blob, byteSize: blob.size };
}
```

### `lib/upload/storage-url.ts`

```ts
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

export async function getCompressedImageUrl(
  args: GetCompressedImageUrlArgs,
): Promise<string | null> {
  const { supabase, bucket, prefix, size } = args;
  if (!prefix) return null;
  return createSignedStorageUrl(supabase, bucket, `${prefix}_${size}.webp`);
}
```

---

## g. Component diffs

The pattern below was applied to all four image uploaders (`_cover-section.tsx`, `_gallery-section.tsx`, `_photo-section.tsx`) and one PDF uploader (`_pdf-section.tsx` plus its sibling `app/(app)/admin/resolutions/new/_form.tsx`).

### Image uploader — common pattern

```diff
+import { compressImage } from '@/lib/upload/compress-image';
+
-const MAX_BYTES = 5 * 1024 * 1024;     // (or 3 MB for cover)
+const MAX_BYTES = 8 * 1024 * 1024;     // 8 MB source cap before client-side WebP compression

 async function handleFile(file: File) {
   /* type + size validation unchanged */

-  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
-  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
-  const path = `${tenantId}/${entityId}/${timestamp}_${safeName}`;
-
-  setProgressLabel(`Uploading ${formatBytes(file.size)}…`);
-  const supabase = createClient();
-  const { error: uploadError } = await supabase.storage
-    .from(BUCKET)
-    .upload(path, file, { contentType: file.type, upsert: false });
-  if (uploadError) { /* ... */ return; }
+  setProgressLabel('Compressing…');
+  const { variants, totalBytes } = await compressImage(file /*, { quality: 0.78 } for portraits */);
+  if (variants.length === 0) { setError('Compression produced no usable variants.'); return; }
+
+  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
+  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
+  const prefix = `${tenantId}/${entityId}/${timestamp}_${safeName}`;
+
+  const supabase = createClient();
+  for (const v of variants) {
+    setProgressLabel(`Uploading ${v.size}px (${formatBytes(v.byteSize)})…`);
+    const { error: uploadError } = await supabase.storage
+      .from(BUCKET)
+      .upload(`${prefix}_${v.size}.webp`, v.blob, {
+        contentType: 'image/webp',
+        cacheControl: '31536000, immutable',
+        upsert: false,
+      });
+    if (uploadError) { /* ... */ return; }
+  }

-  await serverAction({ /* ... */ storagePath: path, byteSize: file.size });
+  await serverAction({ /* ... */ storagePath: prefix, byteSize: totalBytes });
 }
```

### PDF uploader

```diff
+import { compressPdf } from '@/lib/upload/compress-pdf';
+
-const MAX_BYTES = 25 * 1024 * 1024;
+const MAX_BYTES = 10 * 1024 * 1024;          // 10 MB hard cap on the compressed PDF
+const RAW_SOURCE_MAX_BYTES = 25 * 1024 * 1024; // bail before pdf-lib loads anything pathological

 async function handleFile(file: File) {
   if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { /* ... */ return; }
-  if (file.size > MAX_BYTES) { /* ... */ return; }
+  if (file.size > RAW_SOURCE_MAX_BYTES) { /* ... */ return; }
+
+  setProgressLabel('Compressing…');
+  const { blob: compressedBlob, byteSize: compressedSize } = await compressPdf(file);
+  if (compressedSize > MAX_BYTES) {
+    setError(
+      `PDF is still over ${formatBytes(MAX_BYTES)} after compression. ` +
+        'Tip: in Acrobat, File → Save as Other → Reduced Size PDF before re-uploading.',
+    );
+    return;
+  }

-  setProgressLabel(`Uploading ${formatBytes(file.size)}…`);
+  setProgressLabel(`Uploading ${formatBytes(compressedSize)}…`);
   const { error: uploadError } = await supabase.storage
     .from(PDF_BUCKET)
-    .upload(path, file, { contentType: 'application/pdf', upsert: false });
+    .upload(path, compressedBlob, {
+      contentType: 'application/pdf',
+      cacheControl: '31536000, immutable',
+      upsert: false,
+    });

-  await uploadResolutionPdf({ /* ... */ storagePath: path, byteSize: file.size });
+  await uploadResolutionPdf({ /* ... */ storagePath: path, byteSize: compressedSize });
 }
```

---

## h. URL-resolution diffs

Every page that fetched a signed URL for an image now calls `getCompressedImageUrl` with `pickSizeForSurface(...)` so the chosen variant matches the rendering surface.

### Marketing / public pages

```diff
-import { createSignedStorageUrl } from '@/lib/supabase/signed-urls';
+import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

 // Home page (latest news cards, member preview)
-createSignedStorageUrl(supabase, 'news-covers', post.coverStoragePath)
+getCompressedImageUrl({ supabase, bucket: 'news-covers',       prefix: post.coverStoragePath,    size: pickSizeForSurface('thumb') })
-createSignedStorageUrl(supabase, 'sb-member-photos', m.photoStoragePath)  // ← stale bucket name fixed
+getCompressedImageUrl({ supabase, bucket: 'members-portraits', prefix: m.photoStoragePath,        size: pickSizeForSurface('thumb') })

 // News list page (cards) → thumb
 // News detail page (hero) → hero-desktop
 // News detail page (gallery items) → inline
 // Members list page (cards) → thumb
 // Member detail page (portrait + OG image) → inline
```

> **Bug fix bundled in:** the marketing pages were calling `'sb-member-photos'`, a bucket name that does not exist. The actual bucket is `'members-portraits'`. This was discovered during the rewire and is now corrected in `app/(marketing)/page.tsx`, `app/(marketing)/members/page.tsx`, and `app/(marketing)/members/[id]/page.tsx`.

### Admin pages

```diff
-import { createAdminClient } from '@/lib/supabase/admin';
+import { createAdminClient } from '@/lib/supabase/admin';
+import { getCompressedImageUrl, pickSizeForSurface } from '@/lib/upload/storage-url';

-const COVER_BUCKET = 'news-covers';
-const SIGNED_URL_TTL_SECONDS = 60 * 60;
-// (BUCKET + TTL constants removed)

-const { data } = await adminClient.storage
-  .from(COVER_BUCKET)
-  .createSignedUrl(r.coverStoragePath!, SIGNED_URL_TTL_SECONDS);
-if (data?.signedUrl) signedUrlByPostId.set(r.id, data.signedUrl);
+const url = await getCompressedImageUrl({
+  supabase: adminClient,
+  bucket: 'news-covers',
+  prefix: r.coverStoragePath,
+  size: pickSizeForSurface('thumb'),     // 'inline' on detail pages
+});
+if (url) signedUrlByPostId.set(r.id, url);
```

| Page                                         | Surface      |
| -------------------------------------------- | ------------ |
| `app/(app)/admin/news/page.tsx`              | thumb (400)  |
| `app/(app)/admin/news/[id]/page.tsx`         | inline (800) |
| `app/(app)/admin/news/[id]/edit/page.tsx`    | inline (800) |
| `app/(app)/admin/members/page.tsx`           | thumb (400)  |
| `app/(app)/admin/members/[id]/page.tsx`      | inline (800) |
| `app/(app)/admin/members/[id]/edit/page.tsx` | inline (800) |

PDF rendering (`app/(app)/admin/resolutions/[id]/page.tsx`) continues to use `adminClient.storage.from('resolutions-pdfs').createSignedUrl(...)` — PDFs are not size-variant.

---

## i. Realistic compression targets

### Photos (per-asset; sum of three variants)

| Source                              | `_400.webp` (q72) | `_800.webp` (q72) | `_1600.webp` (q72) | Total stored | Reduction |
| ----------------------------------- | ----------------- | ----------------- | ------------------ | ------------ | --------- |
| 4 MB iPhone JPEG (4032×3024)        | ~50 KB            | ~150 KB           | ~420 KB            | ~620 KB      | ~85%      |
| 2 MB Android JPEG (2400×1800)       | ~40 KB            | ~120 KB           | ~280 KB            | ~440 KB      | ~78%      |
| 1 MB DSLR portrait (1600×2000, q78) | ~55 KB            | ~170 KB           | ~330 KB            | ~555 KB      | ~46%      |
| 250 KB landscape (1024×640)         | ~35 KB            | ~85 KB            | _(skipped)_        | ~120 KB      | ~52%      |

The "skipped" row demonstrates the defensive variant filter in `compress-image.ts`: a 1024 px source produces an `_800` smaller than `_1600`, so `_1600` is dropped and `_800` becomes the largest variant served at the hero surface (still acceptable for sub-1024 sources).

### PDFs

| Source                             | After `compressPdf` | Reduction | Notes                                                       |
| ---------------------------------- | ------------------- | --------- | ----------------------------------------------------------- |
| 1.5 MB Word-exported resolution    | ~1.2 MB             | ~20%      | Metadata strip + object-stream gain                         |
| 8 MB scanned-and-signed resolution | ~6.5 MB             | ~18%      | Image streams are not re-encoded; bulk of size is unchanged |
| 12 MB scan-heavy resolution        | ~10.2 MB            | ~15%      | Aborts at 10 MB cap → user must "Reduced Size PDF" first    |
| 22 MB scan-only photo dump         | ~20 MB              | ~10%      | Aborts at 10 MB cap                                         |

### Worked example — photo upload of `IMG_4471.jpg` (4032×3024, 4.1 MB)

1. User picks the file in `_cover-section.tsx`. Source size 4.1 MB ≤ 8 MB cap → accepted.
2. `compressImage(file)` runs in a Web Worker:
   - Variant 1: `maxWidthOrHeight: 1600`, q72 WebP → 412,388 bytes
   - Variant 2: `maxWidthOrHeight: 800`, q72 WebP → 142,701 bytes
   - Variant 3: `maxWidthOrHeight: 400`, q72 WebP → 51,234 bytes
   - All three kept (each strictly smaller than the next-larger).
   - `totalBytes = 606,323`.
3. Three uploads to `news-covers/<tenant>/<post>/<ts>_IMG_4471_400.webp`, `…_800.webp`, `…_1600.webp` with `cacheControl: '31536000, immutable'`.
4. `updateNewsPostCover({ postId, storagePath: '<tenant>/<post>/<ts>_IMG_4471', byteSize: 606323 })` records the prefix.
5. Public news cards fetch `…_400.webp` (50 KB on the wire). Article hero fetches `…_1600.webp` (412 KB).

### Worked example — PDF upload of `RES-2026-014-signed.pdf` (1.7 MB)

1. User picks the file. Source size 1.7 MB ≤ 25 MB raw cap → accepted.
2. `compressPdf(file)`: load via pdf-lib, strip 6 metadata fields, save with object streams → 1.32 MB blob.
3. 1.32 MB ≤ 10 MB cap → upload.
4. `uploadResolutionPdf({ resolutionId, storagePath: '<tenant>/<res>/<ts>_RES-2026-014-signed.pdf', byteSize: 1383424 })` records.
5. Detail page fetches the original signed URL via `createSignedStorageUrl(adminClient, 'resolutions-pdfs', path)` — no size variant, served directly.

---

## j. Free-plan capacity check

### Storage (1 GB included on Free)

Assume average compressed asset sizes from the table above:

| Asset type       | Avg per upload | Per-GB capacity  |
| ---------------- | -------------- | ---------------- |
| News cover photo | 600 KB         | ~1,750 covers    |
| Gallery photo    | 600 KB         | ~1,750 photos    |
| Member portrait  | 550 KB         | ~1,900 portraits |
| Resolution PDF   | 2 MB           | ~512 PDFs        |

**Realistic mix for SB Lambunao year 1:** ~150 news posts × (1 cover + 5 gallery photos avg) + 22 member portraits + ~100 resolutions = 22 portraits × 0.55 MB + 150 covers × 0.6 MB + 750 gallery × 0.6 MB + 100 PDFs × 2 MB ≈ 753 MB. Comfortable headroom.

### Egress (5 GB monthly included on Free)

Assume the public site is the dominant traffic source. Per visitor on a typical session:

| Page                      | Image bytes per visit                                          |
| ------------------------- | -------------------------------------------------------------- |
| Home `/`                  | 3 news thumbs (50 KB ea) + 4 member thumbs (40 KB ea) ≈ 310 KB |
| News list `/news`         | ~10 thumbs ≈ 500 KB                                            |
| News detail `/news/:slug` | 1 hero (420 KB) + ~3 gallery inline (150 KB ea) ≈ 870 KB       |
| Members list              | 22 thumbs ≈ 880 KB (one-time on cold visit)                    |
| Member detail             | 1 inline portrait (170 KB)                                     |

**5 GB ÷ ~1 MB average per session = ~5,000 unique sessions/month** before paid egress kicks in. For a municipal site that's roughly 165 unique daily visitors with image-heavy browsing — generous for the launch phase.

If egress becomes the binding constraint before storage does, the upgrade path in section **l** is the answer.

---

## k. Tradeoffs (clearly labeled)

1. **Triple storage cost per photo.** Pre-generating 400/800/1600 variants ≈ 2× the bytes of a single 1600 variant. We accept this to avoid render-time resizing on Free plan. With Free's 1 GB cap, the realistic-mix calculation above still has headroom; if storage becomes binding before traffic does, drop the gallery quality from 0.72 → 0.65 (≈ 30% additional reduction on photos).

2. **PDF compression has a ceiling.** `pdf-lib` cannot re-encode image streams. A 12 MB scanned PDF stays a 10+ MB PDF after `compressPdf` and triggers the 10 MB rejection. The UI hint redirects the user to Acrobat's "Reduced Size PDF" — that's the right manual escape hatch for now. A future scan-only re-render path is documented in section **m**.

3. **No on-the-fly variants.** Every size we want, we must pre-generate at upload. If we discover later that we need a `_1200.webp` for tablet, we must re-upload every existing photo or accept that tablets receive `_1600.webp` (slightly more bytes than ideal). The Pro upgrade in section **l** removes this constraint.

4. **Free CDN, not Smart CDN.** Cache invalidation on file replace is best-effort, not 60-second-guaranteed. We mitigate by writing every upload to a new timestamped prefix (the existing project pattern), so stale-cache risk is zero — a "replaced" cover is a different URL.

5. **Multi-step upload progress.** The user sees three sequential `_400` / `_800` / `_1600` upload labels for one photo. This is a visible UX cost (~3–6 seconds for one photo on a typical home connection) but signals that real work is happening; the alternative (silent compression then a single combined upload) is harder to debug when one variant fails.

---

## l. When you upgrade to Pro

When the org upgrades to Supabase Pro, the on-the-fly **Storage Image Transformations** API ($5 per 1,000 origin images, 100 included) lets you serve any size from the single largest variant we already store. Today's prefixes stay valid — only `getCompressedImageUrl` changes.

### The 5-line swap (`lib/upload/storage-url.ts`)

```diff
 export async function getCompressedImageUrl(
   args: GetCompressedImageUrlArgs,
 ): Promise<string | null> {
   const { supabase, bucket, prefix, size } = args;
   if (!prefix) return null;
-  return createSignedStorageUrl(supabase, bucket, `${prefix}_${size}.webp`);
+  // Pro: render any size on the fly from the 1600 variant.
+  const { data } = await supabase.storage
+    .from(bucket)
+    .createSignedUrl(`${prefix}_1600.webp`, 60 * 60, {
+      transform: { width: size, quality: 80 },
+    });
+  return data?.signedUrl ?? null;
 }
```

After upgrading, you can also stop pre-generating the `_400` and `_800` variants in `compressImage` (drop down to a single `1600` write). That halves the storage cost per photo. Existing prefixed assets keep working — `_1600.webp` is what the Pro path reads.

The bucket-level `allowed_mime_types = ['image/webp']` and `file_size_limit = 512000` policies are still correct under Pro. No SQL changes needed.

---

## m. Out of scope

The following are deliberately deferred:

- **Scan-only PDF re-rendering via `pdfjs-dist`.** Render each page to a Canvas at 150 DPI and write a new PDF. Loses text selectability, so behind a checkbox + warning. Separate spike — not blocking launch.
- **AVIF output.** Better compression than WebP at the same quality, but Safari support landed late and `browser-image-compression` doesn't emit it. Revisit when AVIF is a stable ≥ 95% browser feature.
- **Vercel Image Optimization on signed URLs.** Vercel's `next/image` optimizer requires a fetchable URL; signed URLs expire and would invalidate the optimizer cache early. Out of scope for this pass.
- **CDN cache-header tuning beyond `cacheControl: '31536000, immutable'`.** The current value is already aggressive (1 year, immutable). Smart CDN tuning is Pro-only and irrelevant here.
- **Migration of existing assets.** Greenfield assumption holds — Supabase project is being provisioned per `docs/wire-up-runbook.md`. No previously-uploaded assets exist to convert.
- **Background recompression on quality-policy changes.** If we drop quality from 0.72 → 0.65 to save space, existing photos stay at 0.72 unless re-uploaded. Build an Inngest sweep when this becomes a real need.
