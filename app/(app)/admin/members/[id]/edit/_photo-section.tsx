'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, RefreshCw, User } from 'lucide-react';

import { updateMemberPhoto } from '@/app/_actions/members';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/upload/compress-image';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB source cap before client-side WebP compression
const PORTRAIT_QUALITY = 0.78; // higher than default — faces are quality-sensitive
const PORTRAIT_BUCKET = 'members-portraits';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

type Props = {
  memberId: string;
  tenantId: string;
  fullName: string;
  initials: string;
  photoStoragePath: string | null;
  signedDownloadUrl: string | null;
  canUpload: boolean;
};

function fileExtAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext));
}

export function PhotoSection({
  memberId,
  tenantId,
  fullName,
  initials,
  photoStoragePath,
  signedDownloadUrl,
  canUpload,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type) && !fileExtAllowed(file.name)) {
      setError('Only JPG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File is too large. Max ${formatBytes(MAX_BYTES)}.`);
      return;
    }

    setProgressLabel('Compressing…');
    let variants: Awaited<ReturnType<typeof compressImage>>['variants'];
    let totalBytes: number;
    try {
      const result = await compressImage(file, { quality: PORTRAIT_QUALITY });
      variants = result.variants;
      totalBytes = result.totalBytes;
    } catch (e) {
      setProgressLabel(null);
      setError(`Could not compress image: ${e instanceof Error ? e.message : 'unknown error'}`);
      return;
    }
    if (variants.length === 0) {
      setProgressLabel(null);
      setError('Compression produced no usable variants. Try a different image.');
      return;
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = `${tenantId}/${memberId}/${timestamp}_${safeName}`;

    const supabase = createClient();
    for (const v of variants) {
      setProgressLabel(`Uploading ${v.size}px (${formatBytes(v.byteSize)})…`);
      const { error: uploadError } = await supabase.storage
        .from(PORTRAIT_BUCKET)
        .upload(`${prefix}_${v.size}.webp`, v.blob, {
          contentType: 'image/webp',
          cacheControl: '31536000, immutable',
          upsert: false,
        });
      if (uploadError) {
        setProgressLabel(null);
        setError(`Upload failed at ${v.size}px: ${uploadError.message}`);
        return;
      }
    }

    setProgressLabel('Recording…');
    startTransition(async () => {
      const result = await updateMemberPhoto({
        memberId,
        storagePath: prefix,
        byteSize: totalBytes,
      });
      setProgressLabel(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-ink/15 bg-paper-2 relative mx-auto flex aspect-[3/4] w-full max-w-[180px] items-center justify-center overflow-hidden rounded-md border sm:max-w-[280px]">
        {signedDownloadUrl && photoStoragePath ? (
          <Image
            src={signedDownloadUrl}
            alt={`Portrait of ${fullName}`}
            fill
            sizes="(max-width: 1024px) 100vw, 280px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className="bg-paper border-ink/25 text-ink-soft font-script flex size-20 items-center justify-center rounded-full border text-2xl"
            >
              {initials || <User className="size-8" />}
            </span>
            <span className="text-ink-faint font-mono text-[11px]">No portrait yet</span>
          </div>
        )}
      </div>

      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={[...ACCEPTED_TYPES, ...ACCEPTED_EXTS].join(',')}
            onChange={onPick}
            className="sr-only"
            aria-label="Choose portrait image"
          />
          <Button
            type="button"
            variant={photoStoragePath ? 'outline' : 'default'}
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending || progressLabel !== null}
            className="font-medium"
          >
            {photoStoragePath ? <RefreshCw /> : <ImagePlus />}
            {progressLabel ?? (photoStoragePath ? 'Replace photo' : 'Upload photo')}
          </Button>
          <p className="text-ink-faint font-mono text-[11px]">
            JPG · PNG · WebP · max {formatBytes(MAX_BYTES)} source · 3:4 portrait · auto-converted
            to WebP
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
