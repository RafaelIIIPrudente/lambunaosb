import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import {
  audioChunks,
  meetings,
  type NewTranscriptSegment,
  type Profile,
  transcripts,
  transcriptSegments,
} from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { createAdminClient } from '@/lib/supabase/admin';

import { cleanupHiligaynon, transcribeChunk, type WhisperSegment } from './transcription';

const AUDIO_BUCKET = 'meeting-audio';

export type TranscribeMeetingResult = {
  transcriptId: string;
  segmentCount: number;
  totalDurationSeconds: number;
  asrCostUsd: number;
  cleanupCostUsd: number;
  cleanupApplied: boolean;
};

type AuditCtx = {
  actorId: string;
  actorRole: Profile['role'];
};

/**
 * Sync transcription orchestrator. Runs Whisper per chunk in series (chunks
 * are independent so could parallelise; serial keeps OpenAI rate-limit
 * pressure low and makes per-chunk failure easier to surface). Optionally
 * follows with a single gpt-4o cleanup pass over all segments. Inserts one
 * transcripts row + N transcript_segments rows in a transaction. Sets
 * meetings.status to 'transcript_in_review' on success.
 *
 * On any failure: marks the transcripts row 'asr_failed' with error
 * metadata, audit-logs an alert, and rethrows so the caller surfaces the
 * error to the UI.
 */
export async function transcribeMeetingNow(
  meetingId: string,
  ctx: AuditCtx,
): Promise<TranscribeMeetingResult> {
  const tenantId = await getCurrentTenantId();

  const [meeting] = await db
    .select({
      id: meetings.id,
      status: meetings.status,
      primaryLocale: meetings.primaryLocale,
      cleanupEnabled: meetings.cleanupEnabled,
    })
    .from(meetings)
    .where(
      and(eq(meetings.tenantId, tenantId), eq(meetings.id, meetingId), isNull(meetings.deletedAt)),
    )
    .limit(1);

  if (!meeting) {
    throw new Error('Meeting not found.');
  }
  if (meeting.status !== 'awaiting_transcript') {
    throw new Error(
      `Cannot transcribe a meeting in status '${meeting.status}'. Expected 'awaiting_transcript'.`,
    );
  }

  const chunks = await db
    .select()
    .from(audioChunks)
    .where(eq(audioChunks.meetingId, meetingId))
    .orderBy(asc(audioChunks.sequenceIndex));

  if (chunks.length === 0) {
    throw new Error('No audio chunks have been uploaded yet.');
  }

  // Idempotent transcript row: reuse if exists (e.g. retry after a failure),
  // otherwise create. UNIQUE(meetingId) on transcripts table enforces 1:1.
  const [existingTranscript] = await db
    .select({ id: transcripts.id })
    .from(transcripts)
    .where(eq(transcripts.meetingId, meetingId))
    .limit(1);

  let transcriptId: string;
  if (existingTranscript) {
    transcriptId = existingTranscript.id;
    // Reset for retry: clear segments and flip status back to awaiting_asr.
    await db.delete(transcriptSegments).where(eq(transcriptSegments.transcriptId, transcriptId));
    await db
      .update(transcripts)
      .set({
        status: 'awaiting_asr',
        asrProvider: 'openai-whisper',
        primaryLocale: meeting.primaryLocale,
        updatedAt: new Date(),
      })
      .where(eq(transcripts.id, transcriptId));
  } else {
    const [created] = await db
      .insert(transcripts)
      .values({
        tenantId,
        meetingId,
        primaryLocale: meeting.primaryLocale,
        asrProvider: 'openai-whisper',
        status: 'awaiting_asr',
      })
      .returning({ id: transcripts.id });
    if (!created) throw new Error('Failed to create transcript row.');
    transcriptId = created.id;
  }

  await writeAudit({
    actorId: ctx.actorId,
    actorRole: ctx.actorRole,
    action: 'meeting.transcription_started',
    category: 'meeting',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: {
      chunkCount: chunks.length,
      cleanupEnabled: meeting.cleanupEnabled,
    },
  });

  try {
    const adminClient = createAdminClient();

    // MediaRecorder.start(timeslice) writes the WebM EBML header only on the
    // first blob — chunks 1..N are header-less continuations that Whisper
    // rejects as "Invalid file format". Concatenate so chunk-0's header
    // validates the whole stream; Whisper segment timestamps are then already
    // absolute against the assembled file.
    const blobs: Blob[] = [];
    for (const chunk of chunks) {
      const { data: blob, error: dlErr } = await adminClient.storage
        .from(AUDIO_BUCKET)
        .download(chunk.storagePath);
      if (dlErr || !blob) {
        throw new Error(
          `Failed to download chunk ${chunk.sequenceIndex} at ${chunk.storagePath}: ${
            dlErr?.message ?? 'no blob'
          }`,
        );
      }
      blobs.push(blob);
    }

    const firstChunk = chunks[0]!;
    const ext = firstChunk.storagePath.split('.').pop() ?? 'webm';
    const assembled = new Blob(blobs, {
      type: blobs[0]?.type || firstChunk.mimeType || 'audio/webm;codecs=opus',
    });

    const result = await transcribeChunk(assembled, {
      language: meeting.primaryLocale,
      filename: `meeting_${meetingId}.${ext}`,
    });

    const allSegments: WhisperSegment[] = result.segments;
    const totalDurationSeconds = result.durationSeconds;
    const asrCostUsd = result.costUsd;

    let cleanupCostUsd = 0;
    let finalSegments = allSegments;
    if (meeting.cleanupEnabled && allSegments.length > 0) {
      const cleanupResult = await cleanupHiligaynon(allSegments);
      cleanupCostUsd = cleanupResult.costUsd;
      finalSegments = cleanupResult.segments;
    }

    // Persist segments + flip statuses in a single transaction so the meeting
    // is never left in a half-transcribed state.
    const segmentRows: NewTranscriptSegment[] = finalSegments.map((s, i) => ({
      transcriptId,
      sequenceIndex: i,
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      locale: meeting.primaryLocale,
      text: s.text,
      confidence:
        typeof s.confidence === 'number'
          ? s.confidence.toFixed(2) // numeric(3,2) — Drizzle wants string
          : null,
    }));

    await db.transaction(async (tx) => {
      if (segmentRows.length > 0) {
        await tx.insert(transcriptSegments).values(segmentRows);
      }
      await tx
        .update(transcripts)
        .set({
          status: 'in_review',
          metadata: {
            totalAudioSeconds: totalDurationSeconds,
            asrCostUsd,
            cleanupCostUsd,
            transcribedAt: new Date().toISOString(),
            asrModel: 'whisper-1',
            cleanupModel: meeting.cleanupEnabled ? 'gpt-4o' : null,
            chunkCount: chunks.length,
          },
          updatedAt: new Date(),
        })
        .where(eq(transcripts.id, transcriptId));
      await tx
        .update(meetings)
        .set({ status: 'transcript_in_review', updatedAt: new Date() })
        .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, meetingId)));
    });

    await writeAudit({
      actorId: ctx.actorId,
      actorRole: ctx.actorRole,
      action: 'meeting.transcription_completed',
      category: 'meeting',
      targetType: 'meeting',
      targetId: meetingId,
      metadata: {
        chunkCount: chunks.length,
        segmentCount: segmentRows.length,
        totalDurationSeconds,
        asrCostUsd,
        cleanupCostUsd,
        totalCostUsd: asrCostUsd + cleanupCostUsd,
        cleanupApplied: meeting.cleanupEnabled,
      },
    });

    return {
      transcriptId,
      segmentCount: segmentRows.length,
      totalDurationSeconds,
      asrCostUsd,
      cleanupCostUsd,
      cleanupApplied: meeting.cleanupEnabled,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unknown transcription error.';

    // Best-effort: mark transcript as failed so the UI surfaces it. Don't
    // mask the original error if this update itself fails.
    try {
      await db
        .update(transcripts)
        .set({
          status: 'asr_failed',
          metadata: {
            error: errMsg,
            failedAt: new Date().toISOString(),
            chunkCount: chunks.length,
          },
          updatedAt: new Date(),
        })
        .where(eq(transcripts.id, transcriptId));
    } catch {
      // ignore — original error wins
    }

    await writeAudit({
      actorId: ctx.actorId,
      actorRole: ctx.actorRole,
      action: 'meeting.transcription_failed',
      category: 'meeting',
      targetType: 'meeting',
      targetId: meetingId,
      alert: true,
      metadata: { error: errMsg, chunkCount: chunks.length },
    });

    throw e;
  }
}
