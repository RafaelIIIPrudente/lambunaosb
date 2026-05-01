import { z } from 'zod';

export const MEETING_TYPES = [
  'regular',
  'special',
  'committee_of_whole',
  'committee',
  'public_hearing',
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number];

export const MEETING_LOCALES = ['en', 'tl', 'hil'] as const;

export const MEETING_TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  regular: 'Regular',
  special: 'Special',
  committee_of_whole: 'Committee of the Whole',
  committee: 'Committee',
  public_hearing: 'Public hearing',
};

export const MEETING_STATUSES = [
  'scheduled',
  'in_progress',
  'awaiting_transcript',
  'transcript_in_review',
  'transcript_approved',
  'minutes_published',
  'cancelled',
] as const;

export type MeetingStatusValue = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatusValue, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  awaiting_transcript: 'Awaiting transcript',
  transcript_in_review: 'Transcript in review',
  transcript_approved: 'Transcript approved',
  minutes_published: 'Minutes published',
  cancelled: 'Cancelled',
};

export const createMeetingSchema = z.object({
  title: z.string().min(3, 'Title is too short.').max(280),
  type: z.enum(MEETING_TYPES),
  sequenceNumber: z.number().int().min(1).max(9999),
  // Split for date/time picker UX; combined to a single timestamp at the
  // action boundary.
  scheduledDate: z.string().min(1, 'Pick a date.'),
  scheduledTime: z.string().min(1, 'Pick a time.'),
  presiderId: z.uuid().nullable().optional(),
  primaryLocale: z.enum(MEETING_LOCALES),
  location: z.string().min(2).max(280),
  expectedDurationMinutes: z.number().int().min(15).max(480).nullable().optional(),
  // Whether to run the Hiligaynon cleanup pass after Whisper. Default OFF.
  cleanupEnabled: z.boolean(),
  // One agenda item per line. Parsed into AgendaItem[] at the action layer.
  agendaText: z.string().max(4000),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = createMeetingSchema.extend({
  meetingId: z.uuid(),
});

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export const cancelMeetingSchema = z.object({
  meetingId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type CancelMeetingInput = z.infer<typeof cancelMeetingSchema>;

export const deleteMeetingSchema = z.object({
  meetingId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type DeleteMeetingInput = z.infer<typeof deleteMeetingSchema>;

// Per-chunk metadata recorded after the client uploads the blob to Supabase
// Storage directly. The action does NOT transfer the file — it just records
// the row. clientChunkId is generated client-side as a UUID for idempotent
// retry across network failures.
export const uploadAudioChunkSchema = z.object({
  meetingId: z.uuid(),
  clientChunkId: z.uuid(),
  sequenceIndex: z.number().int().min(0).max(9999),
  durationMs: z.number().int().min(0).max(7_200_000), // up to 2hr per chunk
  byteSize: z.number().int().min(1).max(209_715_200), // up to 200 MB per chunk
  mimeType: z.string().min(3).max(80),
  storagePath: z.string().min(1).max(500),
});

export type UploadAudioChunkInput = z.infer<typeof uploadAudioChunkSchema>;

export const finalizeRecordingSchema = z.object({
  meetingId: z.uuid(),
});

export type FinalizeRecordingInput = z.infer<typeof finalizeRecordingSchema>;
