import { z } from 'zod';

export const UI_LOCALES = ['en', 'tl', 'hil'] as const;

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(180),
  title: z.string().max(180).optional(),
  email: z.email(),
  phone: z.string().max(60).optional(),
  uiLocale: z.enum(UI_LOCALES).default('en'),
  timeZone: z.string().min(1).default('Asia/Manila'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters.')
      .regex(/[0-9]/, 'Password must contain at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const updateNotificationPreferencesSchema = z.object({
  newCitizenQuery: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
  transcriptReadyForApproval: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
  resolutionRequiresSignature: z.object({ email: z.boolean(), push: z.boolean() }).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

export const updateTenantSettingsSchema = z.object({
  displayName: z.string().min(2).max(180),
  contactEmail: z.email(),
  dpoEmail: z.email(),
  contactPhone: z.string().max(60).optional(),
  officeAddress: z.string().max(500).optional(),
  officeHoursMd: z.string().max(2000).optional(),
});

export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
