'use server';

import 'server-only';

import { citizenQuerySchema, type CitizenQueryInput } from '@/lib/validators/citizen-query';
import { type Result, ok, err } from '@/lib/types/result';

/**
 * Phase 2 stub. Phase 3 wires Drizzle + Supabase + Resend + Turnstile.
 * Shape stable now so the form integration is locked.
 */
export async function createCitizenQuery(
  raw: unknown,
): Promise<Result<{ referenceNumber: string }>> {
  const parsed = citizenQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err('Please correct the highlighted fields.', 'E_VALIDATION');
  }

  // Honeypot tripped → succeed silently per brief §4 / PROJECT.md §17.1.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return ok({ referenceNumber: pretendReference() });
  }

  // Persist + spam-check + email would happen here in Phase 3.
  // For now, fabricate the reference number per PROJECT.md §4.
  await new Promise((resolve) => setTimeout(resolve, 500));

  return ok({ referenceNumber: pretendReference() });
}

function pretendReference() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `Q-${year}-${seq}`;
}

export type { CitizenQueryInput };
