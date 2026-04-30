import { z } from 'zod';

export const CITIZEN_QUERY_CATEGORIES = [
  'general',
  'permits',
  'health',
  'roads_infrastructure',
  'public_safety',
  'environment',
  'social_services',
] as const;

export const CITIZEN_QUERY_CATEGORY_LABELS: Record<
  (typeof CITIZEN_QUERY_CATEGORIES)[number],
  string
> = {
  general: 'General inquiry',
  permits: 'Permits & licenses',
  health: 'Health & sanitation',
  roads_infrastructure: 'Roads & infrastructure',
  public_safety: 'Public safety',
  environment: 'Environment',
  social_services: 'Social services',
};

export const MESSAGE_MAX = 1500;

export const RETENTION_YEARS = 3;

export const citizenQuerySchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name.').max(120),
  email: z.email('Please enter a valid email address.'),
  category: z.enum(CITIZEN_QUERY_CATEGORIES),
  subject: z.string().min(4, 'Subject is too short.').max(160, 'Subject is too long.'),
  message: z
    .string()
    .min(20, 'Please share at least a few sentences so we can help.')
    .max(MESSAGE_MAX, `Maximum ${MESSAGE_MAX} characters.`),
  consent: z.literal(true, {
    error: 'You must accept the data privacy notice to submit this query.',
  }),
  // Honeypot — should always be empty. Bots fill it.
  website: z.string().max(0).optional(),
  // Cloudflare Turnstile token. Verified server-side; optional in dev.
  turnstileToken: z.string().optional(),
});

export type CitizenQueryInput = z.infer<typeof citizenQuerySchema>;
