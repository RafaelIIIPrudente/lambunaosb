import { z } from 'zod';

export const MINUTES_DISPOSITIONS = ['carried', 'denied', 'tabled', 'withdrawn', 'noted'] as const;

export type MinutesDispositionValue = (typeof MINUTES_DISPOSITIONS)[number];

export const MINUTES_DISPOSITION_LABELS: Record<MinutesDispositionValue, string> = {
  carried: 'Carried',
  denied: 'Denied',
  tabled: 'Tabled',
  withdrawn: 'Withdrawn',
  noted: 'Noted',
};

export const MINUTES_STATUSES = [
  'draft',
  'awaiting_attestation',
  'attested',
  'published',
  'archived',
] as const;

export type MinutesStatusValue = (typeof MINUTES_STATUSES)[number];

export const MINUTES_STATUS_LABELS: Record<MinutesStatusValue, string> = {
  draft: 'Draft',
  awaiting_attestation: 'Awaiting attestation',
  attested: 'Attested',
  published: 'Published',
  archived: 'Archived',
};

// Item-of-business form shape. The persisted shape (MinutesItemOfBusiness in
// schema/meeting-minutes.ts) carries `id` (uuid) and `order` (int); both are
// owned by the server — id stays stable across saves, order is reassigned by
// position.
export const minutesItemOfBusinessInputSchema = z.object({
  id: z.string().min(1).max(80),
  topic: z.string().min(1, 'Topic is required.').max(280),
  motionText: z.string().max(2000).nullable(),
  motionedByName: z.string().max(160).nullable(),
  motionedById: z.uuid().nullable(),
  secondedByName: z.string().max(160).nullable(),
  secondedById: z.uuid().nullable(),
  discussionSummary: z.string().max(4000),
  disposition: z.enum(MINUTES_DISPOSITIONS),
  voteSummary: z.string().max(280).nullable(),
});

export type MinutesItemOfBusinessInput = z.infer<typeof minutesItemOfBusinessInputSchema>;

export const updateMinutesSchema = z.object({
  minutesId: z.uuid(),
  coverHeader: z.string().max(2000),
  attendeesText: z.string().max(8000),
  itemsOfBusiness: z.array(minutesItemOfBusinessInputSchema).max(60),
  adjournmentSummary: z.string().max(2000),
});

export type UpdateMinutesInput = z.infer<typeof updateMinutesSchema>;

export const markMinutesReadyForAttestationSchema = z.object({
  minutesId: z.uuid(),
});

export type MarkMinutesReadyForAttestationInput = z.infer<
  typeof markMinutesReadyForAttestationSchema
>;

export const attestMinutesSchema = z.object({
  minutesId: z.uuid(),
});

export type AttestMinutesInput = z.infer<typeof attestMinutesSchema>;

export const publishMinutesSchema = z.object({
  minutesId: z.uuid(),
});

export type PublishMinutesInput = z.infer<typeof publishMinutesSchema>;

export const unpublishMinutesSchema = z.object({
  minutesId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type UnpublishMinutesInput = z.infer<typeof unpublishMinutesSchema>;

export const archiveMinutesSchema = z.object({
  minutesId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type ArchiveMinutesInput = z.infer<typeof archiveMinutesSchema>;
