'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Pause, Play, Square, Wifi, WifiOff } from 'lucide-react';

import { finalizeRecording, stopMeeting, uploadAudioChunk } from '@/app/_actions/meetings';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const AUDIO_BUCKET = 'meeting-audio';
const CHUNK_DURATION_MS = 5 * 60 * 1000; // 5 minutes per chunk
const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 30_000;

type Props = {
  meetingId: string;
  tenantId: string;
};

type ChunkRecord = {
  clientChunkId: string;
  sequenceIndex: number;
  blob: Blob;
  durationMs: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  attemptCount: number;
  errorMessage?: string;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  // Prefer Opus-in-WebM (Chromium, Firefox). Safari ships audio/mp4 for now.
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'audio/webm';
}

function extensionForMime(mime: string): string {
  if (mime.startsWith('audio/webm')) return 'webm';
  if (mime.startsWith('audio/mp4')) return 'mp4';
  if (mime.startsWith('audio/mpeg')) return 'mp3';
  if (mime.startsWith('audio/wav')) return 'wav';
  return 'bin';
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MeetingRecorder({ meetingId, tenantId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<
    'idle' | 'requesting' | 'recording' | 'paused' | 'finalizing' | 'done'
  >('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkStartRef = useRef<number>(0);
  const sequenceRef = useRef<number>(0);
  const elapsedTickRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const accumulatedBeforePauseRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Track online/offline.
  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
    }
    function onOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Tick the elapsed timer while recording.
  useEffect(() => {
    if (state !== 'recording') return;
    const start = performance.now();
    const startedFrom = accumulatedBeforePauseRef.current;
    const id = window.setInterval(() => {
      setElapsedMs(startedFrom + (performance.now() - start));
    }, 250);
    elapsedTickRef.current = id;
    return () => {
      window.clearInterval(id);
    };
  }, [state]);

  const uploadChunk = useCallback(
    async (record: ChunkRecord): Promise<void> => {
      setChunks((prev) =>
        prev.map((c) =>
          c.clientChunkId === record.clientChunkId
            ? { ...c, status: 'uploading', attemptCount: c.attemptCount + 1 }
            : c,
        ),
      );

      const supabase = createClient();
      const ext = extensionForMime(record.blob.type || mimeTypeRef.current);
      const storagePath = `${tenantId}/${meetingId}/${String(record.sequenceIndex).padStart(4, '0')}_${record.clientChunkId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(storagePath, record.blob, {
          contentType: record.blob.type || mimeTypeRef.current,
          upsert: false,
        });

      if (uploadError && !uploadError.message.includes('already exists')) {
        setChunks((prev) =>
          prev.map((c) =>
            c.clientChunkId === record.clientChunkId
              ? { ...c, status: 'failed', errorMessage: uploadError.message }
              : c,
          ),
        );
        return;
      }

      const result = await uploadAudioChunk({
        meetingId,
        clientChunkId: record.clientChunkId,
        sequenceIndex: record.sequenceIndex,
        durationMs: record.durationMs,
        byteSize: record.blob.size,
        mimeType: record.blob.type || mimeTypeRef.current,
        storagePath,
      });

      if (!result.ok) {
        setChunks((prev) =>
          prev.map((c) =>
            c.clientChunkId === record.clientChunkId
              ? { ...c, status: 'failed', errorMessage: result.error }
              : c,
          ),
        );
        return;
      }

      setChunks((prev) =>
        prev.map((c) =>
          c.clientChunkId === record.clientChunkId ? { ...c, status: 'uploaded' } : c,
        ),
      );
    },
    [meetingId, tenantId],
  );

  // Retry failed chunks with exponential backoff whenever we're online.
  useEffect(() => {
    if (!isOnline) return;
    const failed = chunks.filter((c) => c.status === 'failed' || c.status === 'pending');
    if (failed.length === 0) return;

    const next = failed[0];
    if (!next) return;
    const delay = Math.min(
      RETRY_BASE_DELAY_MS * 2 ** Math.max(0, next.attemptCount - 1),
      RETRY_MAX_DELAY_MS,
    );
    const id = window.setTimeout(() => {
      void uploadChunk(next);
    }, delay);
    return () => window.clearTimeout(id);
  }, [chunks, isOnline, uploadChunk]);

  async function handleStart() {
    setPermissionError(null);
    setActionError(null);
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16_000,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32_000, // 16 kHz mono target
      });
      mediaRecorderRef.current = recorder;
      sequenceRef.current = 0;
      chunkStartRef.current = performance.now();
      accumulatedBeforePauseRef.current = 0;
      recordingStartRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        const chunkEnd = performance.now();
        const durationMs = Math.max(0, Math.round(chunkEnd - chunkStartRef.current));
        chunkStartRef.current = chunkEnd;
        const sequenceIndex = sequenceRef.current;
        sequenceRef.current += 1;
        const record: ChunkRecord = {
          clientChunkId: crypto.randomUUID(),
          sequenceIndex,
          blob: event.data,
          durationMs,
          status: 'pending',
          attemptCount: 0,
        };
        setChunks((prev) => [...prev, record]);
        // Kick the upload immediately if online; the retry effect handles
        // the network-drop case.
        if (navigator.onLine) {
          void uploadChunk(record);
        }
      };

      recorder.onerror = (event) => {
        setActionError(`Recorder error: ${(event as ErrorEvent).message ?? 'unknown'}`);
      };

      recorder.start(CHUNK_DURATION_MS);
      setState('recording');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone permission denied.';
      setPermissionError(msg);
      setState('idle');
    }
  }

  function handlePause() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    accumulatedBeforePauseRef.current = elapsedMs;
    setState('paused');
  }

  function handleResume() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    setState('recording');
  }

  async function handleStop() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setState('finalizing');
    setActionError(null);

    // Wait for the final ondataavailable event triggered by stop().
    await new Promise<void>((resolve) => {
      const onStop = () => {
        recorder.removeEventListener('stop', onStop);
        resolve();
      };
      recorder.addEventListener('stop', onStop);
      recorder.stop();
    });

    // Tear down mic.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Wait for all chunks to upload (retry the failed ones).
    const start = Date.now();
    while (Date.now() - start < 60_000) {
      // 60s ceiling to avoid infinite waits
      const pending = await new Promise<ChunkRecord[]>((resolve) => {
        setChunks((prev) => {
          resolve(prev.filter((c) => c.status !== 'uploaded'));
          return prev;
        });
      });
      if (pending.length === 0) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const finalize = await finalizeRecording({ meetingId });
    if (!finalize.ok) {
      setActionError(`Finalize failed: ${finalize.error}`);
      setState('recording');
      return;
    }

    const stop = await stopMeeting({ meetingId });
    if (!stop.ok) {
      setActionError(`Stop meeting failed: ${stop.error}`);
      setState('recording');
      return;
    }

    setState('done');
    router.refresh();
  }

  const uploadedCount = chunks.filter((c) => c.status === 'uploaded').length;
  const failedCount = chunks.filter((c) => c.status === 'failed').length;
  const pendingCount = chunks.filter(
    (c) => c.status === 'pending' || c.status === 'uploading',
  ).length;
  const bufferedBytes = chunks
    .filter((c) => c.status !== 'uploaded')
    .reduce((sum, c) => sum + c.blob.size, 0);

  if (state === 'done') {
    return (
      <div className="border-success/40 bg-success/5 rounded-md border p-4">
        <p className="text-success font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Recording complete
        </p>
        <p className="text-ink font-script mt-2 text-xl">
          Uploaded {uploadedCount} chunk{uploadedCount === 1 ? '' : 's'} · {formatTimer(elapsedMs)}
        </p>
        <p className="text-ink-soft mt-1 text-sm italic">
          Meeting status updated to awaiting transcript.
        </p>
      </div>
    );
  }

  return (
    <div className="border-ink/15 flex flex-col gap-4 rounded-md border p-5">
      <div className="flex items-center justify-between">
        <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Live recorder
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]',
            isOnline ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn animate-pulse',
          )}
          aria-live="polite"
        >
          {isOnline ? (
            <Wifi className="size-3" aria-hidden="true" />
          ) : (
            <WifiOff className="size-3" aria-hidden="true" />
          )}
          {isOnline ? 'Online' : 'Offline · buffering'}
        </span>
      </div>

      {state === 'idle' && (
        <>
          <p className="text-ink-soft text-sm italic">
            Click below to grant microphone access. Recording starts immediately. Audio is sliced
            into 5-minute chunks and uploaded as you go.
          </p>
          <Button type="button" size="lg" className="font-script text-base" onClick={handleStart}>
            <Mic />
            Start recording
          </Button>
          {permissionError && (
            <p role="alert" className="text-warn text-sm font-medium">
              {permissionError}
            </p>
          )}
        </>
      )}

      {(state === 'requesting' ||
        state === 'recording' ||
        state === 'paused' ||
        state === 'finalizing') && (
        <>
          <div className="flex flex-col items-center gap-2">
            <p className="text-rust font-display text-5xl tabular-nums md:text-6xl">
              {formatTimer(elapsedMs)}
            </p>
            <p className="text-ink-faint font-mono text-[11px] tracking-wide uppercase">
              {state === 'requesting' && 'Requesting microphone…'}
              {state === 'recording' && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="bg-rust inline-block size-1.5 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                  Recording
                </span>
              )}
              {state === 'paused' && 'Paused'}
              {state === 'finalizing' && 'Finalising — uploading remaining chunks…'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {state === 'recording' && (
              <Button type="button" variant="outline" size="sm" onClick={handlePause}>
                <Pause />
                Pause
              </Button>
            )}
            {state === 'paused' && (
              <Button type="button" variant="outline" size="sm" onClick={handleResume}>
                <Play />
                Resume
              </Button>
            )}
            {(state === 'recording' || state === 'paused') && (
              <Button
                type="button"
                size="sm"
                className="bg-warn hover:bg-warn/90"
                onClick={handleStop}
              >
                <Square />
                Stop & finalise
              </Button>
            )}
            {state === 'finalizing' && (
              <Button type="button" size="sm" disabled>
                <Square />
                Finalising…
              </Button>
            )}
          </div>

          <dl className="text-ink-soft border-ink/15 mt-2 grid grid-cols-3 gap-3 border-t pt-3 text-center text-xs">
            <div>
              <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
                Uploaded
              </dt>
              <dd className="text-ink mt-1 font-mono tabular-nums">{uploadedCount}</dd>
            </div>
            <div>
              <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
                Pending / failed
              </dt>
              <dd
                className={cn(
                  'mt-1 font-mono tabular-nums',
                  failedCount > 0 ? 'text-warn' : 'text-ink',
                )}
              >
                {pendingCount + failedCount}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint font-mono text-[10px] tracking-wide uppercase">
                Buffered
              </dt>
              <dd className="text-ink mt-1 font-mono tabular-nums">{formatBytes(bufferedBytes)}</dd>
            </div>
          </dl>

          {actionError && (
            <p role="alert" className="text-warn text-sm font-medium">
              {actionError}
            </p>
          )}
          {failedCount > 0 && (
            <p className="text-warn text-xs italic">
              {failedCount} chunk{failedCount === 1 ? '' : 's'} failed and will retry automatically
              when the network recovers.
            </p>
          )}
          {!isOnline && (
            <p className="text-warn text-xs italic">
              Offline — recording continues. Chunks queue locally and upload when the network
              returns. Closing the tab now will lose anything not yet uploaded.
            </p>
          )}
        </>
      )}
    </div>
  );
}
