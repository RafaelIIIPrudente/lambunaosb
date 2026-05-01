import { z } from 'zod';

export const AUDIT_CATEGORIES = [
  'resolution',
  'meeting',
  'query',
  'user',
  'member',
  'news',
  'security',
  'system',
] as const;

export type AuditCategoryValue = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategoryValue, string> = {
  resolution: 'Resolution',
  meeting: 'Meeting',
  query: 'Citizen query',
  user: 'User & access',
  member: 'Member',
  news: 'News',
  security: 'Security',
  system: 'System',
};

// Discovered by grepping every writeAudit caller. Keep this list in sync as
// new actions are added; unknown values render as the raw targetType string.
export const AUDIT_TARGET_TYPES = [
  'resolution',
  'news_post',
  'citizen_query',
  'citizen_query_reply',
  'sb_member',
  'meeting',
  'transcript',
  'profile',
  'tenant',
] as const;

export type AuditTargetTypeValue = (typeof AUDIT_TARGET_TYPES)[number];

export const AUDIT_TARGET_TYPE_LABELS: Record<AuditTargetTypeValue, string> = {
  resolution: 'Resolution',
  news_post: 'News post',
  citizen_query: 'Citizen query',
  citizen_query_reply: 'Reply',
  sb_member: 'SB member',
  meeting: 'Meeting',
  transcript: 'Transcript',
  profile: 'User profile',
  tenant: 'Tenant settings',
};

export function targetTypeLabel(raw: string): string {
  return (AUDIT_TARGET_TYPE_LABELS as Record<string, string>)[raw] ?? raw;
}

export const QUICK_DATE_RANGES = ['today', '7d', '30d', '90d', 'custom'] as const;
export type QuickDateRange = (typeof QUICK_DATE_RANGES)[number];

export const QUICK_DATE_RANGE_LABELS: Record<QuickDateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom',
};

// Parses a YYYY-MM-DD date string. Returns null on bad input. Treats the date
// as the START of that calendar day in the SERVER tz (UTC by default), which
// is fine for an audit search; precision finer than a day is not needed.
export function parseDateInput(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCursor(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Resolves the (since, until) tuple given a quick range or custom inputs.
export function resolveDateRange(input: {
  range?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): { since: Date | null; until: Date | null } {
  const range = (QUICK_DATE_RANGES as readonly string[]).includes(input.range ?? '')
    ? (input.range as QuickDateRange)
    : null;

  if (range && range !== 'custom') {
    const now = new Date();
    const since = new Date(now);
    if (range === 'today') {
      since.setUTCHours(0, 0, 0, 0);
    } else if (range === '7d') {
      since.setUTCDate(since.getUTCDate() - 7);
    } else if (range === '30d') {
      since.setUTCDate(since.getUTCDate() - 30);
    } else if (range === '90d') {
      since.setUTCDate(since.getUTCDate() - 90);
    }
    return { since, until: null };
  }

  return {
    since: parseDateInput(input.from),
    until: parseDateInput(input.to),
  };
}

export const auditFilterSchema = z.object({
  category: z.enum(AUDIT_CATEGORIES).nullable(),
  actorId: z.uuid().nullable(),
  actionContains: z.string().trim().min(1).max(120).nullable(),
  alertOnly: z.boolean(),
  range: z.enum(QUICK_DATE_RANGES).nullable(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  cursor: z.string().nullable(),
});

export type AuditFilterInput = z.infer<typeof auditFilterSchema>;

// Coerce raw searchParams into a strongly-typed filter object. Any malformed
// field is silently dropped (treated as "filter off"). The page never throws
// on bad URLs — it just shows the filtered-or-not result.
export function parseAuditSearchParams(params: {
  category?: string;
  actor?: string;
  q?: string;
  alert?: string;
  range?: string;
  from?: string;
  to?: string;
  cursor?: string;
}): AuditFilterInput {
  const category =
    params.category && (AUDIT_CATEGORIES as readonly string[]).includes(params.category)
      ? (params.category as AuditCategoryValue)
      : null;

  const actorId = (() => {
    if (!params.actor) return null;
    const result = z.uuid().safeParse(params.actor);
    return result.success ? result.data : null;
  })();

  const actionContains =
    params.q && params.q.trim().length > 0 ? params.q.trim().slice(0, 120) : null;

  const alertOnly = params.alert === '1';

  const range =
    params.range && (QUICK_DATE_RANGES as readonly string[]).includes(params.range)
      ? (params.range as QuickDateRange)
      : null;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const from = params.from && dateRegex.test(params.from) ? params.from : null;
  const to = params.to && dateRegex.test(params.to) ? params.to : null;

  const cursor = params.cursor && parseCursor(params.cursor) !== null ? params.cursor : null;

  return { category, actorId, actionContains, alertOnly, range, from, to, cursor };
}
