'use server';

import 'server-only';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthContext } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { resolutions } from '@/lib/db/schema';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import {
  createResolutionSchema,
  publishResolutionSchema,
  updateResolutionSchema,
  uploadResolutionPdfSchema,
  withdrawResolutionSchema,
} from '@/lib/validators/resolution';

const AUTHOR_ROLES = ['secretary', 'mayor', 'vice_mayor', 'sb_member'] as const;
const PUBLISH_ROLES = ['secretary', 'mayor'] as const;
const WITHDRAW_ROLES = ['secretary', 'mayor', 'vice_mayor'] as const;

export async function createResolution(
  raw: unknown,
): Promise<Result<{ id: string; number: string }>> {
  const parsed = createResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!AUTHOR_ROLES.includes(ctx.profile.role as (typeof AUTHOR_ROLES)[number])) {
    return err('You do not have permission to create resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const yearStr = parsed.data.number.slice(0, 4);
    const seqStr = parsed.data.number.slice(5);
    const year = Number(yearStr);
    const sequenceNumber = Number(seqStr);
    const formattedNumber = `RES-${parsed.data.number}`;

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
  if (!AUTHOR_ROLES.includes(ctx.profile.role as (typeof AUTHOR_ROLES)[number])) {
    return err('You do not have permission to update resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
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

export async function uploadResolutionPdf(raw: unknown): Promise<Result<void>> {
  const parsed = uploadResolutionPdfSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!AUTHOR_ROLES.includes(ctx.profile.role as (typeof AUTHOR_ROLES)[number])) {
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

export async function publishResolution(raw: unknown): Promise<Result<{ publishedAt: string }>> {
  const parsed = publishResolutionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input.', 'E_VALIDATION');
  }

  const ctx = await getAuthContext();
  if (!ctx) return err('You must be signed in.', 'E_UNAUTHORIZED');
  if (!PUBLISH_ROLES.includes(ctx.profile.role as (typeof PUBLISH_ROLES)[number])) {
    return err('Only Secretary or Mayor can publish resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const publishedAt = new Date();
    const result = await db
      .update(resolutions)
      .set({ status: 'published', publishedAt, updatedAt: publishedAt })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id, number: resolutions.number });

    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

    await writeAudit({
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      action: 'resolution.published',
      category: 'resolution',
      targetType: 'resolution',
      targetId: parsed.data.resolutionId,
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
  if (!WITHDRAW_ROLES.includes(ctx.profile.role as (typeof WITHDRAW_ROLES)[number])) {
    return err('You do not have permission to withdraw resolutions.', 'E_FORBIDDEN');
  }

  try {
    const tenantId = await getCurrentTenantId();
    const withdrawnAt = new Date();
    const result = await db
      .update(resolutions)
      .set({ status: 'withdrawn', withdrawnAt, updatedAt: withdrawnAt })
      .where(and(eq(resolutions.tenantId, tenantId), eq(resolutions.id, parsed.data.resolutionId)))
      .returning({ id: resolutions.id });

    if (result.length === 0) return err('Resolution not found.', 'E_NOT_FOUND');

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
