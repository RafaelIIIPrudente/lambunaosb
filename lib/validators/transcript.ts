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

export const startTranscriptionSchema = z.object({
  meetingId: z.uuid(),
});

export type StartTranscriptionInput = z.infer<typeof startTranscriptionSchema>;

// Bulk speaker assignment for selected segments. Speaker is one of:
//   - { speakerId: <member uuid>, speakerLabel: null } — specific SB member
//   - { speakerId: null, speakerLabel: 'Unknown' | 'Multiple' | string } — unresolved
export const batchAssignSpeakerSchema = z
  .object({
    transcriptId: z.uuid(),
    segmentIds: z.array(z.uuid()).min(1).max(500),
    speakerId: z.uuid().nullable().optional(),
    speakerLabel: z.string().min(1).max(120).nullable().optional(),
  })
  .refine(
    (v) => v.speakerId != null || (v.speakerLabel && v.speakerLabel.length > 0),
    'Either speakerId or speakerLabel must be set.',
  );

export type BatchAssignSpeakerInput = z.infer<typeof batchAssignSpeakerSchema>;

export const unapproveTranscriptSchema = z.object({
  transcriptId: z.uuid(),
});

export type UnapproveTranscriptInput = z.infer<typeof unapproveTranscriptSchema>;

export const generateMinutesSchema = z.object({
  meetingId: z.uuid(),
});

export type GenerateMinutesInput = z.infer<typeof generateMinutesSchema>;

export const publishMinutesSchema = z.object({
  meetingId: z.uuid(),
  minutesNewsPostId: z.uuid(),
});

export type PublishMinutesInput = z.infer<typeof publishMinutesSchema>;
