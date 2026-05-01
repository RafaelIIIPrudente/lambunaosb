import 'server-only';

import { and, asc, desc, eq, gte, ilike, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  type AgendaItem,
  meetingMinutes,
  type MeetingMinutes,
  meetings,
  type Meeting,
  sbMembers,
  transcripts,
  type Transcript,
} from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type MeetingType = Meeting['type'];
export type MeetingStatus = Meeting['status'];
export type TranscriptStatus = Transcript['status'];
export type MeetingMinutesStatus = MeetingMinutes['status'];

export type MeetingDisplayStatus = 'scheduled' | 'recorded' | 'transcribed' | 'published';

export const MEETINGS_PAGE_SIZE = 50;

const STATUS_DISPLAY_MAP: Record<MeetingStatus, MeetingDisplayStatus> = {
  scheduled: 'scheduled',
  in_progress: 'recorded',
  awaiting_transcript: 'recorded',
  transcript_in_review: 'transcribed',
  transcript_approved: 'transcribed',
  minutes_published: 'published',
  cancelled: 'scheduled',
};

const TRANSCRIPT_LABEL_MAP: Record<TranscriptStatus, string> = {
  awaiting_asr: 'Pending',
  asr_failed: 'ASR failed',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export type MeetingRowData = {
  id: string;
  date: Date;
  title: string;
  type: MeetingType;
  sequenceNumber: number;
  location: string;
  audioLength: string | null;
  transcript: string | null;
  status: MeetingDisplayStatus;
  rawStatus: MeetingStatus;
};

export type GetMeetingsListOptions = {
  type?: MeetingType;
  status?: MeetingStatus;
  year?: number;
  q?: string;
  cursor?: Date | null;
  pageSize?: number;
};

export type GetMeetingsListResult = {
  rows: MeetingRowData[];
  nextCursor: string | null;
};

export async function getMeetingsList(
  options: GetMeetingsListOptions = {},
): Promise<GetMeetingsListResult> {
  const tenantId = await getCurrentTenantId();
  const limit = options.pageSize ?? MEETINGS_PAGE_SIZE;

  const conditions = [eq(meetings.tenantId, tenantId), isNull(meetings.deletedAt)];
  if (options.type) conditions.push(eq(meetings.type, options.type));
  if (options.status) conditions.push(eq(meetings.status, options.status));
  if (options.year) {
    conditions.push(sql`extract(year from ${meetings.scheduledAt}) = ${options.year}`);
  }
  if (options.q && options.q.trim().length > 0) {
    const term = `%${options.q.trim()}%`;
    conditions.push(or(ilike(meetings.title, term), ilike(meetings.location, term))!);
  }
  if (options.cursor) {
    conditions.push(lt(meetings.scheduledAt, options.cursor));
  }

  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      type: meetings.type,
      sequenceNumber: meetings.sequenceNumber,
      scheduledAt: meetings.scheduledAt,
      location: meetings.location,
      audioDurationMs: meetings.audioDurationMs,
      status: meetings.status,
      transcriptStatus: transcripts.status,
    })
    .from(meetings)
    .leftJoin(transcripts, eq(transcripts.meetingId, meetings.id))
    .where(and(...conditions))
    .orderBy(desc(meetings.scheduledAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = trimmed[trimmed.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.scheduledAt.toISOString() : null;

  return {
    rows: trimmed.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      sequenceNumber: row.sequenceNumber,
      date: row.scheduledAt,
      location: row.location,
      audioLength: formatDuration(row.audioDurationMs),
      transcript: row.transcriptStatus ? TRANSCRIPT_LABEL_MAP[row.transcriptStatus] : null,
      status: STATUS_DISPLAY_MAP[row.status],
      rawStatus: row.status,
    })),
    nextCursor,
  };
}

export async function getMeetingStatusCounts(): Promise<Record<MeetingStatus, number>> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      status: meetings.status,
      count: sql<number>`count(*)::int`,
    })
    .from(meetings)
    .where(and(eq(meetings.tenantId, tenantId), isNull(meetings.deletedAt)))
    .groupBy(meetings.status);

  const counts: Record<MeetingStatus, number> = {
    scheduled: 0,
    in_progress: 0,
    awaiting_transcript: 0,
    transcript_in_review: 0,
    transcript_approved: 0,
    minutes_published: 0,
    cancelled: 0,
  };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

export async function getMeetingYears(): Promise<number[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .selectDistinct({
      year: sql<number>`extract(year from ${meetings.scheduledAt})::int`,
    })
    .from(meetings)
    .where(and(eq(meetings.tenantId, tenantId), isNull(meetings.deletedAt)))
    .orderBy(sql`extract(year from ${meetings.scheduledAt})::int desc`);
  return rows.map((r) => r.year);
}

export async function getNextMeetingSequenceNumber(
  type: MeetingType,
  year: number,
): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({ max: sql<number | null>`max(${meetings.sequenceNumber})::int` })
    .from(meetings)
    .where(
      and(
        eq(meetings.tenantId, tenantId),
        eq(meetings.type, type),
        sql`extract(year from ${meetings.scheduledAt}) = ${year}`,
      ),
    );
  return (row?.max ?? 0) + 1;
}

export type MeetingDetail = {
  id: string;
  title: string;
  type: MeetingType;
  sequenceNumber: number;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  location: string;
  primaryLocale: string;
  status: MeetingStatus;
  agenda: AgendaItem[];
  presider: { id: string; fullName: string; honorific: string } | null;
  hasTranscript: boolean;
  transcriptId: string | null;
  transcriptStatus: TranscriptStatus | null;
  minutesId: string | null;
  minutesStatus: MeetingMinutesStatus | null;
  cleanupEnabled: boolean;
  audioStoragePrefix: string | null;
  audioDurationMs: number | null;
};

export async function getMeetingById(id: string): Promise<MeetingDetail | null> {
  const tenantId = await getCurrentTenantId();
  const [row] = await db
    .select({
      meeting: meetings,
      presiderId: sbMembers.id,
      presiderName: sbMembers.fullName,
      presiderHonorific: sbMembers.honorific,
      transcriptId: transcripts.id,
      transcriptStatus: transcripts.status,
      minutesId: meetingMinutes.id,
      minutesStatus: meetingMinutes.status,
    })
    .from(meetings)
    .leftJoin(sbMembers, eq(sbMembers.id, meetings.presiderId))
    .leftJoin(transcripts, eq(transcripts.meetingId, meetings.id))
    .leftJoin(meetingMinutes, eq(meetingMinutes.meetingId, meetings.id))
    .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, id), isNull(meetings.deletedAt)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.meeting.id,
    title: row.meeting.title,
    type: row.meeting.type,
    sequenceNumber: row.meeting.sequenceNumber,
    scheduledAt: row.meeting.scheduledAt,
    startedAt: row.meeting.startedAt,
    endedAt: row.meeting.endedAt,
    location: row.meeting.location,
    primaryLocale: row.meeting.primaryLocale,
    status: row.meeting.status,
    agenda: row.meeting.agendaJson,
    presider: row.presiderId
      ? {
          id: row.presiderId,
          fullName: row.presiderName ?? 'Unknown',
          honorific: row.presiderHonorific ?? 'Hon.',
        }
      : null,
    hasTranscript: row.transcriptId !== null,
    transcriptId: row.transcriptId,
    transcriptStatus: row.transcriptStatus,
    minutesId: row.minutesId,
    minutesStatus: row.minutesStatus,
    cleanupEnabled: row.meeting.cleanupEnabled,
    audioStoragePrefix: row.meeting.audioStoragePrefix,
    audioDurationMs: row.meeting.audioDurationMs,
  };
}

export async function getUpcomingMeetings(limit = 5): Promise<MeetingRowData[]> {
  const tenantId = await getCurrentTenantId();
  const now = new Date();
  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      type: meetings.type,
      sequenceNumber: meetings.sequenceNumber,
      scheduledAt: meetings.scheduledAt,
      location: meetings.location,
      audioDurationMs: meetings.audioDurationMs,
      status: meetings.status,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.tenantId, tenantId),
        eq(meetings.status, 'scheduled'),
        gte(meetings.scheduledAt, now),
        isNull(meetings.deletedAt),
      ),
    )
    .orderBy(asc(meetings.scheduledAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    sequenceNumber: row.sequenceNumber,
    date: row.scheduledAt,
    location: row.location,
    audioLength: null,
    transcript: null,
    status: STATUS_DISPLAY_MAP[row.status],
    rawStatus: row.status,
  }));
}
