import { z } from 'zod';

export const USER_ROLES = ['secretary', 'mayor', 'vice_mayor', 'sb_member', 'other_lgu'] as const;

export const USER_ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  secretary: 'Secretary',
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  other_lgu: 'Other LGU',
};

export const USER_ROLE_DESCRIPTIONS: Record<(typeof USER_ROLES)[number], string> = {
  secretary: 'Full access · invite users · manage all entities.',
  mayor: 'Sign resolutions · final publish.',
  vice_mayor: 'Approve transcripts · publish minutes.',
  sb_member: 'Read everything · edit own profile · co-sponsor.',
  other_lgu: 'Read-only access for inter-office coordination.',
};

export const inviteUserSchema = z.object({
  fullName: z.string().min(2).max(180),
  email: z.email(),
  role: z.enum(USER_ROLES),
  memberId: z.uuid().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(USER_ROLES),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const deactivateUserSchema = z.object({
  userId: z.uuid(),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
