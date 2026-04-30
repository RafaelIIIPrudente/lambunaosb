import { z } from 'zod';

export const CITIZEN_QUERY_STATUSES = [
  'new',
  'in_progress',
  'awaiting_citizen',
  'answered',
  'closed',
  'spam',
] as const;

export const CITIZEN_QUERY_STATUS_LABELS: Record<(typeof CITIZEN_QUERY_STATUSES)[number], string> =
  {
    new: 'New',
    in_progress: 'In progress',
    awaiting_citizen: 'Awaiting citizen',
    answered: 'Answered',
    closed: 'Closed',
    spam: 'Spam',
  };

export const replyToCitizenQuerySchema = z.object({
  queryId: z.uuid(),
  bodyMd: z
    .string()
    .min(10, 'Reply must be at least 10 characters.')
    .max(8000, 'Reply must be at most 8000 characters.'),
});

export type ReplyToCitizenQueryInput = z.infer<typeof replyToCitizenQuerySchema>;

export const markCitizenQueryViewedSchema = z.object({
  queryId: z.uuid(),
});

export type MarkCitizenQueryViewedInput = z.infer<typeof markCitizenQueryViewedSchema>;

export const updateCitizenQueryStatusSchema = z.object({
  queryId: z.uuid(),
  status: z.enum(CITIZEN_QUERY_STATUSES),
});

export type UpdateCitizenQueryStatusInput = z.infer<typeof updateCitizenQueryStatusSchema>;

export const assignCitizenQuerySchema = z.object({
  queryId: z.uuid(),
  assigneeId: z.uuid().nullable(),
});

export type AssignCitizenQueryInput = z.infer<typeof assignCitizenQuerySchema>;

export const updateCitizenQueryTagsSchema = z.object({
  queryId: z.uuid(),
  tags: z.array(z.string().min(1).max(60)).max(20),
});

export type UpdateCitizenQueryTagsInput = z.infer<typeof updateCitizenQueryTagsSchema>;
