'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileAudio, Upload, X } from 'lucide-react';

import { finalizeRecording, stopMeeting, uploadAudioChunk } from '@/app/_actions/meetings';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const AUDIO_BUCKET = 'meeting-audio';
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — matches bucket policy
const ACCEPTED_MIMES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3', // some browsers report this
  'audio/wav',
  'audio/x-m4a',
  'audio/ogg',
];
const ACCEPTED_EXTS = ['.m4a', '.mp3', '.mp4', '.wav', '.webm', '.ogg'];

type Props = {
  meetingId: string;
  tenantId: string;
  meetingStatus: 'scheduled' | 'in_progress' | 'awaiting_transcript' | string;
};

function extensionForFile(file: File): string {
  const dot = file.name.lastIndexOf('.');
  if (dot < 0) return 'bin';
  return file.name.slice(dot + 1).toLowerCase();
}

function probeAudioDuration(file: File): Promise<number> {
  // Returns duration in milliseconds. Falls back to 0 if the browser refuses
  // to load the metadata (rare). Best-effort — not authoritative; the
  // transcription pipeline re-derives from the actual audio.
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => {
      const ms = Math.round((audio.duration ?? 0) * 1000);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(ms) ? ms : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export function MeetingAudioUpload({ meetingId, tenantId, meetingStatus }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isLocked =
    meetingStatus !== 'scheduled' &&
    meetingStatus !== 'in_progress' &&
    meetingStatus !== 'awaiting_transcript';

  function validate(f: File): string | null {
    if (f.size > MAX_BYTES) {
      return `File is too large. Max ${formatBytes(MAX_BYTES)}.`;
    }
    const lower = f.name.toLowerCase();
    const extOk = ACCEPTED_EXTS.some((e) => lower.endsWith(e));
    const mimeOk = ACCEPTED_MIMES.includes(f.type);
    if (!extOk && !mimeOk) {
      return 'Audio only — m4a / mp3 / mp4 / wav / webm / ogg.';
    }
    return null;
  }

  function attach(f: File) {
    const v = validate(f);
    if (v) {
      setError(v);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) attach(f);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) attach(f);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setProgressLabel('Reading file…');

    try {
      const durationMs = await probeAudioDuration(file);
      const clientChunkId = crypto.randomUUID();
      const ext = extensionForFile(file);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${tenantId}/${meetingId}/upload_${timestamp}_${clientChunkId}.${ext}`;

      setProgressLabel(`Uploading ${formatBytes(file.size)}…`);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || `audio/${ext}`,
          upsert: false,
        });
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setProgressLabel(null);
        return;
      }

      setProgressLabel('Recording metadata…');
      const recordResult = await uploadAudioChunk({
        meetingId,
        clientChunkId,
        sequenceIndex: 0,
        durationMs,
        byteSize: file.size,
        mimeType: file.type || `audio/${ext}`,
        storagePath,
      });
      if (!recordResult.ok) {
        setError(`Failed to record chunk: ${recordResult.error}`);
        setProgressLabel(null);
        return;
      }

      setProgressLabel('Finalising…');
      const finalize = await finalizeRecording({ meetingId });
      if (!finalize.ok) {
        setError(`Finalize failed: ${finalize.error}`);
        setProgressLabel(null);
        return;
      }

      // Best-effort state transition. If meeting is already past in_progress,
      // stopMeeting returns an invalid-state error which is fine to ignore here.
      if (meetingStatus === 'in_progress') {
        await stopMeeting({ meetingId });
      }

      setProgressLabel(null);
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setProgressLabel(null);
    }
  }

  if (isLocked) {
    return null; // detail page renders its own state-specific copy
  }

  if (done) {
    return (
      <div className="border-success/40 bg-success/5 rounded-md border p-4">
        <p className="text-success inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          Audio uploaded
        </p>
        <p className="text-ink font-script mt-2 text-xl">{file?.name}</p>
        <p className="text-ink-soft mt-1 text-sm italic">Meeting is awaiting transcription.</p>
      </div>
    );
  }

  return (
    <div className="border-ink/15 flex flex-col gap-3 rounded-md border p-5">
      <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        Or upload an existing recording
      </p>

      {file ? (
        <div className="border-ink/15 flex items-start justify-between gap-3 rounded-md border p-3">
          <div className="flex items-start gap-3">
            <FileAudio className="text-rust mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-ink text-sm font-medium break-all">{file.name}</p>
              <p className="text-ink-faint mt-0.5 font-mono text-[11px]">
                {formatBytes(file.size)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!!progressLabel}
            onClick={() => {
              setFile(null);
              setError(null);
            }}
            aria-label="Remove selected file"
          >
            <X />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Drop an audio file here, or click to browse"
          className={cn(
            'border-ink/30 focus-visible:ring-rust/40 cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-2',
            isDragging && 'border-rust bg-rust/5',
          )}
        >
          <Upload className="text-rust mx-auto size-8" aria-hidden="true" />
          <p className="text-ink font-script mt-3 text-xl">Drop an audio file here</p>
          <p className="text-ink-faint mt-1 font-mono text-[11px]">
            or click to browse · max {formatBytes(MAX_BYTES)} · m4a / mp3 / mp4 / wav / webm
          </p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTS.join(',') + ',audio/*'}
        onChange={onPickFile}
        className="sr-only"
        aria-label="Audio file picker"
      />

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}

      {file && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!!progressLabel}
            onClick={handleUpload}
            className="font-medium"
          >
            <Upload />
            {progressLabel ?? 'Upload audio'}
          </Button>
        </div>
      )}
    </div>
  );
}
