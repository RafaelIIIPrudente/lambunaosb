import { z } from 'zod';

export const MEMBER_POSITIONS = [
  'mayor',
  'vice_mayor',
  'sb_member',
  'sk_chairperson',
  'liga_president',
  'ipmr',
] as const;

export const MEMBER_POSITION_LABELS: Record<(typeof MEMBER_POSITIONS)[number], string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

export const COMMITTEE_ROLES = ['chair', 'vice_chair', 'member'] as const;

const optionalEmail = z
  .string()
  .max(240)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.email('Invalid email.').optional());

export const memberSchema = z.object({
  fullName: z.string().min(2).max(180),
  honorific: z.string().min(1).max(20).default('Hon.'),
  position: z.enum(MEMBER_POSITIONS),
  termStartYear: z.coerce.number().int().min(2000).max(2100),
  termEndYear: z.coerce.number().int().min(2000).max(2100),
  seniority: z.string().max(60).optional(),
  contactEmail: optionalEmail,
  contactPhone: z.string().max(60).optional(),
  bioMd: z.string().max(8000).optional(),
  photoStoragePath: z.string().optional(),
  showOnPublic: z.boolean().default(true),
  committeeAssignments: z
    .array(
      z.object({
        committeeId: z.uuid(),
        role: z.enum(COMMITTEE_ROLES),
      }),
    )
    .max(20)
    .default([]),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const updateMemberSchema = memberSchema.extend({
  memberId: z.uuid(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
