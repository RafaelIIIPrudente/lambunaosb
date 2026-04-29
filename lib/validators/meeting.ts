import { z } from 'zod';

export const MEETING_TYPES = [
  'regular',
  'special',
  'committee_of_whole',
  'committee',
  'public_hearing',
] as const;

export const MEETING_LOCALES = ['en', 'tl', 'hil'] as const;

export const MEETING_TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  regular: 'Regular',
  special: 'Special',
  committee_of_whole: 'Committee of the Whole',
  committee: 'Committee',
  public_hearing: 'Public hearing',
};

export const createMeetingSchema = z.object({
  title: z.string().min(3, 'Title is too short.').max(280),
  type: z.enum(MEETING_TYPES),
  sequenceNumber: z.coerce.number().int().min(1).max(9999),
  scheduledDate: z.string().min(1, 'Pick a date.'),
  scheduledTime: z.string().min(1, 'Pick a time.'),
  presiderId: z.uuid().nullable().optional(),
  primaryLocale: z.enum(MEETING_LOCALES).default('hil'),
  location: z.string().min(2).max(280).default('Session Hall, 2/F Municipal Hall'),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = createMeetingSchema.extend({
  meetingId: z.uuid(),
});

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
