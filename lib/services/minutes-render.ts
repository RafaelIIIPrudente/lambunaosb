import 'server-only';

import { format } from 'date-fns';

import type { MinutesItemOfBusiness } from '@/lib/db/schema/meeting-minutes';
import { MINUTES_DISPOSITION_LABELS } from '@/lib/validators/minutes';

export type MinutesRenderInput = {
  meetingTitle: string;
  meetingType: string;
  meetingDate: Date;
  location: string;
  presiderName: string | null;
  attestedByName: string | null;
  publishedAt: Date;
  coverHeader: string;
  attendeesText: string;
  itemsOfBusiness: MinutesItemOfBusiness[];
  adjournmentSummary: string;
};

/**
 * Serialise structured meeting_minutes into a Markdown body for the public
 * news post. The news pipeline already renders Markdown via next-mdx-remote.
 *
 * Section order follows DILG SB minutes: cover header → attendees → items
 * of business → adjournment → signature block.
 */
export function renderMinutesToMarkdown(input: MinutesRenderInput): string {
  const lines: string[] = [];

  lines.push(`# Minutes — ${input.meetingTitle}`);
  lines.push('');
  lines.push(
    `*${input.meetingType} session · ${format(input.meetingDate, 'EEEE, MMMM d, yyyy')} · ${input.location}*`,
  );
  lines.push('');

  if (input.coverHeader.trim().length > 0) {
    lines.push(input.coverHeader.trim());
    lines.push('');
  }

  lines.push('## Attendance');
  lines.push('');
  lines.push(input.attendeesText.trim() || '_Roll call not transcribed._');
  lines.push('');

  lines.push('## Items of Business');
  lines.push('');
  if (input.itemsOfBusiness.length === 0) {
    lines.push('_No items of business were taken up._');
    lines.push('');
  } else {
    input.itemsOfBusiness.forEach((item, i) => {
      lines.push(`### ${i + 1}. ${item.topic}`);
      lines.push('');
      if (item.motionText) {
        const mover = item.motionedByName ?? '(unattributed)';
        const seconder = item.secondedByName ?? null;
        const onMotion = seconder
          ? `On motion of ${mover}, seconded by ${seconder}:`
          : `On motion of ${mover}:`;
        lines.push(onMotion);
        lines.push('');
        lines.push(`> ${item.motionText.trim()}`);
        lines.push('');
      }
      if (item.discussionSummary.trim().length > 0) {
        lines.push(item.discussionSummary.trim());
        lines.push('');
      }
      const dispositionLabel = MINUTES_DISPOSITION_LABELS[item.disposition];
      const voteLine = item.voteSummary
        ? `**Disposition:** ${dispositionLabel} · _${item.voteSummary.trim()}_`
        : `**Disposition:** ${dispositionLabel}`;
      lines.push(voteLine);
      lines.push('');
    });
  }

  lines.push('## Adjournment');
  lines.push('');
  lines.push(input.adjournmentSummary.trim() || '_Adjournment time not recorded._');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**Attested:**');
  lines.push('');
  if (input.presiderName) {
    lines.push(`Presiding Officer · ${input.presiderName}`);
  }
  if (input.attestedByName && input.attestedByName !== input.presiderName) {
    lines.push('');
    lines.push(`Attested by · ${input.attestedByName}`);
  }
  lines.push('');
  lines.push(`*Published ${format(input.publishedAt, 'MMMM d, yyyy')}*`);

  return lines.join('\n');
}

/**
 * Slug derived from meeting metadata. Stable across edits — only the
 * meeting type/date/sequence drive it. Uniqueness within tenant is enforced
 * at insert time by news_posts.slug check.
 */
export function deriveMinutesSlug(args: {
  meetingType: string;
  scheduledAt: Date;
  sequenceNumber: number;
}): string {
  const datePart = format(args.scheduledAt, 'yyyy-MM-dd');
  return `minutes-${datePart}-${args.meetingType}-${args.sequenceNumber}`;
}
