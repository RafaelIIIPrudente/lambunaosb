import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean().optional(),
  redirectTo: z
    .string()
    .regex(/^\/[A-Za-z0-9/_-]*$/, 'Invalid redirect path.')
    .optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const resetPasswordRequestSchema = z.object({
  email: z.email('Please enter a valid email address.'),
});

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

export const setNewPasswordSchema = z
  .object({
    code: z.string().min(1, 'Reset code is required.'),
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

export type SetNewPasswordInput = z.infer<typeof setNewPasswordSchema>;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters.')
      .max(180, 'Full name must be at most 180 characters.'),
    email: z.email('Please enter a valid email address.'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters.')
      .regex(/[0-9]/, 'Password must contain at least one number.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      message: 'You must agree to the data privacy notice (RA 10173) before signing up.',
    }),
    turnstileToken: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
