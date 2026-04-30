/**
 * Seed the lambunao tenant + committees + members + committee assignments.
 * Idempotent — safe to re-run.
 *
 * Usage (after copying .env.example to .env.local with real Supabase values):
 *
 *   pnpm db:seed
 *
 * To link the Secretary auth user (created in the Supabase dashboard) to a profile:
 *
 *   pnpm db:link-secretary <SUPABASE_AUTH_USER_UUID>
 *
 * The link step inserts (or upserts) a profiles row keyed to the auth user,
 * with role='secretary' and the lambunao tenant.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  committeeAssignments,
  committees,
  profiles,
  sbMembers,
  tenants,
  type NewCommittee,
  type NewSBMember,
} from './schema';

// Standalone db client — the seed runs via tsx outside Next.js, so it can't
// import from ./index (which uses 'server-only', a bundler-only stub that
// throws when resolved by Node directly).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Did --env-file pick up your .env?');
  process.exit(1);
}
const client = postgres(databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, {
  schema: { committeeAssignments, committees, profiles, sbMembers, tenants },
});

const TENANT_SLUG = 'lambunao';

const TENANT_DATA = {
  slug: TENANT_SLUG,
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
};

// Canonical 22 SB Lambunao committees. Source of truth:
// memory/project_committees.md (provided by Bryan 2026-05-01).
//
// Slug rule (deterministic): lowercase the name, drop commas/ampersands/periods,
// replace whitespace with single hyphens, collapse repeats. Hyphens already
// present in the name are preserved (so "Land-use" → "...-land-use").
//
// `isStanding: false` flags the two Special Committees (#7 and #17 in memory).
// Wording is verbatim — do not "fix" punctuation, casing, or word choice.
const COMMITTEE_SEED: Omit<NewCommittee, 'tenantId'>[] = [
  {
    slug: 'committee-on-finance-budget-and-appropriations',
    name: 'Committee on Finance, Budget and Appropriations',
    isStanding: true,
    sortOrder: 10,
  },
  {
    slug: 'committee-on-economic-enterprise',
    name: 'Committee on Economic Enterprise',
    isStanding: true,
    sortOrder: 20,
  },
  {
    slug: 'committee-on-trade-commerce-promotions-and-industry',
    name: 'Committee on Trade, Commerce, Promotions, and Industry',
    isStanding: true,
    sortOrder: 30,
  },
  {
    slug: 'committee-on-legal-matters-and-ordinances',
    name: 'Committee on Legal Matters and Ordinances',
    isStanding: true,
    sortOrder: 40,
  },
  {
    slug: 'committee-on-tourism-and-culture',
    name: 'Committee on Tourism and Culture',
    isStanding: true,
    sortOrder: 50,
  },
  {
    slug: 'committee-on-health-and-sanitation',
    name: 'Committee on Health and Sanitation',
    isStanding: true,
    sortOrder: 60,
  },
  {
    slug: 'special-committee-on-information-and-communications-technology',
    name: 'Special Committee on Information and Communications Technology',
    isStanding: false,
    sortOrder: 70,
  },
  {
    slug: 'committee-on-games-and-amusement',
    name: 'Committee on Games and Amusement',
    isStanding: true,
    sortOrder: 80,
  },
  {
    slug: 'committee-on-public-utilities-and-facilities',
    name: 'Committee on Public Utilities and Facilities',
    isStanding: true,
    sortOrder: 90,
  },
  {
    slug: 'committee-on-agriculture-cooperatives-and-csos',
    name: 'Committee on Agriculture, Cooperatives, and CSOs',
    isStanding: true,
    sortOrder: 100,
  },
  {
    slug: 'committee-on-women-and-family',
    name: 'Committee on Women and Family',
    isStanding: true,
    sortOrder: 110,
  },
  {
    slug: 'committee-on-social-welfare-and-development',
    name: 'Committee on Social Welfare and Development',
    isStanding: true,
    sortOrder: 120,
  },
  {
    slug: 'committee-on-education',
    name: 'Committee on Education',
    isStanding: true,
    sortOrder: 130,
  },
  {
    slug: 'committee-on-infrastructure-and-public-works',
    name: 'Committee on Infrastructure and Public Works',
    isStanding: true,
    sortOrder: 140,
  },
  {
    slug: 'committee-on-environmental-protection',
    name: 'Committee on Environmental Protection',
    isStanding: true,
    sortOrder: 150,
  },
  {
    slug: 'committee-on-peace-and-order-and-public-safety',
    name: 'Committee on Peace and Order and Public Safety',
    isStanding: true,
    sortOrder: 160,
  },
  {
    slug: 'special-committee-on-disaster-risk-reduction-and-management',
    name: 'Special Committee on Disaster Risk Reduction and Management',
    isStanding: false,
    sortOrder: 170,
  },
  {
    slug: 'committee-on-human-rights',
    name: 'Committee on Human Rights',
    isStanding: true,
    sortOrder: 180,
  },
  {
    slug: 'committee-on-housing-and-land-use',
    name: 'Committee on Housing and Land-use',
    isStanding: true,
    sortOrder: 190,
  },
  {
    slug: 'committee-on-sports-and-youth-development',
    name: 'Committee on Sports and Youth Development',
    isStanding: true,
    sortOrder: 200,
  },
  {
    slug: 'committee-on-barangay-affairs',
    name: 'Committee on Barangay Affairs',
    isStanding: true,
    sortOrder: 210,
  },
  {
    slug: 'committee-on-good-governance-public-ethics-accountability',
    name: 'Committee on Good Governance, Public Ethics, & Accountability',
    isStanding: true,
    sortOrder: 220,
  },
];

type MemberSeed = Omit<NewSBMember, 'tenantId'> & {
  committeeRoles: { slug: string; role: 'chair' | 'vice_chair' | 'member' }[];
};

const MEMBER_SEED: MemberSeed[] = [
  {
    fullName: 'Carlos Villaruel',
    honorific: 'Hon.',
    position: 'mayor',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 0,
    showOnPublic: false,
    committeeRoles: [],
  },
  {
    fullName: 'Rosario Tabuga',
    honorific: 'Hon.',
    position: 'vice_mayor',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 10,
    seniority: 'Presiding Officer',
    showOnPublic: true,
    // Vice Mayor presides over the SB; no chairmanships in the canonical 22.
    // Kept as a member of Finance/Budget for the placeholder fixture.
    committeeRoles: [{ slug: 'committee-on-finance-budget-and-appropriations', role: 'member' }],
  },
  {
    fullName: 'Maria dela Cruz',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 20,
    seniority: 'Senior Member',
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-health-and-sanitation', role: 'chair' },
      { slug: 'committee-on-education', role: 'member' },
    ],
  },
  {
    fullName: 'Jose Bonifacio',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 30,
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-peace-and-order-and-public-safety', role: 'chair' },
      { slug: 'committee-on-infrastructure-and-public-works', role: 'member' },
    ],
  },
  {
    fullName: 'Ana Salonga',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 40,
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-women-and-family', role: 'chair' },
      { slug: 'committee-on-social-welfare-and-development', role: 'member' },
    ],
  },
  {
    fullName: 'Renato Gallardo',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 50,
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-environmental-protection', role: 'chair' },
      { slug: 'committee-on-agriculture-cooperatives-and-csos', role: 'member' },
    ],
  },
  {
    fullName: 'Linda Tagubuan',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 60,
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-finance-budget-and-appropriations', role: 'chair' },
      { slug: 'committee-on-infrastructure-and-public-works', role: 'member' },
    ],
  },
  {
    fullName: 'Pedro Mananquil',
    honorific: 'Hon.',
    position: 'sb_member',
    termStartYear: 2025,
    termEndYear: 2028,
    sortOrder: 70,
    showOnPublic: true,
    committeeRoles: [
      { slug: 'committee-on-tourism-and-culture', role: 'chair' },
      { slug: 'committee-on-trade-commerce-promotions-and-industry', role: 'member' },
    ],
  },
];

async function ensureTenant(): Promise<string> {
  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);
  if (existing) {
    console.log(`  tenant exists: ${existing.id}`);
    return existing.id;
  }
  const [inserted] = await db.insert(tenants).values(TENANT_DATA).returning({ id: tenants.id });
  if (!inserted) throw new Error('Failed to insert tenant.');
  console.log(`  tenant created: ${inserted.id}`);
  return inserted.id;
}

async function ensureCommittees(tenantId: string): Promise<Map<string, string>> {
  const existing = await db
    .select({ id: committees.id, slug: committees.slug })
    .from(committees)
    .where(eq(committees.tenantId, tenantId));

  const bySlug = new Map(existing.map((c) => [c.slug, c.id]));
  const toInsert = COMMITTEE_SEED.filter((c) => !bySlug.has(c.slug));

  if (toInsert.length === 0) {
    console.log(`  committees: ${bySlug.size} already exist`);
    return bySlug;
  }

  const inserted = await db
    .insert(committees)
    .values(toInsert.map((c) => ({ ...c, tenantId })))
    .returning({ id: committees.id, slug: committees.slug });

  for (const c of inserted) bySlug.set(c.slug, c.id);
  console.log(`  committees: inserted ${inserted.length}, total ${bySlug.size}`);
  return bySlug;
}

async function ensureMembers(
  tenantId: string,
  committeesBySlug: Map<string, string>,
): Promise<void> {
  const existing = await db
    .select({ id: sbMembers.id, fullName: sbMembers.fullName })
    .from(sbMembers)
    .where(eq(sbMembers.tenantId, tenantId));

  const byName = new Map(existing.map((m) => [m.fullName, m.id]));
  let inserted = 0;
  let assignmentsInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const seed of MEMBER_SEED) {
    let memberId = byName.get(seed.fullName);
    if (!memberId) {
      const { committeeRoles, ...row } = seed;
      void committeeRoles;
      const [created] = await db
        .insert(sbMembers)
        .values({ ...row, tenantId })
        .returning({ id: sbMembers.id });
      if (!created) throw new Error(`Failed to insert member ${seed.fullName}`);
      memberId = created.id;
      byName.set(seed.fullName, memberId);
      inserted++;
    }

    const existingAssignments = await db
      .select({ committeeId: committeeAssignments.committeeId })
      .from(committeeAssignments)
      .where(eq(committeeAssignments.memberId, memberId));
    const assigned = new Set(existingAssignments.map((a) => a.committeeId));

    for (const roleSeed of seed.committeeRoles) {
      const committeeId = committeesBySlug.get(roleSeed.slug);
      if (!committeeId) {
        console.warn(`  ! committee slug not found for ${seed.fullName}: ${roleSeed.slug}`);
        continue;
      }
      if (assigned.has(committeeId)) continue;
      await db.insert(committeeAssignments).values({
        tenantId,
        memberId,
        committeeId,
        role: roleSeed.role,
        startDate: today,
      });
      assignmentsInserted++;
    }
  }

  console.log(
    `  members: inserted ${inserted}, total ${byName.size}; committee assignments inserted ${assignmentsInserted}`,
  );
}

async function linkSecretary(authUserId: string): Promise<void> {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);
  if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} not found. Run \`pnpm db:seed\` first.`);

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, authUserId))
    .limit(1);

  if (existing) {
    await db
      .update(profiles)
      .set({
        role: 'secretary',
        active: true,
        tenantId: tenant.id,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, authUserId));
    console.log(`  profile updated: ${authUserId} → secretary`);
    return;
  }

  await db.insert(profiles).values({
    id: authUserId,
    tenantId: tenant.id,
    role: 'secretary',
    email: 'sb@lambunao.gov.ph',
    fullName: 'SB Lambunao Secretary',
    title: 'Secretary to the Sangguniang Bayan',
    honorific: 'Hon.',
    active: true,
    invitedAt: new Date(),
  });
  console.log(`  profile created: ${authUserId} → secretary`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === '--link') {
    const userId = args[1];
    if (!userId) {
      console.error('Usage: pnpm db:link-secretary <SUPABASE_AUTH_USER_UUID>');
      process.exit(1);
    }
    console.log(`Linking secretary profile to auth user ${userId}...`);
    await linkSecretary(userId);
    console.log('Done.');
    return;
  }

  console.log('Seeding lambunao tenant...');
  const tenantId = await ensureTenant();
  const committeesBySlug = await ensureCommittees(tenantId);
  await ensureMembers(tenantId, committeesBySlug);
  console.log('\nNext step: create the Secretary auth user in the Supabase dashboard,');
  console.log('then run `pnpm db:link-secretary <UUID>` to link their profile.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
