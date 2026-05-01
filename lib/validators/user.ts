import { z } from 'zod';

export const USER_ROLES = [
  'secretary',
  'mayor',
  'vice_mayor',
  'sb_member',
  'skmf_president',
  'liga_president',
  'other_lgu',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// Roles that share the `sb_member` permission tier — elected SB members and
// the two ex-officio presidents (SKMF, Liga). Use this when broadening a
// comparison that previously read `role === 'sb_member'`.
export const SB_MEMBER_TIER_ROLES = ['sb_member', 'skmf_president', 'liga_president'] as const;
export type SbMemberTierRole = (typeof SB_MEMBER_TIER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  secretary: 'Secretary',
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  skmf_president: 'SKMF President',
  liga_president: 'Liga President',
  other_lgu: 'Other LGU',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  secretary: 'Full access · invite users · manage all entities.',
  mayor: 'Sign resolutions · final publish.',
  vice_mayor: 'Approve transcripts · publish minutes.',
  sb_member: 'Read everything · edit own profile · co-sponsor.',
  skmf_president:
    'Read everything · edit own profile · co-sponsor as ex-officio youth representative.',
  liga_president:
    'Read everything · edit own profile · co-sponsor as ex-officio barangay representative.',
  other_lgu: 'Read-only access for inter-office coordination.',
};

export const inviteUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters.')
    .max(180, 'Full name must be at most 180 characters.'),
  email: z.email('Please enter a valid email address.'),
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

export const reactivateUserSchema = z.object({
  userId: z.uuid(),
});

export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;

export const resendInviteSchema = z.object({
  userId: z.uuid(),
});

export type ResendInviteInput = z.infer<typeof resendInviteSchema>;

export const USER_ACTIVITY_FILTERS = ['all', 'active', 'inactive'] as const;
export type UserActivityFilter = (typeof USER_ACTIVITY_FILTERS)[number];

export const USER_ACTIVITY_LABELS: Record<UserActivityFilter, string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
};

export const USER_INVITATION_FILTERS = ['all', 'accepted', 'pending'] as const;
export type UserInvitationFilter = (typeof USER_INVITATION_FILTERS)[number];

export const USER_INVITATION_LABELS: Record<UserInvitationFilter, string> = {
  all: 'Any invitation status',
  accepted: 'Accepted (signed in)',
  pending: 'Pending (never signed in)',
};

export type UserFilterInput = {
  role: UserRole | null;
  activity: UserActivityFilter;
  invitation: UserInvitationFilter;
  q: string | null;
  cursor: string | null;
};

export function parseCursor(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseUserSearchParams(params: {
  role?: string;
  activity?: string;
  invitation?: string;
  q?: string;
  cursor?: string;
}): UserFilterInput {
  const role =
    params.role && (USER_ROLES as readonly string[]).includes(params.role)
      ? (params.role as UserRole)
      : null;

  const activity =
    params.activity && (USER_ACTIVITY_FILTERS as readonly string[]).includes(params.activity)
      ? (params.activity as UserActivityFilter)
      : 'all';

  const invitation =
    params.invitation && (USER_INVITATION_FILTERS as readonly string[]).includes(params.invitation)
      ? (params.invitation as UserInvitationFilter)
      : 'all';

  const q = params.q && params.q.trim().length > 0 ? params.q.trim().slice(0, 120) : null;

  const cursor = params.cursor && parseCursor(params.cursor) !== null ? params.cursor : null;

  return { role, activity, invitation, q, cursor };
}
