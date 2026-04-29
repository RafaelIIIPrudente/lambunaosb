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

import { db } from './index';
import {
  committeeAssignments,
  committees,
  profiles,
  sbMembers,
  tenants,
  type NewCommittee,
  type NewSBMember,
} from './schema';

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

const COMMITTEE_SEED: Omit<NewCommittee, 'tenantId'>[] = [
  { slug: 'rules', name: 'Rules', isStanding: true, sortOrder: 10 },
  { slug: 'appropriations', name: 'Appropriations', isStanding: true, sortOrder: 20 },
  { slug: 'health-sanitation', name: 'Health & Sanitation', isStanding: true, sortOrder: 30 },
  { slug: 'education', name: 'Education', isStanding: true, sortOrder: 40 },
  { slug: 'public-safety', name: 'Public Safety', isStanding: true, sortOrder: 50 },
  {
    slug: 'roads-infrastructure',
    name: 'Roads & Infrastructure',
    isStanding: true,
    sortOrder: 60,
  },
  { slug: 'women-family', name: 'Women & Family', isStanding: true, sortOrder: 70 },
  { slug: 'social-services', name: 'Social Services', isStanding: true, sortOrder: 80 },
  { slug: 'environment', name: 'Environment', isStanding: true, sortOrder: 90 },
  { slug: 'agriculture', name: 'Agriculture', isStanding: true, sortOrder: 100 },
  { slug: 'public-works', name: 'Public Works', isStanding: true, sortOrder: 110 },
  { slug: 'tourism', name: 'Tourism', isStanding: true, sortOrder: 120 },
  { slug: 'trade', name: 'Trade', isStanding: true, sortOrder: 130 },
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
    committeeRoles: [
      { slug: 'rules', role: 'chair' },
      { slug: 'appropriations', role: 'member' },
    ],
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
      { slug: 'health-sanitation', role: 'chair' },
      { slug: 'education', role: 'member' },
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
      { slug: 'public-safety', role: 'chair' },
      { slug: 'roads-infrastructure', role: 'member' },
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
      { slug: 'women-family', role: 'chair' },
      { slug: 'social-services', role: 'member' },
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
      { slug: 'environment', role: 'chair' },
      { slug: 'agriculture', role: 'member' },
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
      { slug: 'appropriations', role: 'chair' },
      { slug: 'public-works', role: 'member' },
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
      { slug: 'tourism', role: 'chair' },
      { slug: 'trade', role: 'member' },
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
