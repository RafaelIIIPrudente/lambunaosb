import 'server-only';

import type { AuditCategory, Committee, Tenant } from '@/lib/db/schema';

import type { AuditLogRowData, GetAuditLogOptions } from './audit';
import type {
  CitizenQueryDetail,
  CitizenQueryRowData,
  GetCitizenQueriesOptions,
  StatusCounts,
} from './citizen-queries';
import type { DashboardData } from './dashboard';
import type {
  GetActiveMembersOptions,
  MemberCardData,
  MemberDetail,
  MemberPosition,
} from './members';
import type {
  AdminNewsRowData,
  GetPublishedNewsOptions,
  NewsCardData,
  NewsCategory,
  NewsPostDetail,
} from './news';
import type { MeetingDisplayStatus, MeetingDetail, MeetingRowData, MeetingType } from './meetings';
import type {
  GetResolutionsListOptions,
  ResolutionDetail,
  ResolutionRowData,
  ResolutionType,
  ResolutionStatus,
} from './resolutions';
import type { UserRowData } from './users';

const NOW = new Date('2026-04-29T08:30:00+08:00');

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function hoursAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 60 * 60 * 1000);
}

function computeInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Tenant ─────────────────────────────────────────────────────

export const MOCK_TENANT: Tenant = {
  id: 'mock-tenant-lambunao',
  slug: 'lambunao',
  displayName: 'Sangguniang Bayan ng Lambunao',
  province: 'Iloilo',
  establishedYear: 1948,
  contactEmail: 'sb@lambunao.gov.ph',
  contactPhone: '(033) 333-1234',
  dpoEmail: 'dpo@lambunao.gov.ph',
  officeAddress:
    'SB Office, 2/F Municipal Hall, Plaza Rizal, Brgy. Poblacion, Lambunao, Iloilo 5018',
  officeHoursMd: 'Mon–Fri · 8:00 AM – 5:00 PM\nClosed weekends & PH holidays',
  sealStoragePath: 'public/seal/lambunao-seal.png',
  createdAt: daysAgo(365),
  updatedAt: daysAgo(30),
};

// ─── Committees ─────────────────────────────────────────────────

export const MOCK_COMMITTEES: Committee[] = [
  ['rules', 'Rules', 10],
  ['appropriations', 'Appropriations', 20],
  ['health-sanitation', 'Health & Sanitation', 30],
  ['education', 'Education', 40],
  ['public-safety', 'Public Safety', 50],
  ['roads-infrastructure', 'Roads & Infrastructure', 60],
  ['women-family', 'Women & Family', 70],
  ['social-services', 'Social Services', 80],
  ['environment', 'Environment', 90],
  ['agriculture', 'Agriculture', 100],
  ['public-works', 'Public Works', 110],
  ['tourism', 'Tourism', 120],
  ['trade', 'Trade', 130],
].map(([slug, name, sortOrder]) => ({
  id: `mock-committee-${slug}`,
  tenantId: MOCK_TENANT.id,
  slug: slug as string,
  name: name as string,
  description: null,
  isStanding: true,
  sortOrder: sortOrder as number,
  createdAt: daysAgo(365),
  updatedAt: daysAgo(365),
}));

// ─── Members ────────────────────────────────────────────────────

type MemberSeed = {
  id: string;
  fullName: string;
  position: MemberPosition;
  sortOrder: number;
  showOnPublic: boolean;
  seniority: string | null;
  committees: string[]; // committee names (chair first)
};

const MEMBER_SEEDS: MemberSeed[] = [
  {
    id: 'mem-001',
    fullName: 'Carlos Villaruel',
    position: 'mayor',
    sortOrder: 0,
    showOnPublic: false,
    seniority: null,
    committees: [],
  },
  {
    id: 'mem-002',
    fullName: 'Rosario Tabuga',
    position: 'vice_mayor',
    sortOrder: 10,
    showOnPublic: true,
    seniority: 'Presiding Officer',
    committees: ['Rules', 'Appropriations'],
  },
  {
    id: 'mem-003',
    fullName: 'Maria dela Cruz',
    position: 'sb_member',
    sortOrder: 20,
    showOnPublic: true,
    seniority: 'Senior Member',
    committees: ['Health & Sanitation', 'Education'],
  },
  {
    id: 'mem-004',
    fullName: 'Jose Bonifacio',
    position: 'sb_member',
    sortOrder: 30,
    showOnPublic: true,
    seniority: null,
    committees: ['Public Safety', 'Roads & Infrastructure'],
  },
  {
    id: 'mem-005',
    fullName: 'Ana Salonga',
    position: 'sb_member',
    sortOrder: 40,
    showOnPublic: true,
    seniority: null,
    committees: ['Women & Family', 'Social Services'],
  },
  {
    id: 'mem-006',
    fullName: 'Renato Gallardo',
    position: 'sb_member',
    sortOrder: 50,
    showOnPublic: true,
    seniority: null,
    committees: ['Environment', 'Agriculture'],
  },
  {
    id: 'mem-007',
    fullName: 'Linda Tagubuan',
    position: 'sb_member',
    sortOrder: 60,
    showOnPublic: true,
    seniority: null,
    committees: ['Appropriations', 'Public Works'],
  },
  {
    id: 'mem-008',
    fullName: 'Pedro Mananquil',
    position: 'sb_member',
    sortOrder: 70,
    showOnPublic: true,
    seniority: null,
    committees: ['Tourism', 'Trade'],
  },
];

function memberToCard(m: MemberSeed): MemberCardData {
  return {
    id: m.id,
    fullName: m.fullName,
    honorific: 'Hon.',
    position: m.position,
    termStartYear: 2025,
    termEndYear: 2028,
    initials: computeInitials(m.fullName),
    photoStoragePath: null,
    committees: m.committees,
  };
}

export function mockGetActiveMembers(options: GetActiveMembersOptions = {}): MemberCardData[] {
  let list = MEMBER_SEEDS.slice();
  if (options.excludePositions && options.excludePositions.length > 0) {
    const excluded = new Set(options.excludePositions);
    list = list.filter((m) => !excluded.has(m.position));
  }
  if (options.showOnPublicOnly) {
    list = list.filter((m) => m.showOnPublic);
  }
  list.sort((a, b) => a.sortOrder - b.sortOrder || a.fullName.localeCompare(b.fullName));
  return list.map(memberToCard);
}

export function mockGetMemberById(id: string): MemberDetail | null {
  const seed = MEMBER_SEEDS.find((m) => m.id === id);
  if (!seed) return null;
  const card = memberToCard(seed);
  return {
    ...card,
    contactEmail: `${seed.fullName.split(' ').join('.').toLowerCase()}@lambunao.gov.ph`,
    contactPhone: '(033) 333-1234',
    bioMd:
      '[Short biography placeholder — 2 to 4 sentences. Background, areas of advocacy, prior public service.]',
    seniority: seed.seniority,
    showOnPublic: seed.showOnPublic,
    active: true,
    committeeAssignments: seed.committees.map((name, i) => ({
      committee: {
        id: `mock-committee-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      },
      role: i === 0 ? 'chair' : 'member',
    })),
  };
}

export function mockGetAllMemberIds(): { id: string }[] {
  return MEMBER_SEEDS.map((m) => ({ id: m.id }));
}

// ─── News ───────────────────────────────────────────────────────

type NewsSeed = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMdx: string;
  category: NewsCategory;
  publishedAt: Date;
  author: string;
};

const NEWS_SEEDS: NewsSeed[] = [
  {
    id: 'news-001',
    slug: 'plaza-rizal-restoration-public-hearing',
    title: 'Public hearing scheduled for Plaza Rizal restoration project',
    excerpt:
      'The Sangguniang Bayan invites all residents to a public hearing on 10 April 2026 regarding the proposed restoration of Plaza Rizal. Participation is open and consultative.',
    bodyMdx:
      'The Sangguniang Bayan invites all residents to a public hearing on **10 April 2026** regarding the proposed restoration of Plaza Rizal.\n\nThe consultation will cover scope, budget allocation, contractor selection process, and the heritage-preservation plan for the existing trees and historical markers.',
    category: 'hearing',
    publishedAt: daysAgo(4),
    author: 'Office of the Secretary',
  },
  {
    id: 'news-002',
    slug: 'health-advisory-dengue-prevention',
    title: 'Health advisory: dengue prevention and barangay clean-up drive',
    excerpt:
      'Following the rise in dengue cases across nearby municipalities, the Health & Sanitation Committee has adopted Resolution RES-2026-014 mandating weekly clean-up drives in every barangay.',
    bodyMdx:
      'Following the rise in dengue cases across nearby municipalities, the **Health & Sanitation Committee** has adopted **Resolution RES-2026-014** mandating weekly clean-up drives in every barangay.\n\nResidents are reminded of the 4S strategy: search and destroy, self-protection, seek early consultation, support fogging when needed.',
    category: 'health',
    publishedAt: daysAgo(6),
    author: 'Hon. Maria dela Cruz',
  },
  {
    id: 'news-003',
    slug: 'typhoon-aghon-response-update',
    title: 'Typhoon Aghon response: status update from the Mayor and SB',
    excerpt:
      'A coordinated response is underway across Lambunao. The SB convened a Special Session on 19 April to allocate emergency funds and coordinate with the Provincial Government.',
    bodyMdx:
      'A coordinated response is underway across Lambunao. The SB convened a **Special Session** on 19 April to allocate emergency funds and coordinate with the Provincial Government.\n\nEvacuation centers are open in 12 barangays. Relief goods are being distributed by the MDRRMO and the Office of the Mayor.',
    category: 'announcement',
    publishedAt: daysAgo(9),
    author: 'Office of the Mayor',
  },
  {
    id: 'news-004',
    slug: 'school-calendar-resolution-draft',
    title: 'Education Committee opens consultation on school-calendar resolution',
    excerpt:
      'The Education Committee invites educators, parents, and student leaders to review the draft school-calendar resolution before it advances to the next regular session.',
    bodyMdx:
      'The Education Committee invites educators, parents, and student leaders to review the draft school-calendar resolution before it advances to the next regular session.\n\nWritten comments may be submitted via the public submit-query form or in person at the SB Office.',
    category: 'notice',
    publishedAt: daysAgo(12),
    author: 'Hon. Maria dela Cruz',
  },
];

function newsToCard(n: NewsSeed): NewsCardData {
  return {
    id: n.id,
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    category: n.category,
    publishedAt: n.publishedAt,
    coverStoragePath: null,
    author: n.author,
  };
}

export function mockGetPublishedNews(options: GetPublishedNewsOptions = {}): NewsCardData[] {
  let list = NEWS_SEEDS.slice();
  if (options.category) list = list.filter((n) => n.category === options.category);
  list.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return options.limit ? list.slice(0, options.limit).map(newsToCard) : list.map(newsToCard);
}

export function mockGetNewsBySlug(slug: string): NewsPostDetail | null {
  const seed = NEWS_SEEDS.find((n) => n.slug === slug);
  if (!seed) return null;
  return {
    ...newsToCard(seed),
    bodyMdx: seed.bodyMdx,
    status: 'published',
    visibility: 'public',
  };
}

export function mockGetAllPublishedNewsSlugs(): { slug: string }[] {
  return NEWS_SEEDS.map((n) => ({ slug: n.slug }));
}

export function mockGetAdminNewsList(): AdminNewsRowData[] {
  return NEWS_SEEDS.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: n.excerpt,
    bodyMdx: n.bodyMdx,
    category: n.category,
    status: 'published',
    visibility: 'public',
    pinned: false,
    publishedAt: n.publishedAt,
    scheduledAt: null,
    coverStoragePath: null,
    authorName: n.author,
  }));
}

// ─── Meetings ───────────────────────────────────────────────────

type MeetingSeed = {
  id: string;
  title: string;
  type: MeetingType;
  date: Date;
  audioMs: number | null;
  transcript: string | null;
  status: MeetingDisplayStatus;
};

const MEETING_SEEDS: MeetingSeed[] = [
  {
    id: 'mtg-014',
    title: 'Regular Session #14',
    type: 'regular',
    date: daysAgo(-48),
    audioMs: null,
    transcript: null,
    status: 'scheduled',
  },
  {
    id: 'mtg-013',
    title: 'Regular Session #13',
    type: 'regular',
    date: daysAgo(-41),
    audioMs: 6138000,
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-spec',
    title: 'Special: Budget hearing',
    type: 'special',
    date: daysAgo(-34),
    audioMs: 3484000,
    transcript: 'In review',
    status: 'transcribed',
  },
  {
    id: 'mtg-012',
    title: 'Regular Session #12',
    type: 'regular',
    date: daysAgo(-27),
    audioMs: 5624000,
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-com-hs',
    title: 'Committee · Health & Sanitation',
    type: 'committee',
    date: daysAgo(-20),
    audioMs: 2469000,
    transcript: 'Draft',
    status: 'recorded',
  },
  {
    id: 'mtg-011',
    title: 'Regular Session #11',
    type: 'regular',
    date: daysAgo(-13),
    audioMs: 5335000,
    transcript: 'Approved',
    status: 'published',
  },
  {
    id: 'mtg-010',
    title: 'Regular Session #10',
    type: 'regular',
    date: daysAgo(-6),
    audioMs: 6662000,
    transcript: 'Approved',
    status: 'published',
  },
];

function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function mockGetMeetingsList(): MeetingRowData[] {
  return MEETING_SEEDS.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type,
    date: m.date,
    audioLength: formatDuration(m.audioMs),
    transcript: m.transcript,
    status: m.status,
  }));
}

export function mockGetMeetingById(id: string): MeetingDetail | null {
  const seed = MEETING_SEEDS.find((m) => m.id === id);
  if (!seed) return null;
  return {
    id: seed.id,
    title: seed.title,
    type: seed.type,
    sequenceNumber: 14,
    scheduledAt: seed.date,
    startedAt: null,
    endedAt: null,
    location: 'Session Hall, 2/F Municipal Hall',
    primaryLocale: 'hil',
    status: 'scheduled',
    agenda: [
      { id: 'a1', order: 1, title: 'Roll call' },
      { id: 'a2', order: 2, title: 'Reading & approval of last minutes' },
      { id: 'a3', order: 3, title: 'Tricycle franchising — 2nd reading' },
      { id: 'a4', order: 4, title: 'BHW honoraria adjustment' },
      { id: 'a5', order: 5, title: 'Other matters' },
    ],
    presider: { id: 'mem-002', fullName: 'Rosario Tabuga', honorific: 'Hon.' },
    hasTranscript: seed.transcript !== null,
    audioDurationMs: seed.audioMs,
  };
}

export function mockGetUpcomingMeetings(limit = 5): MeetingRowData[] {
  return mockGetMeetingsList()
    .filter((m) => m.status === 'scheduled' && m.date.getTime() >= NOW.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

// ─── Resolutions ────────────────────────────────────────────────

type ResolutionSeed = {
  id: string;
  number: string;
  title: string;
  type: ResolutionType;
  status: ResolutionStatus;
  primarySponsorName: string;
  coSponsorCount: number;
  dateFiled: string;
  publishedAt: Date | null;
};

const RESOLUTION_SEEDS: ResolutionSeed[] = [
  {
    id: 'res-014',
    number: 'RES-2026-014',
    title: 'Ordinance regulating tricycle franchising in poblacion areas',
    type: 'ordinance',
    status: 'approved',
    primarySponsorName: 'Hon. Maria dela Cruz',
    coSponsorCount: 1,
    dateFiled: '2026-04-12',
    publishedAt: daysAgo(2),
  },
  {
    id: 'res-013',
    number: 'RES-2026-013',
    title: 'Resolution endorsing barangay health worker honoraria adjustment',
    type: 'resolution',
    status: 'pending',
    primarySponsorName: 'Hon. Rosario Tabuga',
    coSponsorCount: 2,
    dateFiled: '2026-04-05',
    publishedAt: null,
  },
  {
    id: 'res-012',
    number: 'RES-2026-012',
    title: 'Approving annual budget supplement for road maintenance',
    type: 'resolution',
    status: 'approved',
    primarySponsorName: 'Hon. Linda Tagubuan',
    coSponsorCount: 0,
    dateFiled: '2026-03-28',
    publishedAt: daysAgo(15),
  },
  {
    id: 'res-011',
    number: 'RES-2026-011',
    title: 'Authorizing Mayor to enter into MOA with Department of Agriculture',
    type: 'resolution',
    status: 'withdrawn',
    primarySponsorName: 'Hon. Renato Gallardo',
    coSponsorCount: 0,
    dateFiled: '2026-03-21',
    publishedAt: null,
  },
  {
    id: 'res-010',
    number: 'RES-2026-010',
    title: 'Establishing the Lambunao Youth Council operating guidelines',
    type: 'ordinance',
    status: 'approved',
    primarySponsorName: 'Hon. Ana Salonga',
    coSponsorCount: 3,
    dateFiled: '2026-03-14',
    publishedAt: daysAgo(28),
  },
  {
    id: 'res-009',
    number: 'RES-2026-009',
    title: 'Resolution declaring fiesta week public holiday for LGU staff',
    type: 'resolution',
    status: 'approved',
    primarySponsorName: 'Hon. Rosario Tabuga',
    coSponsorCount: 0,
    dateFiled: '2026-02-28',
    publishedAt: daysAgo(42),
  },
  {
    id: 'res-008',
    number: 'RES-2026-008',
    title: 'Ordinance amending zoning for Brgy. Cabatangan commercial strip',
    type: 'ordinance',
    status: 'pending',
    primarySponsorName: 'Hon. Pedro Mananquil',
    coSponsorCount: 0,
    dateFiled: '2026-02-21',
    publishedAt: null,
  },
  {
    id: 'res-007',
    number: 'RES-2026-007',
    title: 'Resolution requesting DPWH to prioritize the Lambunao river bridge',
    type: 'resolution',
    status: 'approved',
    primarySponsorName: 'Hon. Jose Bonifacio',
    coSponsorCount: 1,
    dateFiled: '2026-02-14',
    publishedAt: daysAgo(56),
  },
  {
    id: 'res-006',
    number: 'RES-2026-006',
    title: 'Authorizing solid waste management contract renewal',
    type: 'resolution',
    status: 'approved',
    primarySponsorName: 'Hon. Pedro Mananquil',
    coSponsorCount: 0,
    dateFiled: '2026-02-07',
    publishedAt: daysAgo(63),
  },
];

export function mockGetResolutionsList(
  options: GetResolutionsListOptions = {},
): ResolutionRowData[] {
  let list = RESOLUTION_SEEDS.slice();
  if (options.status) list = list.filter((r) => r.status === options.status);
  if (options.publicOnly) list = list.filter((r) => r.status === 'published');
  return list.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    type: r.type,
    status: r.status,
    primarySponsorName: r.primarySponsorName,
    coSponsorCount: r.coSponsorCount,
    dateFiled: r.dateFiled,
    publishedAt: r.publishedAt,
  }));
}

export function mockGetResolutionById(id: string): ResolutionDetail | null {
  const seed = RESOLUTION_SEEDS.find((r) => r.id === id);
  if (!seed) return null;
  return {
    id: seed.id,
    number: seed.number,
    year: 2026,
    sequenceNumber: parseInt(seed.number.split('-')[2] ?? '0', 10),
    type: seed.type,
    title: seed.title,
    bodyMd:
      '[WHEREAS clauses and operative paragraphs would appear here. Full text loaded from body_md once a real PDF + MDX is wired.]',
    status: seed.status,
    tags: ['Public safety', 'Ordinance'],
    primarySponsor: { id: 'mem-003', fullName: 'Maria dela Cruz', honorific: 'Hon.' },
    coSponsorIds: [],
    meetingId: null,
    committeeId: null,
    dateFiled: seed.dateFiled,
    firstReadingAt: '2026-04-05',
    secondReadingAt: '2026-04-12',
    voteSummary: '12 – 1 – 1 (Yea–Nay–Abstain)',
    pdfStoragePath: null,
    pdfPageCount: 3,
    pdfByteSize: 1_200_000,
    publishedAt: seed.publishedAt,
    withdrawnAt: null,
  };
}

// ─── Citizen queries ────────────────────────────────────────────

type QuerySeed = {
  id: string;
  ref: string;
  citizen: string;
  email: string;
  subject: string;
  hoursAgo: number;
  status: 'new' | 'in_progress' | 'answered' | 'closed' | 'awaiting_citizen' | 'spam';
  category:
    | 'general'
    | 'permits'
    | 'health'
    | 'roads_infrastructure'
    | 'public_safety'
    | 'environment'
    | 'social_services';
  assignedToName: string | null;
};

const QUERY_SEEDS: QuerySeed[] = [
  {
    id: 'q-0142',
    ref: 'Q-2026-0142',
    citizen: 'Juan dela Cruz',
    email: 'juan@example.ph',
    subject: 'Permit office hours during fiesta week',
    hoursAgo: 2,
    status: 'new',
    category: 'permits',
    assignedToName: null,
  },
  {
    id: 'q-0141',
    ref: 'Q-2026-0141',
    citizen: 'Ana Reyes',
    email: 'ana@example.ph',
    subject: 'Request: copy of RES-2026-014',
    hoursAgo: 5,
    status: 'in_progress',
    category: 'general',
    assignedToName: 'Office of the Secretary',
  },
  {
    id: 'q-0140',
    ref: 'Q-2026-0140',
    citizen: 'R. Cruz',
    email: 'r.cruz@example.ph',
    subject: 'Tricycle franchise renewal — confused on rules',
    hoursAgo: 26,
    status: 'in_progress',
    category: 'permits',
    assignedToName: 'Office of the Secretary',
  },
  {
    id: 'q-0139',
    ref: 'Q-2026-0139',
    citizen: 'Liza Manalo',
    email: 'liza@example.ph',
    subject: 'Suggestion: extend library hours',
    hoursAgo: 50,
    status: 'answered',
    category: 'general',
    assignedToName: 'Office of the Secretary',
  },
  {
    id: 'q-0138',
    ref: 'Q-2026-0138',
    citizen: 'M. Bautista',
    email: 'm.bautista@example.ph',
    subject: 'Garbage collection schedule for our barangay',
    hoursAgo: 74,
    status: 'closed',
    category: 'environment',
    assignedToName: 'Office of the Secretary',
  },
  {
    id: 'q-0137',
    ref: 'Q-2026-0137',
    citizen: 'JP Santos',
    email: 'jp@example.ph',
    subject: 'Complaint: noise ordinance enforcement',
    hoursAgo: 98,
    status: 'in_progress',
    category: 'public_safety',
    assignedToName: 'Office of the Secretary',
  },
  {
    id: 'q-0136',
    ref: 'Q-2026-0136',
    citizen: 'Ben Aquino',
    email: 'ben@example.ph',
    subject: 'Senior citizen ID renewal procedure',
    hoursAgo: 146,
    status: 'answered',
    category: 'social_services',
    assignedToName: 'Office of the Secretary',
  },
];

export function mockGetCitizenQueries(
  options: GetCitizenQueriesOptions = {},
): CitizenQueryRowData[] {
  let list = QUERY_SEEDS.slice();
  if (options.status) list = list.filter((q) => q.status === options.status);
  list.sort((a, b) => a.hoursAgo - b.hoursAgo);
  const rows = list.map((q) => ({
    id: q.id,
    ref: q.ref,
    submitterName: q.citizen,
    submitterEmail: q.email,
    subject: q.subject,
    status: q.status,
    category: q.category,
    submittedAt: hoursAgo(q.hoursAgo),
    assignedToName: q.assignedToName,
  }));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

export function mockGetCitizenQueryById(id: string): CitizenQueryDetail | null {
  const seed = QUERY_SEEDS.find((q) => q.id === id);
  if (!seed) return null;
  return {
    id: seed.id,
    ref: seed.ref,
    submitterName: seed.citizen,
    submitterEmail: seed.email,
    subject: seed.subject,
    messageMd:
      'Good day. May I know if the permits office will follow regular hours during fiesta week (June 24–28)? I need to renew my business permit and I work outside the municipality.',
    status: seed.status,
    category: seed.category,
    submittedAt: hoursAgo(seed.hoursAgo),
    assignedToName: seed.assignedToName,
    ipInet: '122.55.0.1',
    userAgent: 'Mozilla/5.0',
    honeypotTripped: null,
    turnstileScore: '0.95',
    acknowledgedAt: hoursAgo(seed.hoursAgo - 1),
    answeredAt: seed.status === 'answered' ? hoursAgo(seed.hoursAgo - 6) : null,
    closedAt: seed.status === 'closed' ? hoursAgo(seed.hoursAgo - 12) : null,
    tags: ['Permits', "Fiesta '26"],
  };
}

export function mockGetCitizenQueryStatusCounts(): StatusCounts {
  const counts: StatusCounts = {
    all: QUERY_SEEDS.length,
    new: 0,
    in_progress: 0,
    awaiting_citizen: 0,
    answered: 0,
    closed: 0,
    spam: 0,
  };
  for (const q of QUERY_SEEDS) counts[q.status]++;
  return counts;
}

// ─── Audit log ──────────────────────────────────────────────────

type AuditSeed = {
  id: string;
  hoursAgo: number;
  actorName: string | null;
  action: string;
  category: AuditCategory;
  targetType: string;
  targetId: string;
  alert: boolean;
  ip: string | null;
};

const AUDIT_SEEDS: AuditSeed[] = [
  {
    id: 'a-009',
    hoursAgo: 0.5,
    actorName: 'Office of the Secretary',
    action: 'published RES-2026-014',
    category: 'resolution',
    targetType: 'resolution',
    targetId: 'res-014',
    alert: false,
    ip: '203.0.113.4',
  },
  {
    id: 'a-008',
    hoursAgo: 1.5,
    actorName: 'Hon. Rosario Tabuga',
    action: 'approved transcript for Reg. Session #13',
    category: 'meeting',
    targetType: 'transcript',
    targetId: 'tr-013',
    alert: false,
    ip: '203.0.113.7',
  },
  {
    id: 'a-007',
    hoursAgo: 2.5,
    actorName: null,
    action: 'auto-saved 6 transcript revisions',
    category: 'meeting',
    targetType: 'transcript',
    targetId: 'tr-013',
    alert: false,
    ip: null,
  },
  {
    id: 'a-006',
    hoursAgo: 18,
    actorName: 'Hon. Linda Tagubuan',
    action: 'uploaded RES-2026-013.pdf',
    category: 'resolution',
    targetType: 'resolution',
    targetId: 'res-013',
    alert: false,
    ip: '203.0.113.12',
  },
  {
    id: 'a-005',
    hoursAgo: 20,
    actorName: 'Office of the Secretary',
    action: 'replied to Q-2026-0140',
    category: 'query',
    targetType: 'citizen_query',
    targetId: 'q-0140',
    alert: false,
    ip: '203.0.113.4',
  },
  {
    id: 'a-004',
    hoursAgo: 22,
    actorName: 'Office of the Secretary',
    action: 'invited admin user member8@lambunao.gov.ph',
    category: 'user',
    targetType: 'profile',
    targetId: 'u-008',
    alert: true,
    ip: '203.0.113.4',
  },
  {
    id: 'a-003',
    hoursAgo: 23,
    actorName: 'Hon. Maria dela Cruz',
    action: 'updated profile photo',
    category: 'member',
    targetType: 'sb_member',
    targetId: 'mem-003',
    alert: false,
    ip: '203.0.113.18',
  },
  {
    id: 'a-002',
    hoursAgo: 24,
    actorName: null,
    action: 'failed login attempt for unknown@example.ph',
    category: 'security',
    targetType: 'auth',
    targetId: '-',
    alert: true,
    ip: '45.61.1.1',
  },
  {
    id: 'a-001',
    hoursAgo: 32,
    actorName: null,
    action: 'nightly backup completed (42 GB)',
    category: 'system',
    targetType: 'system',
    targetId: 'backup-2026-04-28',
    alert: false,
    ip: null,
  },
];

export function mockGetAuditLog(options: GetAuditLogOptions = {}): AuditLogRowData[] {
  let list = AUDIT_SEEDS.slice();
  if (options.category) list = list.filter((a) => a.category === options.category);
  if (options.since) list = list.filter((a) => hoursAgo(a.hoursAgo) >= options.since!);
  list.sort((a, b) => a.hoursAgo - b.hoursAgo);
  const rows: AuditLogRowData[] = list.map((a) => ({
    id: a.id,
    createdAt: hoursAgo(a.hoursAgo),
    actorName: a.actorName,
    actorRole: null,
    action: a.action,
    category: a.category,
    targetType: a.targetType,
    targetId: a.targetId,
    alert: a.alert,
    ipInet: a.ip,
  }));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

// ─── Users ──────────────────────────────────────────────────────

const USER_SEEDS: UserRowData[] = [
  {
    id: 'u-001',
    fullName: 'SB Lambunao Secretary',
    email: 'sec@lambunao.gov.ph',
    role: 'secretary',
    active: true,
    invitedAt: daysAgo(120),
    lastSignInAt: hoursAgo(0),
  },
  {
    id: 'u-002',
    fullName: 'Hon. Rosario Tabuga',
    email: 'vm@lambunao.gov.ph',
    role: 'vice_mayor',
    active: true,
    invitedAt: daysAgo(110),
    lastSignInAt: hoursAgo(2),
  },
  {
    id: 'u-003',
    fullName: 'Hon. Carlos Villaruel',
    email: 'mayor@lambunao.gov.ph',
    role: 'mayor',
    active: true,
    invitedAt: daysAgo(110),
    lastSignInAt: hoursAgo(26),
  },
  {
    id: 'u-004',
    fullName: 'Hon. Maria dela Cruz',
    email: 'm1@lambunao.gov.ph',
    role: 'sb_member',
    active: true,
    invitedAt: daysAgo(100),
    lastSignInAt: daysAgo(3),
  },
  {
    id: 'u-005',
    fullName: 'Hon. Jose Bonifacio',
    email: 'm2@lambunao.gov.ph',
    role: 'sb_member',
    active: true,
    invitedAt: daysAgo(100),
    lastSignInAt: daysAgo(7),
  },
  {
    id: 'u-008',
    fullName: 'Hon. Pedro Mananquil',
    email: 'm8@lambunao.gov.ph',
    role: 'sb_member',
    active: false,
    invitedAt: hoursAgo(22),
    lastSignInAt: null,
  },
  {
    id: 'u-009',
    fullName: 'PLO Coordinator',
    email: 'plo@lambunao.gov.ph',
    role: 'other_lgu',
    active: true,
    invitedAt: daysAgo(60),
    lastSignInAt: daysAgo(5),
  },
];

export function mockGetUsersList(): UserRowData[] {
  return USER_SEEDS.slice();
}

// ─── Dashboard ──────────────────────────────────────────────────

export function mockGetDashboardData(): DashboardData {
  const upcoming = mockGetUpcomingMeetings(1);
  const queryCounts = mockGetCitizenQueryStatusCounts();
  const recentResolution = mockGetResolutionsList({ status: 'approved' })[0] ?? null;
  const recentActivity = mockGetAuditLog({ limit: 4 });
  return {
    upcomingMeeting: upcoming[0] ?? null,
    pendingQueriesCount: queryCounts.new + queryCounts.in_progress,
    queryCounts,
    recentResolution,
    recentActivity,
  };
}
