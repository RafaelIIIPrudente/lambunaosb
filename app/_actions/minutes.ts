'use server';

import 'server-only';

import { and, asc, eq, isNull, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import {
  meetingMinutes,
  meetings,
  newsPosts,
  profiles,
  sbMembers,
  transcripts,
  transcriptSegments,
  type MinutesItemOfBusiness,
} from '@/lib/db/schema';
import { generateMinutesFromTranscript } from '@/lib/services/minutes-generation';
import { deriveMinutesSlug, renderMinutesToMarkdown } from '@/lib/services/minutes-render';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  archiveMinutesSchema,
  attestMinutesSchema,
  markMinutesReadyForAttestationSchema,
  publishMinutesSchema,
  unpublishMinutesSchema,
  updateMinutesSchema,
} from '@/lib/validators/minutes';
import { generateMinutesSchema } from '@/lib/validators/transcript';

/**
 * Generate the minutes-of-the-meeting from an approved transcript via gpt-4o
 * structured output. Secretary-only. Inserts a meeting_minutes row in
 * 'draft' status; the Secretary then reviews/edits in the Step 12 UI.
 *
 * Refuses to overwrite an existing meeting_minutes row — to regenerate,
 * the Secretary must archive the existing draft first.
 */
export async function generateMinutes(raw: unknown): Promise<
  Result<{
    minutesId: string;
    itemCount: number;
    costUsd: number;
  }>
> {
  const parsed = generateMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can generate minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    const [meeting] = await db
      .select({
        id: meetings.id,
        status: meetings.status,
        title: meetings.title,
        type: meetings.type,
        scheduledAt: meetings.scheduledAt,
        location: meetings.location,
        primaryLocale: meetings.primaryLocale,
        presiderId: meetings.presiderId,
      })
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
    if (meeting.status !== 'transcript_approved') {
      return err(
        'Minutes can only be generated after the transcript is approved.',
        'E_INVALID_STATE',
      );
    }

    // Refuse to overwrite an existing draft/published row.
    const [existingMinutes] = await db
      .select({ id: meetingMinutes.id, status: meetingMinutes.status })
      .from(meetingMinutes)
      .where(
        and(
          eq(meetingMinutes.tenantId, tenantId),
          eq(meetingMinutes.meetingId, parsed.data.meetingId),
          isNull(meetingMinutes.deletedAt),
        ),
      )
      .limit(1);
    if (existingMinutes) {
      return err(
        `Minutes already exist for this meeting (status: ${existingMinutes.status}). Archive them first to regenerate.`,
        'E_INVALID_STATE',
      );
    }

    // Fetch the approved transcript + ordered segments.
    const [transcript] = await db
      .select({ id: transcripts.id, status: transcripts.status })
      .from(transcripts)
      .where(
        and(eq(transcripts.tenantId, tenantId), eq(transcripts.meetingId, parsed.data.meetingId)),
      )
      .limit(1);
    if (!transcript) return err('No transcript found for this meeting.', 'E_NOT_FOUND');
    if (transcript.status !== 'approved') {
      return err('Transcript must be approved before generating minutes.', 'E_INVALID_STATE');
    }

    const segments = await db
      .select({
        startMs: transcriptSegments.startMs,
        endMs: transcriptSegments.endMs,
        speakerId: transcriptSegments.speakerId,
        speakerLabel: transcriptSegments.speakerLabel,
        text: transcriptSegments.text,
      })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.transcriptId, transcript.id))
      .orderBy(asc(transcriptSegments.sequenceIndex));
    if (segments.length === 0) {
      return err('Transcript has no segments to summarise.', 'E_INVALID_STATE');
    }

    // Resolve speaker IDs → names + collect active members for the gpt-4o
    // roster prompt.
    const speakerIds = Array.from(
      new Set(segments.map((s) => s.speakerId).filter((id): id is string => !!id)),
    );
    const speakerRows =
      speakerIds.length > 0
        ? await db
            .select({
              id: sbMembers.id,
              honorific: sbMembers.honorific,
              fullName: sbMembers.fullName,
            })
            .from(sbMembers)
            .where(inArray(sbMembers.id, speakerIds))
        : [];
    const speakerLookup = new Map(speakerRows.map((m) => [m.id, `${m.honorific} ${m.fullName}`]));

    const allMembers = await db
      .select({
        id: sbMembers.id,
        honorific: sbMembers.honorific,
        fullName: sbMembers.fullName,
      })
      .from(sbMembers)
      .where(and(eq(sbMembers.tenantId, tenantId), isNull(sbMembers.deletedAt)));

    const presiderName = meeting.presiderId
      ? (speakerLookup.get(meeting.presiderId) ??
        allMembers.find((m) => m.id === meeting.presiderId)?.fullName ??
        null)
      : null;

    const result = await generateMinutesFromTranscript({
      meetingTitle: meeting.title,
      meetingType: meeting.type,
      meetingDate: meeting.scheduledAt.toISOString(),
      scheduledLocation: meeting.location,
      primaryLocale: meeting.primaryLocale,
      presiderName,
      members: allMembers,
      segments: segments.map((s) => ({
        startMs: s.startMs,
        endMs: s.endMs,
        speakerName: s.speakerId ? (speakerLookup.get(s.speakerId) ?? null) : s.speakerLabel,
        text: s.text,
      })),
    });

    const now = new Date();
    const [inserted] = await db
      .insert(meetingMinutes)
      .values({
        tenantId,
        meetingId: parsed.data.meetingId,
        status: 'draft',
        coverHeader: result.coverHeader,
        attendeesText: result.attendeesText,
        itemsOfBusiness: result.itemsOfBusiness,
        adjournmentSummary: result.adjournmentSummary,
        draftedById: ctx.userId,
        draftedAt: now,
        generationCostUsd: result.costUsd.toFixed(4),
      })
      .returning({ id: meetingMinutes.id });
    if (!inserted) return err('Failed to insert minutes row.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'meeting.minutes_drafted',
      category: 'meeting',
      targetType: 'meeting',
      targetId: parsed.data.meetingId,
      metadata: {
        minutesId: inserted.id,
        itemCount: result.itemsOfBusiness.length,
        costUsd: result.costUsd,
        modelVersion: result.modelVersion,
      },
    });

    revalidatePath(`/admin/meetings/${parsed.data.meetingId}`);
    revalidatePath(`/admin/meetings/${parsed.data.meetingId}/transcript`);

    return ok({
      minutesId: inserted.id,
      itemCount: result.itemsOfBusiness.length,
      costUsd: result.costUsd,
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Failed to generate minutes.',
      'E_MINUTES_GENERATION_FAILED',
    );
  }
}

const SECRETARY_ONLY: ReadonlyArray<string> = ['secretary'];
const ATTEST_ROLES: ReadonlyArray<string> = ['vice_mayor', 'mayor'];

async function loadMinutesForMutation(minutesId: string, tenantId: string) {
  const [row] = await db
    .select({
      id: meetingMinutes.id,
      meetingId: meetingMinutes.meetingId,
      status: meetingMinutes.status,
      publishedNewsPostId: meetingMinutes.publishedNewsPostId,
    })
    .from(meetingMinutes)
    .where(
      and(
        eq(meetingMinutes.tenantId, tenantId),
        eq(meetingMinutes.id, minutesId),
        isNull(meetingMinutes.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function updateMinutes(raw: unknown): Promise<Result<void>> {
  const parsed = updateMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!SECRETARY_ONLY.includes(ctx.profile.role)) {
    return err('Only the Secretary can edit minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const existing = await loadMinutesForMutation(parsed.data.minutesId, tenantId);
    if (!existing) return err('Minutes not found.', 'E_NOT_FOUND');
    if (existing.status !== 'draft' && existing.status !== 'awaiting_attestation') {
      return err(
        'Minutes can only be edited while in draft or awaiting-attestation.',
        'E_INVALID_STATE',
      );
    }

    // Reassign order by position; preserve ids supplied by the form.
    const items: MinutesItemOfBusiness[] = parsed.data.itemsOfBusiness.map((it, i) => ({
      id: it.id,
      order: i + 1,
      topic: it.topic,
      motionText: it.motionText,
      motionedByName: it.motionedByName,
      motionedById: it.motionedById,
      secondedByName: it.secondedByName,
      secondedById: it.secondedById,
      discussionSummary: it.discussionSummary,
      disposition: it.disposition,
      voteSummary: it.voteSummary,
    }));

    await db
      .update(meetingMinutes)
      .set({
        coverHeader: parsed.data.coverHeader,
        attendeesText: parsed.data.attendeesText,
        itemsOfBusiness: items,
        adjournmentSummary: parsed.data.adjournmentSummary,
        // Editing in awaiting_attestation rolls it back to draft so the
        // attestation can't be silently moved out from under the attester.
        status: 'draft',
        readyForAttestationAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, existing.id)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.updated',
      category: 'meeting',
      targetType: 'meeting',
      targetId: existing.meetingId,
      metadata: { minutesId: existing.id, itemCount: items.length },
    });

    revalidatePath(`/admin/meetings/${existing.meetingId}`);
    revalidatePath(`/admin/meetings/${existing.meetingId}/minutes`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update minutes.', 'E_UNKNOWN');
  }
}

export async function markMinutesReadyForAttestation(raw: unknown): Promise<Result<void>> {
  const parsed = markMinutesReadyForAttestationSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!SECRETARY_ONLY.includes(ctx.profile.role)) {
    return err('Only the Secretary can submit minutes for attestation.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const existing = await loadMinutesForMutation(parsed.data.minutesId, tenantId);
    if (!existing) return err('Minutes not found.', 'E_NOT_FOUND');
    if (existing.status !== 'draft') {
      return err('Only drafts can be marked ready for attestation.', 'E_INVALID_STATE');
    }

    const now = new Date();
    await db
      .update(meetingMinutes)
      .set({ status: 'awaiting_attestation', readyForAttestationAt: now, updatedAt: now })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, existing.id)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.ready_for_attestation',
      category: 'meeting',
      targetType: 'meeting',
      targetId: existing.meetingId,
      metadata: { minutesId: existing.id },
    });

    revalidatePath(`/admin/meetings/${existing.meetingId}`);
    revalidatePath(`/admin/meetings/${existing.meetingId}/minutes`);
    return ok(undefined);
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Failed to mark ready for attestation.',
      'E_UNKNOWN',
    );
  }
}

export async function attestMinutes(raw: unknown): Promise<Result<void>> {
  const parsed = attestMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!ATTEST_ROLES.includes(ctx.profile.role)) {
    return err('Only the Vice Mayor or Mayor can attest minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const existing = await loadMinutesForMutation(parsed.data.minutesId, tenantId);
    if (!existing) return err('Minutes not found.', 'E_NOT_FOUND');
    if (existing.status !== 'awaiting_attestation') {
      return err(
        'Minutes must be marked ready for attestation before the presiding officer attests.',
        'E_INVALID_STATE',
      );
    }

    const now = new Date();
    await db
      .update(meetingMinutes)
      .set({ status: 'attested', attestedById: ctx.userId, attestedAt: now, updatedAt: now })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, existing.id)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.attested',
      category: 'meeting',
      targetType: 'meeting',
      targetId: existing.meetingId,
      metadata: { minutesId: existing.id, attestedById: ctx.userId },
    });

    revalidatePath(`/admin/meetings/${existing.meetingId}`);
    revalidatePath(`/admin/meetings/${existing.meetingId}/minutes`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to attest minutes.', 'E_UNKNOWN');
  }
}

export async function publishMinutes(raw: unknown): Promise<Result<{ slug: string }>> {
  const parsed = publishMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!SECRETARY_ONLY.includes(ctx.profile.role)) {
    return err('Only the Secretary can publish minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();

    // Load full minutes + meeting metadata in one round trip.
    const [row] = await db
      .select({
        minutes: meetingMinutes,
        meetingTitle: meetings.title,
        meetingType: meetings.type,
        meetingScheduledAt: meetings.scheduledAt,
        meetingLocation: meetings.location,
        meetingSequenceNumber: meetings.sequenceNumber,
      })
      .from(meetingMinutes)
      .innerJoin(meetings, eq(meetings.id, meetingMinutes.meetingId))
      .where(
        and(
          eq(meetingMinutes.tenantId, tenantId),
          eq(meetingMinutes.id, parsed.data.minutesId),
          isNull(meetingMinutes.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return err('Minutes not found.', 'E_NOT_FOUND');
    if (row.minutes.status !== 'attested') {
      return err(
        'Minutes must be attested by the presiding officer before publish.',
        'E_INVALID_STATE',
      );
    }

    // Resolve names (presider + attestor) for the rendered markdown.
    const namedIds = [row.minutes.attestedById].filter((id): id is string => !!id);
    const namedRows =
      namedIds.length > 0
        ? await db
            .select({
              id: profiles.id,
              fullName: profiles.fullName,
              honorific: profiles.honorific,
            })
            .from(profiles)
            .where(inArray(profiles.id, namedIds))
        : [];
    const profileLookup = new Map(
      namedRows.map((p) => [p.id, `${p.honorific ?? 'Hon.'} ${p.fullName}`]),
    );

    // Presider lives on the meeting + sb_members; load it.
    const [meetingRow] = await db
      .select({
        presiderName: sbMembers.fullName,
        presiderHonorific: sbMembers.honorific,
      })
      .from(meetings)
      .leftJoin(sbMembers, eq(sbMembers.id, meetings.presiderId))
      .where(eq(meetings.id, row.minutes.meetingId))
      .limit(1);
    const presiderName =
      meetingRow?.presiderName != null
        ? `${meetingRow.presiderHonorific ?? 'Hon.'} ${meetingRow.presiderName}`
        : null;

    const attestedByName = row.minutes.attestedById
      ? (profileLookup.get(row.minutes.attestedById) ?? null)
      : null;

    const now = new Date();
    const bodyMdx = renderMinutesToMarkdown({
      meetingTitle: row.meetingTitle,
      meetingType: row.meetingType,
      meetingDate: row.meetingScheduledAt,
      location: row.meetingLocation,
      presiderName,
      attestedByName,
      publishedAt: now,
      coverHeader: row.minutes.coverHeader,
      attendeesText: row.minutes.attendeesText,
      itemsOfBusiness: row.minutes.itemsOfBusiness as MinutesItemOfBusiness[],
      adjournmentSummary: row.minutes.adjournmentSummary,
    });

    const slug = deriveMinutesSlug({
      meetingType: row.meetingType,
      scheduledAt: row.meetingScheduledAt,
      sequenceNumber: row.meetingSequenceNumber,
    });

    const newsTitle = `Minutes — ${row.meetingTitle}`;
    const newsExcerpt = `Official minutes of the ${row.meetingType.replace(/_/g, ' ')} session held ${row.meetingScheduledAt.toISOString().slice(0, 10)}.`;

    // Atomically: insert/update news_post, link via meeting_minutes, flip
    // both meeting + minutes status. If the post already exists (e.g.
    // republish after unpublish), update it in place rather than insert a
    // duplicate.
    let publishedNewsPostId = row.minutes.publishedNewsPostId;

    if (publishedNewsPostId) {
      await db
        .update(newsPosts)
        .set({
          title: newsTitle,
          excerpt: newsExcerpt,
          bodyMdx,
          status: 'published',
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(newsPosts.id, publishedNewsPostId));
    } else {
      const [postInserted] = await db
        .insert(newsPosts)
        .values({
          tenantId,
          slug,
          title: newsTitle,
          excerpt: newsExcerpt,
          bodyMdx,
          category: 'announcement',
          status: 'published',
          visibility: 'public',
          pinned: false,
          tags: ['minutes', 'sb-session'],
          authorId: ctx.userId,
          meetingId: row.minutes.meetingId,
          publishedAt: now,
        })
        .returning({ id: newsPosts.id });
      if (!postInserted) {
        return err('Failed to create the linked news post.', 'E_INSERT_FAILED');
      }
      publishedNewsPostId = postInserted.id;
    }

    await db
      .update(meetingMinutes)
      .set({
        status: 'published',
        publishedAt: now,
        publishedNewsPostId,
        updatedAt: now,
      })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, row.minutes.id)));

    await db
      .update(meetings)
      .set({ status: 'minutes_published', updatedAt: now })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, row.minutes.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.published',
      category: 'meeting',
      targetType: 'meeting',
      targetId: row.minutes.meetingId,
      metadata: {
        minutesId: row.minutes.id,
        newsPostId: publishedNewsPostId,
        slug,
      },
    });

    revalidatePath('/news');
    revalidatePath(`/news/${slug}`);
    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${row.minutes.meetingId}`);
    revalidatePath(`/admin/meetings/${row.minutes.meetingId}/minutes`);
    revalidatePath('/admin/news');

    return ok({ slug });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to publish minutes.', 'E_UNKNOWN');
  }
}

export async function unpublishMinutes(raw: unknown): Promise<Result<void>> {
  const parsed = unpublishMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!SECRETARY_ONLY.includes(ctx.profile.role)) {
    return err('Only the Secretary can unpublish minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const existing = await loadMinutesForMutation(parsed.data.minutesId, tenantId);
    if (!existing) return err('Minutes not found.', 'E_NOT_FOUND');
    if (existing.status !== 'published') {
      return err('Only published minutes can be unpublished.', 'E_INVALID_STATE');
    }

    const now = new Date();

    if (existing.publishedNewsPostId) {
      await db
        .update(newsPosts)
        .set({ status: 'archived', updatedAt: now })
        .where(eq(newsPosts.id, existing.publishedNewsPostId));
    }

    await db
      .update(meetingMinutes)
      .set({
        status: 'attested',
        publishedAt: null,
        updatedAt: now,
      })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, existing.id)));

    // Roll the meeting back to transcript_approved so the user clearly sees
    // the chain isn't published anymore.
    await db
      .update(meetings)
      .set({ status: 'transcript_approved', updatedAt: now })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, existing.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.unpublished',
      category: 'meeting',
      targetType: 'meeting',
      targetId: existing.meetingId,
      alert: true,
      metadata: {
        minutesId: existing.id,
        reason: parsed.data.reason,
        newsPostId: existing.publishedNewsPostId,
      },
    });

    revalidatePath('/news');
    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${existing.meetingId}`);
    revalidatePath(`/admin/meetings/${existing.meetingId}/minutes`);
    revalidatePath('/admin/news');
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to unpublish minutes.', 'E_UNKNOWN');
  }
}

export async function archiveMinutes(raw: unknown): Promise<Result<void>> {
  const parsed = archiveMinutesSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!SECRETARY_ONLY.includes(ctx.profile.role)) {
    return err('Only the Secretary can archive minutes.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const existing = await loadMinutesForMutation(parsed.data.minutesId, tenantId);
    if (!existing) return err('Minutes not found.', 'E_NOT_FOUND');
    if (existing.status === 'archived') {
      return err('Minutes are already archived.', 'E_INVALID_STATE');
    }

    const now = new Date();
    await db
      .update(meetingMinutes)
      .set({ status: 'archived', updatedAt: now, deletedAt: now })
      .where(and(eq(meetingMinutes.tenantId, tenantId), eq(meetingMinutes.id, existing.id)));

    if (existing.publishedNewsPostId) {
      await db
        .update(newsPosts)
        .set({ status: 'archived', updatedAt: now })
        .where(eq(newsPosts.id, existing.publishedNewsPostId));
    }

    // Roll the meeting back so a fresh draft can be regenerated.
    await db
      .update(meetings)
      .set({ status: 'transcript_approved', updatedAt: now })
      .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, existing.meetingId)));

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'minutes.archived',
      category: 'meeting',
      targetType: 'meeting',
      targetId: existing.meetingId,
      alert: true,
      metadata: {
        minutesId: existing.id,
        reason: parsed.data.reason,
        previousStatus: existing.status,
      },
    });

    revalidatePath('/admin/meetings');
    revalidatePath(`/admin/meetings/${existing.meetingId}`);
    revalidatePath(`/admin/meetings/${existing.meetingId}/minutes`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to archive minutes.', 'E_UNKNOWN');
  }
}
