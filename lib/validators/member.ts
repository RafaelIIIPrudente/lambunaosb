import { z } from 'zod';

export const MEMBER_POSITIONS = [
  'mayor',
  'vice_mayor',
  'sb_member',
  'sk_chairperson',
  'liga_president',
  'ipmr',
] as const;

export type MemberPositionValue = (typeof MEMBER_POSITIONS)[number];

export const MEMBER_POSITION_LABELS: Record<MemberPositionValue, string> = {
  mayor: 'Mayor',
  vice_mayor: 'Vice Mayor',
  sb_member: 'SB Member',
  sk_chairperson: 'SK Chairperson',
  liga_president: 'Liga President',
  ipmr: 'IPMR',
};

export const COMMITTEE_ROLES = ['chair', 'vice_chair', 'member'] as const;

export type CommitteeRoleValue = (typeof COMMITTEE_ROLES)[number];

export const COMMITTEE_ROLE_LABELS: Record<CommitteeRoleValue, string> = {
  chair: 'Chair',
  vice_chair: 'Vice Chair',
  member: 'Member',
};

const optionalEmail = z
  .string()
  .max(240)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.email('Invalid email.').optional());

const committeeAssignmentInput = z.object({
  committeeId: z.uuid(),
  role: z.enum(COMMITTEE_ROLES),
});

export const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.').max(180),
  honorific: z.string().min(1).max(20),
  position: z.enum(MEMBER_POSITIONS),
  termStartYear: z.number().int().min(2000).max(2100),
  termEndYear: z.number().int().min(2000).max(2100),
  seniority: z.string().max(60).optional(),
  contactEmail: optionalEmail,
  contactPhone: z.string().max(60).optional(),
  bioMd: z.string().max(8000).optional(),
  photoStoragePath: z.string().nullable().optional(),
  showOnPublic: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  committeeAssignments: z.array(committeeAssignmentInput).max(20),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const updateMemberSchema = memberSchema.extend({
  memberId: z.uuid(),
  active: z.boolean(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const changeMemberPositionSchema = z.object({
  memberId: z.uuid(),
  newPosition: z.enum(MEMBER_POSITIONS),
});

export type ChangeMemberPositionInput = z.infer<typeof changeMemberPositionSchema>;

export const updateMemberPhotoSchema = z.object({
  memberId: z.uuid(),
  storagePath: z.string().min(1),
  byteSize: z.number().int().min(0).optional(),
});

export type UpdateMemberPhotoInput = z.infer<typeof updateMemberPhotoSchema>;

export const deactivateMemberSchema = z.object({
  memberId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type DeactivateMemberInput = z.infer<typeof deactivateMemberSchema>;

export const reactivateMemberSchema = z.object({
  memberId: z.uuid(),
});

export type ReactivateMemberInput = z.infer<typeof reactivateMemberSchema>;

export const archiveMemberSchema = z.object({
  memberId: z.uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(500),
});

export type ArchiveMemberInput = z.infer<typeof archiveMemberSchema>;

export const replaceCommitteeAssignmentsSchema = z.object({
  memberId: z.uuid(),
  assignments: z.array(committeeAssignmentInput).max(20),
});

export type ReplaceCommitteeAssignmentsInput = z.infer<typeof replaceCommitteeAssignmentsSchema>;
