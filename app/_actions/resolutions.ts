'use server';

import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { resolutions, resolutionVersions } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  advanceToSecondReadingSchema,
  approveResolutionSchema,
  createResolutionSchema,
  fileResolutionSchema,
  publishResolutionSchema,
  softDeleteResolutionSchema,
  updateResolutionSchema,
  uploadResolutionPdfSchema,
  withdrawResolutionSchema,
} from '@/lib/validators/resolution';

const AUTHOR_ROLES = ['secretary', 'mayor', 'vice_mayor', 'sb_member'] as const;
const PUBLISH_ROLES = ['secretary', 'mayor'] as const;
const WITHDRAW_ROLES = ['secretary', 'mayor', 'vice_mayor'] as const;
const APPROVE_ROLES = ['secretary', 'mayor', 'vice_mayor'] as const;
const FILE_ROLES = ['secretary', 'mayor', 'vice_mayor', 'sb_member'] as const;

type Role = 'secretary' | 'mayor' | 'vice_mayor' | 'sb_member';

function hasRole(role: string, allowed: readonly Role[]): boolean {
  return (allowed as readonly string[]).includes(role);
}

async function getNextSequenceNumber(tenantId: string, year: number): Promise<number> {
  const [latest] = await db
    .select({ sequenceNumber: resolutions.sequenceNumber })
    .from(resolutions)
    .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.year, year)))
    .orderBy(desc(resolutions.sequenceNumber))
    .limit(1);
  return (latest?.sequenceNumber ?? 0) + 1;
}

async function getNextVersionNumber(resolutionId: string): Promise<number> {
  const [latest] = await db
    .select({ versionNumber: resolutionVersions.versionNumber })
    .from(resolutionVersions)
    .where(eq(resolutionVersions.resolutionId, resolutionId))
    .orderBy(desc(resolutionVersions.versionNumber))
    .limit(1);
  return (latest?.versionNumber ?? 0) + 1;
}

async function snapshotVersion(args: {
  tenantId: string;
  resolutionId: string;
  label: string;
  authorId: string;
}): Promise<void> {
  const [row] = await db
    .select({ bodyMd: resolutions.bodyMd, pdfStoragePath: resolutions.pdfStoragePath })
    .from(resolutions)
    .where(eq(resolutions.id, args.resolutionId))
    .limit(1);
  if (!row) return;
  const versionNumber = await getNextVersionNumber(args.resolutionId);
  await db.insert(resolutionVersions).values({
    tenantId: args.tenantId,
    resolutionId: args.resolutionId,
    versionNumber,
    label: args.label,
    bodyMdSnapshot: row.bodyMd,
    pdfStoragePath: row.pdfStoragePath ?? null,
    authorId: args.authorId,
  });
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createResolution(
  raw: unknown,
): Promise<Result<{ id: string; number: string }>> {
  const parsed = createResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, AUTHOR_ROLES)) {
    return err('You do not have permission to create resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const year = Number(parsed.data.dateFiled.slice(0, 4));
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return err('Date filed must be a valid date.', 'E_VALIDATION');
    }
    const sequenceNumber = await getNextSequenceNumber(tenantId, year);
    const formattedNumber = `RES-${year}-${sequenceNumber.toString().padStart(3, '0')}`;

    const [row] = await db
      .insert(resolutions)
      .values({
        tenantId,
        number: formattedNumber,
        year,
        sequenceNumber,
        type: parsed.data.type,
        title: parsed.data.title,
        bodyMd: parsed.data.bodyMd,
        primarySponsorId: parsed.data.primarySponsorId ?? null,
        coSponsorIds: parsed.data.coSponsorIds,
        meetingId: parsed.data.meetingId ?? null,
        committeeId: parsed.data.committeeId ?? null,
        tags: parsed.data.tags,
        dateFiled: parsed.data.dateFiled,
        createdBy: ctx.userId,
      })
      .returning({ id: resolutions.id, number: resolutions.number });

    if (!row) return err('Failed to create resolution.', 'E_INSERT_FAILED');

    await snapshotVersion({
      tenantId,
      resolutionId: row.id,
      label: 'Created as draft',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.created',
      category: 'resolution',
      targetType: 'resolution',
      targetId: row.id,
      metadata: { number: row.number, title: parsed.data.title },
    });

    revalidatePath('/admin/resolutions');
    return ok({ id: row.id, number: row.number });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create resolution.', 'E_UNKNOWN');
  }
}

export async function updateResolution(raw: unknown): Promise<Result<void>> {
  const parsed = updateResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, AUTHOR_ROLES)) {
    return err('You do not have permission to update resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: resolutions.status })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status !== 'draft') {
      return err('Only drafts can be edited.', 'E_INVALID_STATE');
    }

    const result = await db
      .update(resolutions)
      .set({
        type: parsed.data.type,
        title: parsed.data.title,
        bodyMd: parsed.data.bodyMd,
        primarySponsorId: parsed.data.primarySponsorId ?? null,
        coSponsorIds: parsed.data.coSponsorIds,
        meetingId: parsed.data.meetingId ?? null,
        committeeId: parsed.data.committeeId ?? null,
        tags: parsed.data.tags,
        dateFiled: parsed.data.dateFiled,
        updatedAt: new Date(),
      })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });

    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Draft saved',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.updated',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      metadata: { title: parsed.data.title },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update resolution.', 'E_UNKNOWN');
  }
}

export async function fileResolution(raw: unknown): Promise<Result<void>> {
  const parsed = fileResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, FILE_ROLES)) {
    return err('You do not have permission to file resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: resolutions.status })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status !== 'draft') {
      return err('Only drafts can be filed.', 'E_INVALID_STATE');
    }

    const today = todayDateString();
    const result = await db
      .update(resolutions)
      .set({ status: 'pending', firstReadingAt: today, updatedAt: new Date() })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });
    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Filed for first reading',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.filed',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      metadata: { firstReadingAt: today },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to file resolution.', 'E_UNKNOWN');
  }
}

export async function advanceToSecondReading(raw: unknown): Promise<Result<void>> {
  const parsed = advanceToSecondReadingSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, FILE_ROLES)) {
    return err('You do not have permission to advance resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        status: resolutions.status,
        firstReadingAt: resolutions.firstReadingAt,
        secondReadingAt: resolutions.secondReadingAt,
      })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status !== 'pending') {
      return err('Resolution must be in review to advance.', 'E_INVALID_STATE');
    }
    if (!existing.firstReadingAt) {
      return err('Resolution must have a first reading recorded.', 'E_INVALID_STATE');
    }
    if (existing.secondReadingAt) {
      return err('Second reading has already been recorded.', 'E_INVALID_STATE');
    }

    const today = todayDateString();
    const result = await db
      .update(resolutions)
      .set({ secondReadingAt: today, updatedAt: new Date() })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });
    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Advanced to second reading',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.second_reading',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      metadata: { secondReadingAt: today },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to advance resolution.', 'E_UNKNOWN');
  }
}

export async function approveResolution(raw: unknown): Promise<Result<void>> {
  const parsed = approveResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, APPROVE_ROLES)) {
    return err('You do not have permission to approve resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({
        status: resolutions.status,
        secondReadingAt: resolutions.secondReadingAt,
      })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status !== 'pending') {
      return err('Resolution must be in review to be approved.', 'E_INVALID_STATE');
    }
    if (!existing.secondReadingAt) {
      return err('Resolution must complete second reading before approval.', 'E_INVALID_STATE');
    }

    const result = await db
      .update(resolutions)
      .set({
        status: 'approved',
        voteSummary: parsed.data.voteSummary,
        updatedAt: new Date(),
      })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });
    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Approved by vote',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.approved',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      metadata: { voteSummary: parsed.data.voteSummary },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to approve resolution.', 'E_UNKNOWN');
  }
}

export async function publishResolution(raw: unknown): Promise<Result<{ publishedAt: string }>> {
  const parsed = publishResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, PUBLISH_ROLES)) {
    return err('Only Secretary or Mayor can publish resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: resolutions.status })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status !== 'approved') {
      return err('Only approved resolutions can be published.', 'E_INVALID_STATE');
    }

    const publishedAt = new Date();
    const result = await db
      .update(resolutions)
      .set({ status: 'published', publishedAt, updatedAt: publishedAt })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id, number: resolutions.number });
    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Published',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.published',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      alert: true,
      metadata: { number: result[0]?.number ?? null, publishedAt: publishedAt.toISOString() },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    revalidatePath('/');
    return ok({ publishedAt: publishedAt.toISOString() });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to publish resolution.', 'E_UNKNOWN');
  }
}

export async function withdrawResolution(raw: unknown): Promise<Result<void>> {
  const parsed = withdrawResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, WITHDRAW_ROLES)) {
    return err('You do not have permission to withdraw resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ status: resolutions.status })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.status === 'withdrawn') {
      return err('Resolution is already withdrawn.', 'E_INVALID_STATE');
    }

    const withdrawnAt = new Date();
    const result = await db
      .update(resolutions)
      .set({ status: 'withdrawn', withdrawnAt, updatedAt: withdrawnAt })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });
    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Withdrawn',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.withdrawn',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      alert: true,
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to withdraw resolution.', 'E_UNKNOWN');
  }
}

export async function softDeleteResolution(raw: unknown): Promise<Result<void>> {
  const parsed = softDeleteResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (ctx.profile.role !== 'secretary') {
    return err('Only the Secretary can archive resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const [existing] = await db
      .select({ id: resolutions.id, deletedAt: resolutions.deletedAt })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .limit(1);
    if (!existing) return err('Resolution not found.', 'E_NOT_FOUND');
    if (existing.deletedAt) {
      return err('Resolution is already archived.', 'E_INVALID_STATE');
    }

    const deletedAt = new Date();
    await db
      .update(resolutions)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)));

    await snapshotVersion({
      tenantId,
      resolutionId: parsed.data.resolutionId,
      label: 'Archived',
      authorId: ctx.userId,
    });

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.deleted',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      alert: true,
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath('/admin/resolutions');
    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to archive resolution.', 'E_UNKNOWN');
  }
}

export async function uploadResolutionPdf(raw: unknown): Promise<Result<void>> {
  const parsed = uploadResolutionPdfSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!hasRole(ctx.profile.role, AUTHOR_ROLES)) {
    return err('You do not have permission to upload resolution PDFs.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const result = await db
      .update(resolutions)
      .set({
        pdfStoragePath: parsed.data.storagePath,
        pdfPageCount: parsed.data.pageCount ?? null,
        pdfByteSize: parsed.data.byteSize ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });

    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.pdf_uploaded',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
      metadata: { storagePath: parsed.data.storagePath, byteSize: parsed.data.byteSize },
    });

    revalidatePath(`/admin/resolutions/${parsed.data.resolutionId}`);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to upload PDF.', 'E_UNKNOWN');
  }
}
