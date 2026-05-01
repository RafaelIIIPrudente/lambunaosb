'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RotateCcw, Save, Users } from 'lucide-react';

import { generateMinutes } from '@/app/_actions/minutes';
import {
  approveTranscript,
  batchAssignSpeaker,
  unapproveTranscript,
  updateTranscriptSegment,
} from '@/app/_actions/transcripts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldSelect } from '@/components/ui/field';
import type { TranscriptSegment } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { TRANSCRIPT_SEGMENT_FLAGS } from '@/lib/validators/transcript';

const FLAG_LABELS: Record<(typeof TRANSCRIPT_SEGMENT_FLAGS)[number], string> = {
  motion: 'Motion',
  vote: 'Vote',
  decision: 'Decision',
  question: 'Question',
  quote: 'Quote',
  off_record: 'Off-record',
};

const SPEAKER_UNKNOWN = '__unknown__';
const SPEAKER_MULTIPLE = '__multiple__';
const SPEAKER_NONE = '__none__';

type Member = { id: string; honorific: string; fullName: string };

type Props = {
  transcriptId: string;
  meetingId: string;
  status: 'awaiting_asr' | 'asr_failed' | 'in_review' | 'approved' | 'rejected';
  segments: TranscriptSegment[];
  members: Member[];
  primaryLocale: 'en' | 'tl' | 'hil';
  canEdit: boolean;
  canApprove: boolean;
};

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function speakerSelectValue(seg: TranscriptSegment): string {
  if (seg.speakerId) return seg.speakerId;
  if (seg.speakerLabel === 'Unknown') return SPEAKER_UNKNOWN;
  if (seg.speakerLabel === 'Multiple') return SPEAKER_MULTIPLE;
  return SPEAKER_NONE;
}

function decodeSpeakerSelect(value: string): {
  speakerId: string | null;
  speakerLabel: string | null;
} {
  if (value === SPEAKER_UNKNOWN) return { speakerId: null, speakerLabel: 'Unknown' };
  if (value === SPEAKER_MULTIPLE) return { speakerId: null, speakerLabel: 'Multiple' };
  if (value === SPEAKER_NONE) return { speakerId: null, speakerLabel: null };
  return { speakerId: value, speakerLabel: null };
}

type SegmentPatch = Partial<
  Pick<TranscriptSegment, 'text' | 'speakerId' | 'speakerLabel' | 'flag' | 'locale'>
> & { id: string };

export function TranscriptReview({
  transcriptId,
  meetingId,
  status,
  segments,
  members,
  primaryLocale,
  canEdit,
  canApprove,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSpeaker, setBulkSpeaker] = useState<string>(SPEAKER_NONE);

  const [optimisticSegments, applyOptimistic] = useOptimistic(
    segments,
    (state: TranscriptSegment[], patch: SegmentPatch) =>
      state.map((s) => (s.id === patch.id ? { ...s, ...patch } : s)),
  );

  const memberLookup = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const isApproved = status === 'approved';
  const isLocked = isApproved || !canEdit;

  function commitPatch(seg: TranscriptSegment, patch: SegmentPatch) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(patch);
      const result = await updateTranscriptSegment({
        segmentId: seg.id,
        text: patch.text ?? seg.text,
        speakerId: patch.speakerId !== undefined ? patch.speakerId : (seg.speakerId ?? null),
        speakerLabel:
          patch.speakerLabel !== undefined
            ? (patch.speakerLabel ?? undefined)
            : (seg.speakerLabel ?? undefined),
        locale: (patch.locale ?? seg.locale) as 'en' | 'tl' | 'hil',
        flag: patch.flag !== undefined ? patch.flag : seg.flag,
      });
      if (!result.ok) {
        setError(result.error);
      }
      router.refresh();
    });
  }

  function handleTextBlur(seg: TranscriptSegment, ev: React.FocusEvent<HTMLTextAreaElement>) {
    const next = ev.target.value;
    if (next === seg.text) return;
    commitPatch(seg, { id: seg.id, text: next });
  }

  function handleSpeakerChange(seg: TranscriptSegment, ev: React.ChangeEvent<HTMLSelectElement>) {
    const decoded = decodeSpeakerSelect(ev.target.value);
    commitPatch(seg, { id: seg.id, ...decoded });
  }

  function handleFlagChange(seg: TranscriptSegment, ev: React.ChangeEvent<HTMLSelectElement>) {
    const value = ev.target.value;
    const flag = value === '' ? null : (value as TranscriptSegment['flag']);
    commitPatch(seg, { id: seg.id, flag });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkSpeaker(SPEAKER_NONE);
  }

  function handleBulkAssign() {
    if (selected.size === 0 || bulkSpeaker === SPEAKER_NONE) return;
    setError(null);
    const decoded = decodeSpeakerSelect(bulkSpeaker);
    const ids = Array.from(selected);
    startTransition(async () => {
      // Optimistic: apply patch to every selected segment.
      for (const id of ids) {
        applyOptimistic({ id, speakerId: decoded.speakerId, speakerLabel: decoded.speakerLabel });
      }
      const result = await batchAssignSpeaker({
        transcriptId,
        segmentIds: ids,
        speakerId: decoded.speakerId,
        speakerLabel: decoded.speakerLabel,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        clearSelection();
      }
      router.refresh();
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveTranscript({ transcriptId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUnapprove() {
    setError(null);
    startTransition(async () => {
      const result = await unapproveTranscript({ transcriptId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleGenerateMinutes() {
    setError(null);
    startTransition(async () => {
      const result = await generateMinutes({ meetingId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/meetings/${meetingId}/minutes`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status + actions banner */}
      <div className="border-ink/15 flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'in_review' && <Badge variant="warn">In review</Badge>}
          {status === 'approved' && <Badge variant="success">Approved</Badge>}
          {status === 'awaiting_asr' && <Badge variant="outline">Awaiting ASR</Badge>}
          {status === 'asr_failed' && <Badge variant="destructive">ASR failed</Badge>}
          {status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
          <span className="text-ink-faint font-mono text-[11px]">
            {optimisticSegments.length} segment{optimisticSegments.length === 1 ? '' : 's'}
          </span>
          {isPending && (
            <span className="text-ink-faint font-mono text-[11px] italic">Saving…</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && status === 'in_review' && (
            <Button type="button" size="sm" disabled={isPending} onClick={handleApprove}>
              <CheckCircle2 />
              Approve transcript
            </Button>
          )}
          {canApprove && status === 'approved' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleUnapprove}
            >
              <RotateCcw />
              Mark draft
            </Button>
          )}
          {canApprove && status === 'approved' && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleGenerateMinutes}
              className="font-medium"
            >
              <Save />
              {isPending ? 'Generating… (30-90s)' : 'Generate minutes'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}

      {/* Bulk assign toolbar — only when items are checked */}
      {!isLocked && selected.size > 0 && (
        <div className="border-rust/40 bg-rust/5 sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border p-3">
          <Users className="text-rust size-4" aria-hidden="true" />
          <span className="text-ink text-sm font-medium">{selected.size} selected</span>
          <FieldSelect
            value={bulkSpeaker}
            onChange={(e) => setBulkSpeaker(e.target.value)}
            className="h-8 max-w-xs"
          >
            <option value={SPEAKER_NONE}>Pick a speaker…</option>
            <option value={SPEAKER_UNKNOWN}>Unknown</option>
            <option value={SPEAKER_MULTIPLE}>Multiple</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.honorific} {m.fullName}
              </option>
            ))}
          </FieldSelect>
          <Button
            type="button"
            size="sm"
            disabled={isPending || bulkSpeaker === SPEAKER_NONE}
            onClick={handleBulkAssign}
          >
            Assign
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Segments list */}
      {optimisticSegments.length === 0 ? (
        <p className="text-ink-faint border-ink/15 rounded-md border border-dashed p-8 text-center font-mono text-xs italic">
          No segments. The transcription pipeline produced an empty transcript.
        </p>
      ) : (
        <ol className="border-ink/15 flex flex-col divide-y divide-dashed divide-[rgb(0_0_0_/_0.1)] rounded-md border">
          {optimisticSegments.map((seg) => {
            const speakerVal = speakerSelectValue(seg);
            const member = seg.speakerId ? memberLookup.get(seg.speakerId) : null;
            const isSelected = selected.has(seg.id);
            return (
              <li
                key={seg.id}
                className={cn(
                  'grid grid-cols-[auto_120px_1fr_140px] items-start gap-3 p-3 transition-colors',
                  isSelected && 'bg-rust/5',
                )}
              >
                <div className="flex h-full flex-col items-center gap-2 pt-1">
                  {!isLocked && (
                    <input
                      type="checkbox"
                      aria-label={`Select segment ${formatTimestamp(seg.startMs)}`}
                      className="accent-rust size-4"
                      checked={isSelected}
                      onChange={() => toggleSelected(seg.id)}
                    />
                  )}
                  <time
                    dateTime={`PT${Math.floor(seg.startMs / 1000)}S`}
                    className="text-ink-faint font-mono text-[10px] tabular-nums"
                  >
                    {formatTimestamp(seg.startMs)}
                  </time>
                </div>

                <Field label="Speaker" hint={member ? member.fullName : undefined}>
                  <FieldSelect
                    value={speakerVal}
                    disabled={isLocked}
                    onChange={(e) => handleSpeakerChange(seg, e)}
                    className="h-8"
                  >
                    <option value={SPEAKER_NONE}>—</option>
                    <option value={SPEAKER_UNKNOWN}>Unknown</option>
                    <option value={SPEAKER_MULTIPLE}>Multiple</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.honorific} {m.fullName}
                      </option>
                    ))}
                  </FieldSelect>
                </Field>

                <textarea
                  defaultValue={seg.text}
                  onBlur={(e) => handleTextBlur(seg, e)}
                  disabled={isLocked}
                  rows={Math.max(2, Math.min(6, Math.ceil(seg.text.length / 80)))}
                  className="border-ink/20 bg-paper text-ink focus-visible:border-rust focus-visible:ring-rust/40 disabled:bg-paper-2/40 mt-5 w-full resize-y rounded-md border px-3 py-2 text-sm leading-relaxed transition-colors outline-none focus-visible:ring-2"
                  aria-label="Segment text"
                />

                <Field label="Flag">
                  <FieldSelect
                    value={seg.flag ?? ''}
                    disabled={isLocked}
                    onChange={(e) => handleFlagChange(seg, e)}
                    className="h-8"
                  >
                    <option value="">—</option>
                    {TRANSCRIPT_SEGMENT_FLAGS.map((f) => (
                      <option key={f} value={f}>
                        {FLAG_LABELS[f]}
                      </option>
                    ))}
                  </FieldSelect>
                </Field>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-ink-faint mt-2 font-mono text-[10px] italic">
        Edits auto-save on blur. Primary locale: {primaryLocale}. Meeting ID: {meetingId}.
      </p>
    </div>
  );
}
