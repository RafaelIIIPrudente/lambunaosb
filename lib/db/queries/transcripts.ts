import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  type Transcript,
  type TranscriptSegment,
  transcripts,
  transcriptSegments,
} from '@/lib/db/schema';

import { getCurrentTenantId } from './tenant';

export type TranscriptWithSegments = {
  transcript: Transcript;
  segments: TranscriptSegment[];
};

export async function getTranscriptByMeetingId(
  meetingId: string,
): Promise<TranscriptWithSegments | null> {
  const tenantId = await getCurrentTenantId();
  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(and(eq(transcripts.tenantId, tenantId), eq(transcripts.meetingId, meetingId)))
    .limit(1);

  if (!transcript) return null;

  const segments = await db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.transcriptId, transcript.id))
    .orderBy(asc(transcriptSegments.sequenceIndex));

  return { transcript, segments };
}

export type TranscriptStats = {
  totalDurationMs: number;
  segmentCount: number;
  unassignedCount: number;
  asrCostUsd: number;
  cleanupCostUsd: number;
  totalCostUsd: number;
};

export function computeTranscriptStats(data: TranscriptWithSegments): TranscriptStats {
  const segments = data.segments;
  const segmentCount = segments.length;
  const unassignedCount = segments.filter((s) => !s.speakerId && !s.speakerLabel).length;
  const totalDurationMs =
    segments.length > 0
      ? Math.max(...segments.map((s) => s.endMs)) - Math.min(...segments.map((s) => s.startMs))
      : 0;

  const meta = data.transcript.metadata as Record<string, unknown> | null;
  const asrCostUsd = typeof meta?.asrCostUsd === 'number' ? meta.asrCostUsd : 0;
  const cleanupCostUsd = typeof meta?.cleanupCostUsd === 'number' ? meta.cleanupCostUsd : 0;

  return {
    totalDurationMs,
    segmentCount,
    unassignedCount,
    asrCostUsd,
    cleanupCostUsd,
    totalCostUsd: asrCostUsd + cleanupCostUsd,
  };
}
