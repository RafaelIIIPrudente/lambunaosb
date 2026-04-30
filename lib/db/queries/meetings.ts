import 'server-only';

import { and, asc, desc, eq, gte, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  type AgendaItem,
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

export type MeetingDisplayStatus = 'scheduled' | 'recorded' | 'transcribed' | 'published';

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
  location: string;
  audioLength: string | null;
  transcript: string | null;
  status: MeetingDisplayStatus;
};

export async function getMeetingsList(): Promise<MeetingRowData[]> {
  const tenantId = await getCurrentTenantId();
  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      type: meetings.type,
      scheduledAt: meetings.scheduledAt,
      location: meetings.location,
      audioDurationMs: meetings.audioDurationMs,
      status: meetings.status,
      transcriptStatus: transcripts.status,
    })
    .from(meetings)
    .leftJoin(transcripts, eq(transcripts.meetingId, meetings.id))
    .where(and(eq(meetings.tenantId, tenantId), isNull(meetings.deletedAt)))
    .orderBy(desc(meetings.scheduledAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.scheduledAt,
    location: row.location,
    audioLength: formatDuration(row.audioDurationMs),
    transcript: row.transcriptStatus ? TRANSCRIPT_LABEL_MAP[row.transcriptStatus] : null,
    status: STATUS_DISPLAY_MAP[row.status],
  }));
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
    })
    .from(meetings)
    .leftJoin(sbMembers, eq(sbMembers.id, meetings.presiderId))
    .leftJoin(transcripts, eq(transcripts.meetingId, meetings.id))
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
    date: row.scheduledAt,
    location: row.location,
    audioLength: null,
    transcript: null,
    status: STATUS_DISPLAY_MAP[row.status],
  }));
}
