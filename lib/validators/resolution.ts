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

export type ResolutionStatusValue = (typeof RESOLUTION_STATUSES)[number];

export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatusValue, string> = {
  draft: 'Draft',
  pending: 'In review',
  approved: 'Approved',
  withdrawn: 'Withdrawn',
  published: 'Published',
};

export const createResolutionSchema = z.object({
  type: z.enum(RESOLUTION_TYPES),
  title: z.string().min(5, 'Title must be at least 5 characters.').max(280),
  bodyMd: z.string(),
  primarySponsorId: z.uuid().nullable().optional(),
  coSponsorIds: z.array(z.uuid()).max(20),
  meetingId: z.uuid().nullable().optional(),
  committeeId: z.uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(60)).max(20),
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

const justResolutionId = z.object({ resolutionId: z.uuid() });

export const fileResolutionSchema = justResolutionId;
export type FileResolutionInput = z.infer<typeof fileResolutionSchema>;

export const advanceToSecondReadingSchema = justResolutionId;
export type AdvanceToSecondReadingInput = z.infer<typeof advanceToSecondReadingSchema>;

export const approveResolutionSchema = z.object({
  resolutionId: z.uuid(),
  voteSummary: z
    .string()
    .min(3, 'Vote summary is required.')
    .max(280, 'Vote summary must be at most 280 characters.'),
});

export type ApproveResolutionInput = z.infer<typeof approveResolutionSchema>;

export const publishResolutionSchema = justResolutionId;
export type PublishResolutionInput = z.infer<typeof publishResolutionSchema>;

export const withdrawResolutionSchema = z.object({
  resolutionId: z.uuid(),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters.')
    .max(500, 'Reason must be at most 500 characters.'),
});

export type WithdrawResolutionInput = z.infer<typeof withdrawResolutionSchema>;

export const softDeleteResolutionSchema = z.object({
  resolutionId: z.uuid(),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters.')
    .max(500, 'Reason must be at most 500 characters.'),
});

export type SoftDeleteResolutionInput = z.infer<typeof softDeleteResolutionSchema>;
