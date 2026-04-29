import { z } from 'zod';

export const TRANSCRIPT_SEGMENT_FLAGS = [
  'motion',
  'vote',
  'decision',
  'question',
  'quote',
  'off_record',
] as const;

export const updateTranscriptSegmentSchema = z.object({
  segmentId: z.uuid(),
  text: z.string().min(1).max(8000),
  speakerId: z.uuid().nullable().optional(),
  speakerLabel: z.string().max(120).optional(),
  locale: z.enum(['en', 'tl', 'hil']),
  flag: z.enum(TRANSCRIPT_SEGMENT_FLAGS).nullable().optional(),
});

export type UpdateTranscriptSegmentInput = z.infer<typeof updateTranscriptSegmentSchema>;

export const approveTranscriptSchema = z.object({
  transcriptId: z.uuid(),
});

export type ApproveTranscriptInput = z.infer<typeof approveTranscriptSchema>;

export const startMeetingSchema = z.object({
  meetingId: z.uuid(),
  primaryLocale: z.enum(['en', 'tl', 'hil']),
});

export type StartMeetingInput = z.infer<typeof startMeetingSchema>;

export const stopMeetingSchema = z.object({
  meetingId: z.uuid(),
});

export type StopMeetingInput = z.infer<typeof stopMeetingSchema>;

export const publishMinutesSchema = z.object({
  meetingId: z.uuid(),
  minutesNewsPostId: z.uuid(),
});

export type PublishMinutesInput = z.infer<typeof publishMinutesSchema>;
