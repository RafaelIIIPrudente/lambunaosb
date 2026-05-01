import 'server-only';

import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';

import { requireUser } from '@/lib/auth/require-user';
import { db } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/db/queries/tenant';
import {
  meetingMinutes,
  meetings,
  type MinutesItemOfBusiness,
  profiles,
  sbMembers,
} from '@/lib/db/schema';
import {
  type MinutesStatusValue,
  MINUTES_DISPOSITION_LABELS,
  MINUTES_STATUS_LABELS,
} from '@/lib/validators/minutes';

export const metadata = { title: 'Minutes — print view' };

const PRINT_STYLES = `
  :root {
    --serif: Georgia, 'Times New Roman', Times, serif;
    --mono: 'SFMono-Regular', Menlo, Consolas, monospace;
    --ink: #1a1a1a;
    --soft: #444;
    --faint: #6a6a6a;
    --rule: #c8c8c8;
  }
  body.print-body {
    background: #fff !important;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 12pt;
    line-height: 1.5;
    padding: 24pt 32pt !important;
    display: block !important;
  }
  .print-header {
    text-align: center;
    margin-bottom: 24pt;
    padding-bottom: 16pt;
    border-bottom: 1pt solid var(--rule);
  }
  .print-header .eyebrow {
    font-family: var(--mono);
    font-size: 9pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--faint);
    margin: 0 0 6pt 0;
  }
  .print-header h1 { font-size: 22pt; font-weight: 700; margin: 0; }
  .print-header .meta {
    font-size: 11pt;
    color: var(--soft);
    margin-top: 6pt;
    font-style: italic;
  }
  .print-header .lede {
    margin-top: 10pt;
    white-space: pre-line;
    color: var(--ink);
  }
  .print-section { margin: 18pt 0; page-break-inside: avoid; }
  .print-section h2 {
    font-size: 13pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 8pt 0;
    padding-bottom: 4pt;
    border-bottom: 0.5pt solid var(--rule);
  }
  .print-section h3 { font-size: 12pt; font-weight: 600; margin: 12pt 0 4pt 0; }
  .print-section p { margin: 4pt 0; white-space: pre-line; }
  .print-quote {
    margin: 6pt 0 6pt 16pt;
    padding-left: 10pt;
    border-left: 2pt solid var(--rule);
    font-style: italic;
  }
  .print-disposition {
    font-family: var(--mono);
    font-size: 9pt;
    color: var(--soft);
    margin-top: 4pt;
  }
  .print-disposition strong {
    color: var(--ink);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .print-signatures {
    margin-top: 36pt;
    padding-top: 16pt;
    border-top: 1pt solid var(--rule);
    page-break-inside: avoid;
  }
  .print-sig-row {
    display: flex;
    justify-content: space-between;
    margin-top: 30pt;
    gap: 60pt;
  }
  .print-sig { flex: 1; text-align: center; }
  .print-sig .line { border-top: 0.5pt solid var(--ink); margin-bottom: 4pt; }
  .print-sig .name { font-weight: 600; font-size: 11pt; }
  .print-sig .role {
    font-family: var(--mono);
    font-size: 9pt;
    color: var(--faint);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 2pt;
  }
  .print-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 90pt;
    color: rgba(193, 74, 42, 0.08);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: none;
    z-index: 0;
    font-weight: 700;
  }
  @media print {
    body.print-body { padding: 18mm 18mm !important; font-size: 11pt; }
  }
`;

export default async function MinutesPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const tenantId = await getCurrentTenantId();

  const [row] = await db
    .select({
      minutes: meetingMinutes,
      meeting: meetings,
      presiderHonorific: sbMembers.honorific,
      presiderFullName: sbMembers.fullName,
    })
    .from(meetingMinutes)
    .innerJoin(meetings, eq(meetings.id, meetingMinutes.meetingId))
    .leftJoin(sbMembers, eq(sbMembers.id, meetings.presiderId))
    .where(
      and(
        eq(meetingMinutes.tenantId, tenantId),
        eq(meetingMinutes.meetingId, id),
        isNull(meetingMinutes.deletedAt),
      ),
    )
    .limit(1);
  if (!row) notFound();

  const items = row.minutes.itemsOfBusiness as MinutesItemOfBusiness[];

  let attestedByName: string | null = null;
  if (row.minutes.attestedById) {
    const [att] = await db
      .select({ fullName: profiles.fullName, honorific: profiles.honorific })
      .from(profiles)
      .where(eq(profiles.id, row.minutes.attestedById))
      .limit(1);
    if (att) attestedByName = `${att.honorific ?? 'Hon.'} ${att.fullName}`;
  }

  const presiderName = row.presiderFullName
    ? `${row.presiderHonorific ?? 'Hon.'} ${row.presiderFullName}`
    : null;

  // Promote our element class onto <body> via a side-effect script so the
  // root layout's body styling doesn't fight the print layout. This runs
  // immediately at SSR (no JS); the inline <script> is server-rendered.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <script
        dangerouslySetInnerHTML={{
          __html: 'document.body.classList.add("print-body");',
        }}
      />

      {row.minutes.status !== 'published' && (
        <div className="print-watermark" aria-hidden="true">
          {MINUTES_STATUS_LABELS[row.minutes.status as MinutesStatusValue]}
        </div>
      )}

      <header className="print-header">
        <p className="eyebrow">Sangguniang Bayan ng Lambunao · Iloilo</p>
        <h1>{row.meeting.title}</h1>
        <p className="meta">
          {row.meeting.type.replace(/_/g, ' ')} session ·{' '}
          {format(row.meeting.scheduledAt, 'EEEE, MMMM d, yyyy')} · {row.meeting.location}
        </p>
        {row.minutes.coverHeader.trim().length > 0 && (
          <p className="lede">{row.minutes.coverHeader.trim()}</p>
        )}
      </header>

      <section className="print-section">
        <h2>Attendance</h2>
        <p>{row.minutes.attendeesText.trim() || 'Roll call not transcribed.'}</p>
      </section>

      <section className="print-section">
        <h2>Items of Business</h2>
        {items.length === 0 ? (
          <p>
            <em>No items of business were taken up.</em>
          </p>
        ) : (
          items.map((item, i) => (
            <div key={item.id} style={{ marginBottom: '12pt' }}>
              <h3>
                {i + 1}. {item.topic}
              </h3>
              {item.motionText && (
                <>
                  <p>
                    On motion of {item.motionedByName ?? '(unattributed)'}
                    {item.secondedByName ? `, seconded by ${item.secondedByName}` : ''}:
                  </p>
                  <p className="print-quote">{item.motionText.trim()}</p>
                </>
              )}
              {item.discussionSummary.trim().length > 0 && <p>{item.discussionSummary.trim()}</p>}
              <p className="print-disposition">
                <strong>Disposition:</strong> {MINUTES_DISPOSITION_LABELS[item.disposition]}
                {item.voteSummary ? ` · ${item.voteSummary.trim()}` : ''}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="print-section">
        <h2>Adjournment</h2>
        <p>{row.minutes.adjournmentSummary.trim() || 'Adjournment time not recorded.'}</p>
      </section>

      <footer className="print-signatures">
        <div className="print-sig-row">
          <div className="print-sig">
            <div className="line" />
            <div className="name">
              {row.minutes.publishedAt
                ? '(Drafted by the Office of the Secretary)'
                : 'Draft — pending attestation'}
            </div>
            <div className="role">Secretary to the Sanggunian</div>
          </div>
          <div className="print-sig">
            <div className="line" />
            <div className="name">{attestedByName ?? presiderName ?? '(Pending)'}</div>
            <div className="role">Presiding Officer</div>
          </div>
        </div>
      </footer>
    </>
  );
}
