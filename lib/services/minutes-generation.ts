import 'server-only';

import OpenAI from 'openai';

import { env } from '@/env';
import type { MinutesItemOfBusiness } from '@/lib/db/schema/meeting-minutes';

/**
 * Minutes-of-the-meeting generation pipeline.
 *
 * Reads the approved transcript_segments + meeting metadata, calls OpenAI
 * gpt-4o with response_format={ type: 'json_schema', strict: true } to
 * enforce a structured output following Local Government Code §§52-54 +
 * DILG SB minutes format. Returns the shape that meeting_minutes.* columns
 * and meeting_minutes.items_of_business jsonb expect.
 */

const MINUTES_MODEL = 'gpt-4o';
const GPT4O_INPUT_USD_PER_MTOK = 2.5;
const GPT4O_OUTPUT_USD_PER_MTOK = 10;

export type MinutesGenSegment = {
  startMs: number;
  endMs: number;
  speakerName: string | null;
  text: string;
};

export type MinutesGenContext = {
  meetingTitle: string;
  meetingType: string;
  meetingDate: string; // ISO
  scheduledLocation: string;
  primaryLocale: string;
  presiderName: string | null;
  segments: MinutesGenSegment[];
  /**
   * Active SB members the generator should know about for member-name
   * recognition. The generator returns names as text; the orchestrator
   * resolves IDs via name normalisation post-hoc.
   */
  members: Array<{ id: string; honorific: string; fullName: string }>;
};

export type GenerateMinutesResult = {
  coverHeader: string;
  attendeesText: string;
  itemsOfBusiness: MinutesItemOfBusiness[];
  adjournmentSummary: string;
  costUsd: number;
  modelVersion: string;
};

function getOpenAI(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Configure it in .env or Vercel.');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

/**
 * Strict JSON schema for gpt-4o structured outputs. With strict=true the
 * SDK requires every property to appear in `required` and additionalProperties
 * to be false at every nesting level.
 */
const MINUTES_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    coverHeader: {
      type: 'string',
      description:
        '2–3 lines: meeting type + sequence number, day of the week + date, time called to order, location, presiding officer.',
    },
    attendeesText: {
      type: 'string',
      description:
        'Free-text roster summarising members present, absent (with reason if stated), excused, late arrivals. Extract from quorum statements in the transcript.',
    },
    itemsOfBusiness: {
      type: 'array',
      description: 'One entry per agenda item or formal motion, in the order they were taken up.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          topic: {
            type: 'string',
            description:
              'Short title for the item (e.g. "Tricycle franchising ordinance, second reading").',
          },
          motionText: {
            type: ['string', 'null'],
            description: 'The motion as moved, verbatim from the transcript when possible.',
          },
          motionedByName: {
            type: ['string', 'null'],
            description:
              'Full name of the SB member who moved (e.g. "Hon. Maria dela Cruz"), or null if not identified.',
          },
          secondedByName: {
            type: ['string', 'null'],
            description: 'Full name of the seconder, or null if not identified.',
          },
          discussionSummary: {
            type: 'string',
            description: '1–3 sentences summarising substantive discussion.',
          },
          disposition: {
            type: 'string',
            enum: ['carried', 'denied', 'tabled', 'withdrawn', 'noted'],
          },
          voteSummary: {
            type: ['string', 'null'],
            description: 'Vote tally if recorded ("Yea 12 / Nay 1 / Abstain 1"), null otherwise.',
          },
        },
        required: [
          'topic',
          'motionText',
          'motionedByName',
          'secondedByName',
          'discussionSummary',
          'disposition',
          'voteSummary',
        ],
      },
    },
    adjournmentSummary: {
      type: 'string',
      description: '1–2 lines covering adjournment time and any final notes.',
    },
  },
  required: ['coverHeader', 'attendeesText', 'itemsOfBusiness', 'adjournmentSummary'],
} as const;

const MINUTES_SYSTEM_PROMPT = `You are drafting the official minutes of a Sangguniang Bayan (Philippine municipal council) session in Lambunao, Iloilo. The minutes follow Local Government Code §§52–54 and the DILG SB minutes format.

INPUT: a complete transcript with timestamps + speaker names + meeting metadata.

OUTPUT: a structured JSON object matching the provided schema.

VOICE & FORMAT RULES:
- Use formal, third-person voice ("The Chair recognized…", "The body resolved…", "On motion of Hon. X, seconded by Hon. Y…").
- Preserve names with honorifics (Hon., Vice Mayor, Mayor) exactly as they appear in the transcript.
- Keep quotes brief and only when consequential.
- Sentences should be tight — minutes are a record, not a narrative.

FACTUAL RULES (NON-NEGOTIABLE):
- Do NOT invent motions, votes, attendance facts, or names not present in the transcript.
- If an item is on the agenda but the transcript shows no discussion or motion, still include it under itemsOfBusiness with disposition='noted' and a brief discussionSummary explaining the body deferred or skipped it.
- If a motion has no recorded mover or seconder in the transcript, set the *Name field to null. Do not guess.
- If no quorum statement appears in the transcript, set attendeesText to "Roll call not transcribed." rather than fabricating attendance.
- For voteSummary, copy the tally only when the transcript clearly states one.

LOCALE:
- Predominantly English with Tagalog/Hiligaynon code-switching is expected. Output the minutes in English (the canonical archival language for SB minutes), but preserve any direct quote in its original language and add a brief gloss when needed.`;

function buildUserPrompt(ctx: MinutesGenContext): string {
  const { segments, members, ...meta } = ctx;
  const memberRoster = members.map((m) => `${m.honorific} ${m.fullName}`).join(', ');

  // Compact transcript representation: [HH:MM:SS] Speaker — text
  // Avoids per-segment JSON overhead while keeping speaker context.
  const transcriptLines = segments
    .map((s) => {
      const totalSec = Math.floor(s.startMs / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      const speaker = s.speakerName ?? '(unattributed)';
      return `[${h}:${m}:${sec}] ${speaker} — ${s.text}`;
    })
    .join('\n');

  return `MEETING METADATA:
- Title: ${meta.meetingTitle}
- Type: ${meta.meetingType}
- Date: ${meta.meetingDate}
- Location: ${meta.scheduledLocation}
- Presider: ${meta.presiderName ?? '(not set)'}
- Primary locale: ${meta.primaryLocale}

KNOWN SB ROSTER (use these full names verbatim when an utterance is attributable to one of them):
${memberRoster}

TRANSCRIPT:
${transcriptLines}`;
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(hon\.?|honorable|vice\s*mayor|mayor)\s+/i, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveMemberId(
  name: string | null,
  members: Array<{ id: string; honorific: string; fullName: string }>,
): string | null {
  if (!name) return null;
  const norm = normalizeName(name);
  if (!norm) return null;
  const match = members.find((m) => normalizeName(m.fullName) === norm);
  return match?.id ?? null;
}

export async function generateMinutesFromTranscript(
  ctx: MinutesGenContext,
): Promise<GenerateMinutesResult> {
  const client = getOpenAI();

  const completion = await client.chat.completions.create({
    model: MINUTES_MODEL,
    messages: [
      { role: 'system', content: MINUTES_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(ctx) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'sb_minutes',
        strict: true,
        // OpenAI SDK accepts a plain object; the const-assertion above
        // makes TS narrow the literal but the runtime type is loose.
        schema: MINUTES_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    temperature: 0.2,
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error('Minutes generation returned empty content.');
  }

  let parsed: {
    coverHeader: string;
    attendeesText: string;
    itemsOfBusiness: Array<{
      topic: string;
      motionText: string | null;
      motionedByName: string | null;
      secondedByName: string | null;
      discussionSummary: string;
      disposition: 'carried' | 'denied' | 'tabled' | 'withdrawn' | 'noted';
      voteSummary: string | null;
    }>;
    adjournmentSummary: string;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Minutes generation returned non-JSON content.');
  }

  // Resolve member names → FK ids. Names that don't match stay null and
  // surface in the review UI for Secretary to fix manually.
  const items: MinutesItemOfBusiness[] = parsed.itemsOfBusiness.map((it, i) => ({
    id: crypto.randomUUID(),
    order: i + 1,
    topic: it.topic,
    motionText: it.motionText,
    motionedByName: it.motionedByName,
    motionedById: resolveMemberId(it.motionedByName, ctx.members),
    secondedByName: it.secondedByName,
    secondedById: resolveMemberId(it.secondedByName, ctx.members),
    discussionSummary: it.discussionSummary,
    disposition: it.disposition,
    voteSummary: it.voteSummary,
  }));

  const usage = completion.usage;
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const costUsd =
    (inputTokens / 1_000_000) * GPT4O_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * GPT4O_OUTPUT_USD_PER_MTOK;

  return {
    coverHeader: parsed.coverHeader,
    attendeesText: parsed.attendeesText,
    itemsOfBusiness: items,
    adjournmentSummary: parsed.adjournmentSummary,
    costUsd,
    modelVersion: MINUTES_MODEL,
  };
}
