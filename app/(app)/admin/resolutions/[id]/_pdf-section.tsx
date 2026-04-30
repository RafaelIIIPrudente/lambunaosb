'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileUp, FileText, RefreshCw } from 'lucide-react';

import { uploadResolutionPdf } from '@/app/_actions/resolutions';
import { Button } from '@/components/ui/button';
import { fileNameFromPath, formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { compressPdf } from '@/lib/upload/compress-pdf';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap on the compressed PDF
const RAW_SOURCE_MAX_BYTES = 25 * 1024 * 1024; // bail before pdf-lib loads anything pathological
const PDF_BUCKET = 'resolutions-pdfs';

type Props = {
  resolutionId: string;
  tenantId: string;
  pdfStoragePath: string | null;
  pdfByteSize: number | null;
  pdfPageCount: number | null;
  signedDownloadUrl: string | null;
  canUpload: boolean;
};

export function PdfSection({
  resolutionId,
  tenantId,
  pdfStoragePath,
  pdfByteSize,
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
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > RAW_SOURCE_MAX_BYTES) {
      setError(
        `File is too large to process. Max ${formatBytes(RAW_SOURCE_MAX_BYTES)} before compression.`,
      );
      return;
    }

    setProgressLabel('Compressing…');
    let compressedBlob: Blob;
    let compressedSize: number;
    try {
      const result = await compressPdf(file);
      compressedBlob = result.blob;
      compressedSize = result.byteSize;
    } catch (e) {
      setProgressLabel(null);
      setError(`Could not compress PDF: ${e instanceof Error ? e.message : 'unknown error'}`);
      return;
    }
    if (compressedSize > MAX_BYTES) {
      setProgressLabel(null);
      setError(
        `PDF is still over ${formatBytes(MAX_BYTES)} after compression (${formatBytes(compressedSize)}). ` +
          'Tip: in Acrobat, File → Save as Other → Reduced Size PDF before re-uploading.',
      );
      return;
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${tenantId}/${resolutionId}/${timestamp}_${safeName}`;

    setProgressLabel(`Uploading ${formatBytes(compressedSize)}…`);
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(path, compressedBlob, {
        contentType: 'application/pdf',
        cacheControl: '31536000, immutable',
        upsert: false,
      });

    if (uploadError) {
      setProgressLabel(null);
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }

    setProgressLabel('Recording…');
    startTransition(async () => {
      const result = await uploadResolutionPdf({
        resolutionId,
        storagePath: path,
        byteSize: compressedSize,
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

  if (!pdfStoragePath && !canUpload) {
    return (
      <p className="text-ink-faint font-mono text-xs">
        No signed PDF on file yet. Ask the Secretary to upload one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pdfStoragePath ? (
        <div className="border-ink/15 flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
          <div className="flex items-start gap-3">
            <FileText className="text-rust mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-ink text-sm font-medium break-all">
                {fileNameFromPath(pdfStoragePath)}
              </p>
              <p className="text-ink-faint mt-0.5 font-mono text-[11px]">
                {pdfByteSize !== null ? formatBytes(pdfByteSize) : 'Size unknown'} · signed PDF
              </p>
            </div>
          </div>
          {signedDownloadUrl && (
            <Button variant="outline" size="sm" asChild className="font-medium">
              <a
                href={signedDownloadUrl}
                download={fileNameFromPath(pdfStoragePath)}
                rel="noopener noreferrer"
                aria-label="Download signed PDF"
              >
                <Download />
                Download
              </a>
            </Button>
          )}
        </div>
      ) : (
        <p className="text-ink-faint font-mono text-xs">
          No signed PDF on file yet. Upload the final, signed copy below.
        </p>
      )}

      {canUpload && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={onPick}
            className="sr-only"
            aria-label="Choose PDF file to upload"
          />
          <Button
            variant={pdfStoragePath ? 'outline' : 'default'}
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending || progressLabel !== null}
            className="font-medium"
          >
            {pdfStoragePath ? <RefreshCw /> : <FileUp />}
            {progressLabel ?? (pdfStoragePath ? 'Replace PDF' : 'Upload PDF')}
          </Button>
          <span className="text-ink-faint font-mono text-[11px]">
            PDF only · auto-compressed · max {formatBytes(MAX_BYTES)} after compression
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
