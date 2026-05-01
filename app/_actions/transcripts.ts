'use server';

import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { meetings, transcripts, transcriptSegments } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  approveTranscriptSchema,
  batchAssignSpeakerSchema,
  unapproveTranscriptSchema,
  updateTranscriptSegmentSchema,
} from '@/lib/validators/transcript';

const APPROVE_ROLES = ['secretary', 'vice_mayor'] as const;
const EDIT_ROLES = [
  'secretary',
  'vice_mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
] as const;

export async function updateTranscriptSegment(raw: unknown): Promise<Result<void>> {
  const parsed = updateTranscriptSegmentSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!EDIT_ROLES.includes(ctx.profile.role as (typeof EDIT_ROLES)[number])) {
    return err('You do not have permission to edit transcripts.', 'E_FORBIDDEN');
  }

  try {
    const result = await db
      .update(transcriptSegments)
      .set({
        text: parsed.data.text,
        speakerId: parsed.data.speakerId ?? null,
        speakerLabel: parsed.data.speakerLabel ?? null,
        locale: parsed.data.locale,
        flag: parsed.data.flag ?? null,
        editedBy: ctx.userId,
        editedAt: new Date(),
      })
      .where(eq(transcriptSegments.id, parsed.data.segmentId))
      .returning({ id: transcriptSegments.id, transcriptId: transcriptSegments.transcriptId });

    if (result.length === 0) return err('Segment not found.', 'E_NOT_FOUND');

    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update segment.', 'E_UNKNOWN');
  }
}

export async function approveTranscript(raw: unknown): Promise<Result<void>> {
  const parsed = approveTranscriptSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!APPROVE_ROLES.includes(ctx.profile.role as (typeof APPROVE_ROLES)[number])) {
    return err('You do not have permission to approve transcripts.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const now = new Date();
    const result = await db
      .update(transcripts)
      .set({ status: 'approved', approvedBy: ctx.userId, approvedAt: now, updatedAt: now })
      .where(and(eq(transcripts.tenantId, tenantId), eq(transcripts.id, parsed.data.transcriptId)))
      .returning({ id: transcripts.id, meetingId: transcripts.meetingId });

    if (result[0] === undefined) return err('Transcript not found.', 'E_NOT_FOUND');

    await db
      .update(meetings)
      .set({ status: 'transcript_approved', updatedAt: now })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, result[0].meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'transcript.approved',
      category: 'meeting',
      targetType: 'transcript',
      targetId: parsed.data.transcriptId,
    });

    revalidatePath(`/admin/meetings/${result[0].meetingId}`);
    revalidatePath(`/admin/meetings/${result[0].meetingId}/transcript`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to approve transcript.', 'E_UNKNOWN');
  }
}

export async function batchAssignSpeaker(raw: unknown): Promise<Result<{ updated: number }>> {
  const parsed = batchAssignSpeakerSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!EDIT_ROLES.includes(ctx.profile.role as (typeof EDIT_ROLES)[number])) {
    return err('You do not have permission to edit transcripts.', 'E_FORBIDDEN');
  }

  try {
    const result = await db
      .update(transcriptSegments)
      .set({
        speakerId: parsed.data.speakerId ?? null,
        speakerLabel: parsed.data.speakerLabel ?? null,
        editedBy: ctx.userId,
        editedAt: new Date(),
      })
      .where(
        and(
          eq(transcriptSegments.transcriptId, parsed.data.transcriptId),
          inArray(transcriptSegments.id, parsed.data.segmentIds),
        ),
      )
      .returning({ id: transcriptSegments.id });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'transcript.batch_speaker_assigned',
      category: 'meeting',
      targetType: 'transcript',
      targetId: parsed.data.transcriptId,
      metadata: {
        segmentCount: result.length,
        speakerId: parsed.data.speakerId ?? null,
        speakerLabel: parsed.data.speakerLabel ?? null,
      },
    });

    return ok({ updated: result.length });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to assign speaker.', 'E_UNKNOWN');
  }
}

export async function unapproveTranscript(raw: unknown): Promise<Result<void>> {
  const parsed = unapproveTranscriptSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!APPROVE_ROLES.includes(ctx.profile.role as (typeof APPROVE_ROLES)[number])) {
    return err('You do not have permission to revert transcript approval.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const now = new Date();
    const result = await db
      .update(transcripts)
      .set({ status: 'in_review', approvedBy: null, approvedAt: null, updatedAt: now })
      .where(and(eq(transcripts.tenantId, tenantId), eq(transcripts.id, parsed.data.transcriptId)))
      .returning({ id: transcripts.id, meetingId: transcripts.meetingId });

    if (result[0] === undefined) return err('Transcript not found.', 'E_NOT_FOUND');

    await db
      .update(meetings)
      .set({ status: 'transcript_in_review', updatedAt: now })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, result[0].meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'transcript.unapproved',
      category: 'meeting',
      targetType: 'transcript',
      targetId: parsed.data.transcriptId,
    });

    revalidatePath(`/admin/meetings/${result[0].meetingId}`);
    revalidatePath(`/admin/meetings/${result[0].meetingId}/transcript`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to revert approval.', 'E_UNKNOWN');
  }
}
