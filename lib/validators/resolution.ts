import { z } from 'zod';

export const RESOLUTION_TYPES = ['ordinance', 'resolution'] as const;

export const RESOLUTION_TYPE_LABELS: Record<(typeof RESOLUTION_TYPES)[number], string> = {
  ordinance: 'Ordinance',
  resolution: 'Resolution',
};

export const RESOLUTION_STATUSES = [
  'draft',
  'pending',
  'approved',
  'withdrawn',
  'published',
] as const;

export const createResolutionSchema = z.object({
  number: z.string().regex(/^\d{4}-\d{3}$/, 'Use the format YYYY-NNN.'),
  type: z.enum(RESOLUTION_TYPES).default('resolution'),
  title: z.string().min(5).max(280),
  bodyMd: z.string().default(''),
  primarySponsorId: z.uuid().nullable().optional(),
  coSponsorIds: z.array(z.uuid()).max(20).default([]),
  meetingId: z.uuid().nullable().optional(),
  committeeId: z.uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  dateFiled: z.string().min(1, 'Date filed is required.'),
});

export type CreateResolutionInput = z.infer<typeof createResolutionSchema>;

export const updateResolutionSchema = createResolutionSchema.extend({
  resolutionId: z.uuid(),
});

export type UpdateResolutionInput = z.infer<typeof updateResolutionSchema>;

export const uploadResolutionPdfSchema = z.object({
  resolutionId: z.uuid(),
  storagePath: z.string().min(1),
  pageCount: z.number().int().min(1).optional(),
  byteSize: z.number().int().min(0).optional(),
});

export type UploadResolutionPdfInput = z.infer<typeof uploadResolutionPdfSchema>;

export const publishResolutionSchema = z.object({
  resolutionId: z.uuid(),
});

export type PublishResolutionInput = z.infer<typeof publishResolutionSchema>;

export const withdrawResolutionSchema = z.object({
  resolutionId: z.uuid(),
  reason: z.string().min(5).max(500),
});

export type WithdrawResolutionInput = z.infer<typeof withdrawResolutionSchema>;
