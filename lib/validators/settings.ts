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
