'use server';

import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { type AgendaItem, audioChunks, meetings } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  cancelMeetingSchema,
  createMeetingSchema,
  deleteMeetingSchema,
  finalizeRecordingSchema,
  updateMeetingSchema,
  uploadAudioChunkSchema,
} from '@/lib/validators/meeting';
import {
  startMeetingSchema,
  startTranscriptionSchema,
  stopMeetingSchema,
} from '@/lib/validators/transcript';
import { transcribeMeetingNow } from '@/lib/services/transcribe-meeting';

const ALLOWED_CREATE_ROLES = ['secretary', 'mayor', 'vice_mayor'] as const;

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

/**
 * Convert the form's free-text agenda field (one item per line) into the
 * structured AgendaItem[] shape stored in meetings.agendaJson.
 */
function parseAgendaText(text: string): AgendaItem[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((title, i) => ({ id: crypto.randomUUID(), order: i + 1, title }));
}

export async function createMeeting(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = createMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to create meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const scheduledAt = combineDateTime(parsed.data.scheduledDate, parsed.data.scheduledTime);

    const [row] = await db
      .insert(meetings)
      .values({
        tenantId,
        type: parsed.data.type,
        sequenceNumber: parsed.data.sequenceNumber,
        title: parsed.data.title,
        scheduledAt,
        presiderId: parsed.data.presiderId ?? null,
        location: parsed.data.location,
        agendaJson: parseAgendaText(parsed.data.agendaText),
        primaryLocale: parsed.data.primaryLocale,
        cleanupEnabled: parsed.data.cleanupEnabled,
        createdBy: ctx.userId,
      })
      .returning({ id: meetings.id });

    if (!row) return err('Failed to create meeting.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.created',
      category: 'meeting',
      targetType: 'meeting',
      targetId: row.id,
      metadata: { title: parsed.data.title, type: parsed.data.type },
    });

    revalidatePath('/admin/meetings');
    revalidatePath('/admin/dashboard');
    return ok({ id: row.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create meeting.', 'E_UNKNOWN');
  }
}

export async function updateMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = updateMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to update meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    // Lock down editing once recording has started — protects integrity of
    // the recorded artifact and the audit trail.
    const [existing] = await db
      .select({ status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Meeting not found.', 'E_NOT_FOUND');
    if (existing.status !== 'scheduled') {
      return err(
        'Meeting can only be edited while scheduled. Cancel and reschedule if needed.',
        'E_INVALID_STATE',
      );
    }

    const scheduledAt = combineDateTime(parsed.data.scheduledDate, parsed.data.scheduledTime);

    const result = await db
      .update(meetings)
      .set({
        type: parsed.data.type,
        sequenceNumber: parsed.data.sequenceNumber,
        title: parsed.data.title,
        scheduledAt,
        presiderId: parsed.data.presiderId ?? null,
        location: parsed.data.location,
        agendaJson: parseAgendaText(parsed.data.agendaText),
        primaryLocale: parsed.data.primaryLocale,
        cleanupEnabled: parsed.data.cleanupEnabled,
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)))
      .returning({ id: meetings.id });

    if (result.length === 0) return err('Meeting not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.updated',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: { title: parsed.data.title },
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    revalidatePath('/admin/dashboard');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update meeting.', 'E_UNKNOWN');
  }
}

export async function cancelMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = cancelMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to cancel meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Meeting not found.', 'E_NOT_FOUND');
    if (existing.status === 'cancelled') {
      return err('Meeting is already cancelled.', 'E_INVALID_STATE');
    }
    if (existing.status === 'minutes_published') {
      return err('Cannot cancel a meeting whose minutes are already published.', 'E_INVALID_STATE');
    }

    await db
      .update(meetings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.cancelled',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: { reason: parsed.data.reason, previousStatus: existing.status },
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    revalidatePath('/admin/dashboard');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to cancel meeting.', 'E_UNKNOWN');
  }
}

export async function deleteMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = deleteMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  // Only Secretary can soft-delete. Use cancelMeeting for the softer "session
  // didn't happen" path that keeps the row visible in history.
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can delete meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Meeting not found.', 'E_NOT_FOUND');
    if (existing.status === 'minutes_published') {
      return err(
        'Cannot delete a meeting whose minutes are already published. Archive the minutes first.',
        'E_INVALID_STATE',
      );
    }

    await db
      .update(meetings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.deleted',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      alert: true,
      metadata: { reason: parsed.data.reason, previousStatus: existing.status },
    });

    revalidatePath('/admin/meetings');
    revalidatePath('/admin/dashboard');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to delete meeting.', 'E_UNKNOWN');
  }
}

/**
 * Mark the meeting as in-progress (gavel falls). Independent of audio
 * recording — Secretary can mark started even when recording happens
 * externally and the audio file gets uploaded later.
 */
export async function startMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = startMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to start meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: meetings.status, primaryLocale: meetings.primaryLocale })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Meeting not found.', 'E_NOT_FOUND');
    if (existing.status !== 'scheduled') {
      return err('Meeting can only be started from the scheduled state.', 'E_INVALID_STATE');
    }

    const now = new Date();
    await db
      .update(meetings)
      .set({
        status: 'in_progress',
        startedAt: now,
        primaryLocale: parsed.data.primaryLocale,
        updatedAt: now,
      })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.started',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: { primaryLocale: parsed.data.primaryLocale },
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to start meeting.', 'E_UNKNOWN');
  }
}

/**
 * Mark the meeting as ended (adjournment). Transitions to awaiting_transcript.
 * Independent of audio finalization — that's a separate Step 8 finalize action.
 */
export async function stopMeeting(raw: unknown): Promise<Result<void>> {
  const parsed = stopMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to stop meetings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return err('Meeting not found.', 'E_NOT_FOUND');
    if (existing.status !== 'in_progress') {
      return err('Only in-progress meetings can be stopped.', 'E_INVALID_STATE');
    }

    const now = new Date();
    await db
      .update(meetings)
      .set({
        status: 'awaiting_transcript',
        endedAt: now,
        updatedAt: now,
      })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.stopped',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: {},
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to stop meeting.', 'E_UNKNOWN');
  }
}

/**
 * Records one audio chunk after the client has already uploaded its blob to
 * Supabase Storage. Idempotent on clientChunkId — safe to retry from a
 * dropped network. Action does NOT move the file; client transfers via the
 * browser Supabase client (RLS-enforced bucket INSERT).
 */
export async function uploadAudioChunk(
  raw: unknown,
): Promise<Result<{ chunkId: string; alreadyExisted: boolean }>> {
  const parsed = uploadAudioChunkSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to upload audio.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [meeting] = await db
      .select({ id: meetings.id, status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!meeting) return err('Meeting not found.', 'E_NOT_FOUND');
    if (
      meeting.status !== 'scheduled' &&
      meeting.status !== 'in_progress' &&
      meeting.status !== 'awaiting_transcript'
    ) {
      return err(
        'Audio can only be added while the meeting is scheduled, in progress, or awaiting transcript.',
        'E_INVALID_STATE',
      );
    }

    // Idempotency: if a chunk with this clientChunkId already exists, return
    // it instead of inserting a duplicate (covers retry after network drop).
    const [existing] = await db
      .select({ id: audioChunks.id })
      .from(audioChunks)
      .where(eq(audioChunks.clientChunkId, parsed.data.clientChunkId))
      .limit(1);
    if (existing) {
      return ok({ chunkId: existing.id, alreadyExisted: true });
    }

    const [row] = await db
      .insert(audioChunks)
      .values({
        tenantId,
        meetingId: parsed.data.meetingId,
        clientChunkId: parsed.data.clientChunkId,
        sequenceIndex: parsed.data.sequenceIndex,
        durationMs: parsed.data.durationMs,
        byteSize: parsed.data.byteSize,
        storagePath: parsed.data.storagePath,
        mimeType: parsed.data.mimeType,
      })
      .returning({ id: audioChunks.id });

    if (!row) return err('Failed to record audio chunk.', 'E_INSERT_FAILED');

    return ok({ chunkId: row.id, alreadyExisted: false });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to record audio chunk.', 'E_UNKNOWN');
  }
}

/**
 * Finalises the recording: sums chunk durations into meetings.audioDurationMs,
 * derives audioStoragePrefix from tenant + meeting ids, audit-logs. Does NOT
 * trigger transcription (that's Step 9). Does NOT transition meeting status —
 * call stopMeeting separately if not already stopped.
 */
export async function finalizeRecording(
  raw: unknown,
): Promise<Result<{ totalDurationMs: number; chunkCount: number }>> {
  const parsed = finalizeRecordingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to finalize recordings.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [meeting] = await db
      .select({ id: meetings.id, status: meetings.status })
      .from(meetings)
      .where(
        and(
          eq(meetings.tenantId, tenantId),
          eq(meetings.id, parsed.data.meetingId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1);
    if (!meeting) return err('Meeting not found.', 'E_NOT_FOUND');

    const [agg] = await db
      .select({
        chunkCount: sql<number>`count(*)::int`,
        totalDurationMs: sql<number>`coalesce(sum(${audioChunks.durationMs}), 0)::int`,
      })
      .from(audioChunks)
      .where(eq(audioChunks.meetingId, parsed.data.meetingId));

    if (!agg || agg.chunkCount === 0) {
      return err('No audio chunks have been uploaded yet.', 'E_INVALID_STATE');
    }

    const audioStoragePrefix = `${tenantId}/${parsed.data.meetingId}/`;

    await db
      .update(meetings)
      .set({
        audioDurationMs: agg.totalDurationMs,
        audioStoragePrefix,
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, parsed.data.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.recording_finalized',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: {
        chunkCount: agg.chunkCount,
        totalDurationMs: agg.totalDurationMs,
      },
    });

    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    return ok({ totalDurationMs: agg.totalDurationMs, chunkCount: agg.chunkCount });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to finalize recording.', 'E_UNKNOWN');
  }
}

/**
 * Synchronous transcription kickoff. Awaits the orchestrator (Whisper per
 * chunk + optional gpt-4o cleanup). Caller's UI should show a long-loading
 * state — typical 2hr session = 14 chunks × ~10-30s each = 2-7 minutes.
 *
 * Caller MUST set `export const maxDuration = 300` on the page that invokes
 * this action, or the action times out at the platform default (10s on
 * Vercel hobby, 60s on Pro server actions).
 */
export async function startTranscription(raw: unknown): Promise<
  Result<{
    transcriptId: string;
    segmentCount: number;
    totalDurationSeconds: number;
    totalCostUsd: number;
    cleanupApplied: boolean;
  }>
> {
  const parsed = startTranscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ALLOWED_CREATE_ROLES.includes(ctx.profile.role as (typeof ALLOWED_CREATE_ROLES)[number])) {
    return err('You do not have permission to start transcription.', 'E_FORBIDDEN');
  }

  try {
    const result = await transcribeMeetingNow(parsed.data.meetingId, {
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}/transcript`);

    return ok({
      transcriptId: result.transcriptId,
      segmentCount: result.segmentCount,
      totalDurationSeconds: result.totalDurationSeconds,
      totalCostUsd: result.asrCostUsd + result.cleanupCostUsd,
      cleanupApplied: result.cleanupApplied,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Transcription failed.', 'E_TRANSCRIPTION_FAILED');
  }
}
