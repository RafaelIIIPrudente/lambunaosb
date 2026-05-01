'use server';

import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import { citizenQueries } from '@/lib/db/schema';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { writeAudit } from '@/lib/services/audit';
import { ok, err, type Result } from '@/lib/types/result';
import { citizenQuerySchema, RETENTION_YEARS } from '@/lib/validators/citizen-query';

async function nextRefForYear(tenantId: string, year: number): Promise<string> {
  const [latest] = await db
    .select({ sequenceNumber: citizenQueries.sequenceNumber })
    .from(citizenQueries)
    .where(and(eq(citizenQueries.tenantId, tenantId), eq(citizenQueries.year, year)))
    .orderBy(desc(citizenQueries.sequenceNumber))
    .limit(1);
  const next = (latest?.sequenceNumber ?? 0) + 1;
  return `Q-${year}-${next.toString().padStart(4, '0')}`;
}

export async function createCitizenQuery(
  raw: unknown,
): Promise<Result<{ referenceNumber: string; submitterEmail: string }>> {
  const parsed = citizenQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err('Please correct the highlighted fields.', 'E_VALIDATION');
  }

  // Honeypot tripped → silent success per RA 10173 §17.1.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return ok({ referenceNumber: 'Q-0000-0000', submitterEmail: 'silent@honeypot' });
  }

  try {
    const headerList = await headers();
    const userAgent = headerList.get('user-agent');
    const forwardedFor = headerList.get('x-forwarded-for');
    const ipInet = forwardedFor?.split(',')[0]?.trim() ?? null;

    const passedCaptcha = await verifyTurnstile(parsed.data.turnstileToken, ipInet);
    if (!passedCaptcha) {
      return err('Captcha verification failed. Please refresh and try again.', 'INVALID_CAPTCHA');
    }

    const tenantId = await getCurrentTenantId();

    const submittedAt = new Date();
    const year = submittedAt.getFullYear();
    const ref = await nextRefForYear(tenantId, year);
    const sequenceNumber = Number(ref.split('-')[2]);
    const retentionExpiresAt = new Date(submittedAt);
    retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + RETENTION_YEARS);

    const [row] = await db
      .insert(citizenQueries)
      .values({
        tenantId,
        ref,
        year,
        sequenceNumber,
        submitterName: parsed.data.fullName,
        submitterEmail: parsed.data.email,
        subject: parsed.data.subject,
        messageMd: parsed.data.message,
        category: parsed.data.category,
        status: 'new',
        submittedAt,
        retentionExpiresAt,
        ipInet,
        userAgent,
      })
      .returning({ id: citizenQueries.id, ref: citizenQueries.ref });

    if (!row) return err('Failed to record your query. Please try again.', 'E_INSERT_FAILED');

    await writeAudit({
      actorId: null,
      actorRole: null,
      action: 'citizen_query.submitted',
      category: 'query',
      targetType: 'citizen_query',
      targetId: row.id,
      ipInet,
      userAgent,
      metadata: { ref: row.ref, category: parsed.data.category },
    });

    revalidatePath('/admin/queries');
    revalidatePath('/admin/dashboard');
    return ok({ referenceNumber: row.ref, submitterEmail: parsed.data.email });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'We could not record your query. Please try again later.',
      'E_UNKNOWN',
    );
  }
}
