/**
 * Mock data for Phase 2 reference screens. Phase 3 replaces with real Drizzle reads.
 * Shape mirrors the entities in PROJECT.md §5.6, §5.10, §5.11, §5.3.
 */

export type MeetingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_transcript'
  | 'transcript_in_review'
  | 'transcript_approved'
  | 'minutes_published'
  | 'cancelled';

export type MeetingType =
  | 'regular'
  | 'special'
  | 'committee_of_whole'
  | 'committee'
  | 'public_hearing';

export type MockMeeting = {
  id: string;
  type: MeetingType;
  sequenceNumber: number;
  title: string;
  scheduledAt: string; // ISO
  presider: string;
  location: string;
  status: MeetingStatus;
  primaryLocale: 'en' | 'tl' | 'hil';
};

export const mockMeetings: MockMeeting[] = [
  {
    id: 'mtg-014',
    type: 'regular',
    sequenceNumber: 14,
    title: 'Regular Session #14 — FY 2026 Q2',
    scheduledAt: '2026-04-29T09:00:00+08:00',
    presider: 'Hon. Rosario Tabuga',
    location: 'Session Hall, 2/F Municipal Hall',
    status: 'scheduled',
    primaryLocale: 'hil',
  },
  {
    id: 'mtg-013',
    type: 'regular',
    sequenceNumber: 13,
    title: 'Regular Session #13 — Health & Sanitation',
    scheduledAt: '2026-04-22T09:00:00+08:00',
    presider: 'Hon. Rosario Tabuga',
    location: 'Session Hall, 2/F Municipal Hall',
    status: 'minutes_published',
    primaryLocale: 'hil',
  },
  {
    id: 'mtg-special-04',
    type: 'special',
    sequenceNumber: 4,
    title: 'Special Session #4 — Typhoon Aghon Response',
    scheduledAt: '2026-04-19T13:30:00+08:00',
    presider: 'Hon. Rosario Tabuga',
    location: 'Session Hall, 2/F Municipal Hall',
    status: 'transcript_approved',
    primaryLocale: 'hil',
  },
  {
    id: 'mtg-committee-022',
    type: 'committee',
    sequenceNumber: 22,
    title: 'Education Committee — School-Calendar Resolution Drafting',
    scheduledAt: '2026-04-17T14:00:00+08:00',
    presider: 'Hon. Maria dela Cruz',
    location: 'Conference Room A, 2/F Municipal Hall',
    status: 'transcript_in_review',
    primaryLocale: 'hil',
  },
  {
    id: 'mtg-012',
    type: 'regular',
    sequenceNumber: 12,
    title: 'Regular Session #12 — Appropriations & Budget',
    scheduledAt: '2026-04-15T09:00:00+08:00',
    presider: 'Hon. Rosario Tabuga',
    location: 'Session Hall, 2/F Municipal Hall',
    status: 'awaiting_transcript',
    primaryLocale: 'hil',
  },
  {
    id: 'mtg-public-hearing-02',
    type: 'public_hearing',
    sequenceNumber: 2,
    title: 'Public Hearing — Proposed Plaza Rizal Restoration',
    scheduledAt: '2026-04-10T13:00:00+08:00',
    presider: 'Hon. Maria dela Cruz',
    location: 'Plaza Rizal Pavilion',
    status: 'minutes_published',
    primaryLocale: 'hil',
  },
];

export type MockNewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'health' | 'notice' | 'hearing' | 'event' | 'announcement' | 'press_release';
  publishedAt: string;
  author: string;
};

export const mockNews: MockNewsPost[] = [
  {
    id: 'news-001',
    slug: 'plaza-rizal-restoration-public-hearing',
    title: 'Public hearing scheduled for Plaza Rizal restoration project',
    excerpt:
      'The Sangguniang Bayan invites all residents to a public hearing on 10 April 2026 regarding the proposed restoration of Plaza Rizal. Participation is open and consultative.',
    category: 'hearing',
    publishedAt: '2026-04-25T08:00:00+08:00',
    author: 'Office of the Secretary',
  },
  {
    id: 'news-002',
    slug: 'health-advisory-dengue-prevention',
    title: 'Health advisory: dengue prevention and barangay clean-up drive',
    excerpt:
      'Following the rise in dengue cases across nearby municipalities, the Health & Sanitation Committee has adopted Resolution RES-2026-014 mandating weekly clean-up drives in every barangay.',
    category: 'health',
    publishedAt: '2026-04-23T08:00:00+08:00',
    author: 'Hon. Maria dela Cruz',
  },
  {
    id: 'news-003',
    slug: 'typhoon-aghon-response-update',
    title: 'Typhoon Aghon response: status update from the Mayor and SB',
    excerpt:
      'A coordinated response is underway across Lambunao. The SB convened a Special Session on 19 April to allocate emergency funds and coordinate with the Provincial Government.',
    category: 'announcement',
    publishedAt: '2026-04-20T08:00:00+08:00',
    author: 'Office of the Mayor',
  },
  {
    id: 'news-004',
    slug: 'school-calendar-resolution-draft',
    title: 'Education Committee opens consultation on school-calendar resolution',
    excerpt:
      'The Education Committee invites educators, parents, and student leaders to review the draft school-calendar resolution before it advances to the next regular session.',
    category: 'notice',
    publishedAt: '2026-04-17T08:00:00+08:00',
    author: 'Hon. Maria dela Cruz',
  },
];

export type MockMember = {
  id: string;
  fullName: string;
  honorific: 'Hon.';
  position: 'mayor' | 'vice_mayor' | 'sb_member' | 'sk_chairperson' | 'liga_president' | 'ipmr';
  termStartYear: number;
  termEndYear: number;
  committees: string[];
  initials: string;
};

export const mockMembers: MockMember[] = [
  {
    id: 'mem-001',
    fullName: 'Carlos Villaruel',
    honorific: 'Hon.',
    position: 'mayor',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: [],
    initials: 'CV',
  },
  {
    id: 'mem-002',
    fullName: 'Rosario Tabuga',
    honorific: 'Hon.',
    position: 'vice_mayor',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Rules', 'Appropriations'],
    initials: 'RT',
  },
  {
    id: 'mem-003',
    fullName: 'Maria dela Cruz',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Education', 'Health & Sanitation'],
    initials: 'MD',
  },
  {
    id: 'mem-004',
    fullName: 'Jose Bonifacio',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Public Safety', 'Roads & Infrastructure'],
    initials: 'JB',
  },
  {
    id: 'mem-005',
    fullName: 'Ana Salonga',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Women & Family', 'Social Services'],
    initials: 'AS',
  },
  {
    id: 'mem-006',
    fullName: 'Renato Gallardo',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Environment', 'Agriculture'],
    initials: 'RG',
  },
  {
    id: 'mem-007',
    fullName: 'Linda Tagubuan',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Appropriations', 'Public Works'],
    initials: 'LT',
  },
  {
    id: 'mem-008',
    fullName: 'Pedro Mananquil',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    committees: ['Tourism', 'Trade'],
    initials: 'PM',
  },
];
