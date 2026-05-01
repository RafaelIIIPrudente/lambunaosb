'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';

import { replaceNewsPostPhotos } from '@/app/_actions/news-posts';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/upload/compress-image';
import { MAX_GALLERY_PHOTOS } from '@/lib/validators/news-post';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB source cap before client-side WebP compression
const GALLERY_BUCKET = 'news-galleries';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

type Photo = {
  storagePath: string;
  altText: string | null;
  byteSize: number | null;
  signedUrl?: string;
};

type Props = {
  postId: string;
  tenantId: string;
  initialPhotos: Photo[];
  canEdit: boolean;
};

function fileExtAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext));
}

function stripSignedUrl(p: Photo): Omit<Photo, 'signedUrl'> {
  return { storagePath: p.storagePath, altText: p.altText, byteSize: p.byteSize };
}

export function GallerySection({ postId, tenantId, initialPhotos, canEdit }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  function persist(next: Photo[]) {
    startTransition(async () => {
      const result = await replaceNewsPostPhotos({
        postId,
        photos: next.map(stripSignedUrl),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  async function handleFiles(files: FileList) {
    setError(null);
    const filesArr = Array.from(files);
    const remaining = MAX_GALLERY_PHOTOS - photos.length;
    if (filesArr.length > remaining) {
      setError(`Can upload at most ${remaining} more (max ${MAX_GALLERY_PHOTOS} total).`);
      return;
    }

    const supabase = createClient();
    const newPhotos: Photo[] = [];

    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i]!;
      if (!ACCEPTED_TYPES.includes(file.type) && !fileExtAllowed(file.name)) {
        setError(`${file.name}: only JPG, PNG, or WebP accepted.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: too large (max ${formatBytes(MAX_BYTES)}).`);
        return;
      }

      setProgressLabel(`Compressing ${i + 1}/${filesArr.length}: ${file.name}…`);
      let variants: Awaited<ReturnType<typeof compressImage>>['variants'];
      let totalBytes: number;
      try {
        const result = await compressImage(file);
        variants = result.variants;
        totalBytes = result.totalBytes;
      } catch (e) {
        setProgressLabel(null);
        setError(
          `${file.name}: compression failed — ${e instanceof Error ? e.message : 'unknown error'}`,
        );
        return;
      }
      if (variants.length === 0) {
        setProgressLabel(null);
        setError(`${file.name}: compression produced no usable variants.`);
        return;
      }

      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const prefix = `${tenantId}/${postId}/${timestamp}_${i}_${safeName}`;

      for (const v of variants) {
        setProgressLabel(
          `Uploading ${i + 1}/${filesArr.length} · ${v.size}px (${formatBytes(v.byteSize)})…`,
        );
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(`${prefix}_${v.size}.webp`, v.blob, {
            contentType: 'image/webp',
            cacheControl: '31536000, immutable',
            upsert: false,
          });
        if (uploadError) {
          setProgressLabel(null);
          setError(`Upload failed for ${file.name} at ${v.size}px: ${uploadError.message}`);
          return;
        }
      }

      newPhotos.push({
        storagePath: prefix,
        altText: null,
        byteSize: totalBytes,
        signedUrl: URL.createObjectURL(file),
      });
    }

    setProgressLabel('Recording…');
    const next = [...photos, ...newPhotos];
    setPhotos(next);
    persist(next);
    setProgressLabel(null);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    e.target.value = '';
  }

  function handleRemove(index: number) {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    persist(next);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const above = next[index - 1]!;
    const here = next[index]!;
    next[index - 1] = here;
    next[index] = above;
    setPhotos(next);
    persist(next);
  }

  function handleMoveDown(index: number) {
    if (index === photos.length - 1) return;
    const next = [...photos];
    const below = next[index + 1]!;
    const here = next[index]!;
    next[index + 1] = here;
    next[index] = below;
    setPhotos(next);
    persist(next);
  }

  function handleAltTextBlur(index: number, value: string) {
    const cleaned = value.trim().length > 0 ? value : null;
    if (photos[index]?.altText === cleaned) return;
    const next = photos.map((p, i) => (i === index ? { ...p, altText: cleaned } : p));
    setPhotos(next);
    persist(next);
  }

  const canAddMore = canEdit && photos.length < MAX_GALLERY_PHOTOS;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-soft font-mono text-[11px]">
          {photos.length} / {MAX_GALLERY_PHOTOS} photos · array order = display order
        </p>
        {canAddMore && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={[...ACCEPTED_TYPES, ...ACCEPTED_EXTS].join(',')}
              onChange={onPickFiles}
              className="sr-only"
              aria-label="Choose photos to add to the gallery"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isPending || progressLabel !== null}
              className="font-medium"
            >
              <ImagePlus />
              {progressLabel ?? 'Add photos'}
            </Button>
          </>
        )}
      </header>

      {photos.length === 0 ? (
        <div className="bg-paper-2/30 border-ink/15 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-center">
          <ImagePlus className="text-ink-faint size-8" aria-hidden="true" />
          <p className="text-ink-faint font-mono text-xs">No photos yet.</p>
          {canAddMore && (
            <p className="text-ink-soft text-sm">
              Add up to {MAX_GALLERY_PHOTOS} JPG/PNG/WebP images, max {formatBytes(MAX_BYTES)}{' '}
              source each — auto-converted to WebP.
            </p>
          )}
        </div>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <li
              key={p.storagePath}
              className="border-ink/15 flex flex-col gap-2 rounded-md border p-2"
            >
              <div className="bg-paper-2 relative aspect-video w-full overflow-hidden rounded">
                {p.signedUrl ? (
                  <Image
                    src={p.signedUrl}
                    alt={p.altText ?? `Photo ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="text-ink-faint flex h-full items-center justify-center font-mono text-[11px]">
                    Loading preview…
                  </div>
                )}
                <span
                  aria-hidden="true"
                  className="bg-rust text-paper absolute top-2 left-2 inline-flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums"
                >
                  {i + 1}
                </span>
              </div>

              {canEdit ? (
                <Field label={`Alt text · photo ${i + 1}`} hint="Optional, helps accessibility.">
                  <FieldInput
                    defaultValue={p.altText ?? ''}
                    placeholder="Briefly describe what's in the photo."
                    maxLength={280}
                    onBlur={(e) => handleAltTextBlur(i, e.target.value)}
                  />
                </Field>
              ) : (
                p.altText && <p className="text-ink-soft text-xs italic">{p.altText}</p>
              )}

              {canEdit && (
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveUp(i)}
                      disabled={isPending || i === 0}
                      aria-label={`Move photo ${i + 1} up`}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveDown(i)}
                      disabled={isPending || i === photos.length - 1}
                      aria-label={`Move photo ${i + 1} down`}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(i)}
                    disabled={isPending}
                    aria-label={`Remove photo ${i + 1}`}
                    className="text-warn hover:bg-warn/10 hover:text-warn"
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}

              {p.byteSize !== null && (
                <p className="text-ink-faint font-mono text-[10px]">{formatBytes(p.byteSize)}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
