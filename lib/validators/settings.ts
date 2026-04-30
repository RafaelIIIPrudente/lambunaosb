import { z } from 'zod';

export const UI_LOCALES = ['en', 'tl', 'hil'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  tl: 'Tagalog',
  hil: 'Hiligaynon',
};

export const UI_LOCALE_SAMPLES: Record<UiLocale, string> = {
  en: 'Welcome to the Sangguniang Bayan ng Lambunao admin console.',
  tl: 'Maligayang pagdating sa Sangguniang Bayan ng Lambunao admin console.',
  hil: 'Mayad-ayad nga pag-abot sa Sangguniang Bayan sang Lambunao admin console.',
};

export const TIMEZONE_OPTIONS = [{ value: 'Asia/Manila', label: 'UTC+08 (Manila)' }] as const;

export const NOTIFICATION_EVENT_KEYS = [
  'newCitizenQuery',
  'transcriptReadyForApproval',
  'resolutionRequiresSignature',
] as const;
export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventKey, string> = {
  newCitizenQuery: 'A new citizen query is received',
  transcriptReadyForApproval: 'A meeting transcript is ready for approval',
  resolutionRequiresSignature: 'A resolution requires my signature',
};

// .default() removed — defaults are applied via the form's defaultValues to
// avoid the RHF input/output type drift bug seen on prior surfaces.
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters.')
    .max(180, 'Full name must be at most 180 characters.'),
  title: z.string().max(180).optional(),
  email: z.email('Please enter a valid email address.'),
  phone: z.string().max(60).optional(),
  uiLocale: z.enum(UI_LOCALES),
  timeZone: z.string().min(1).max(64),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const PASSWORD_MIN_LENGTH = 12;

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      .regex(/[0-9]/, 'Password must contain at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// Score 0–4. Server doesn't enforce; only the regex/length rules above are
// authoritative. The score drives a UI strength meter for user education.
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'OK' | 'Strong' | 'Excellent';
};

export function scorePassword(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels: PasswordStrength['label'][] = ['Too weak', 'Weak', 'OK', 'Strong', 'Excellent'];
  const clamped = Math.min(4, score) as PasswordStrength['score'];
  const label = labels[clamped] ?? 'Too weak';
  return { score: clamped, label };
}

export const updateNotificationPreferencesSchema = z.object({
  newCitizenQuery: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
  transcriptReadyForApproval: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
  resolutionRequiresSignature: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

export const updateTenantSettingsSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters.')
    .max(180, 'Display name must be at most 180 characters.'),
  contactEmail: z.email('Please enter a valid contact email.'),
  dpoEmail: z.email('Please enter a valid Data Protection Officer email.'),
  contactPhone: z.string().max(60).optional(),
  officeAddress: z.string().max(500).optional(),
  officeHoursMd: z.string().max(2000).optional(),
});

export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
