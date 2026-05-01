import 'server-only';

import OpenAI, { toFile } from 'openai';

import { env } from '@/env';

/**
 * Audio transcription pipeline. Two stages, single vendor (OpenAI):
 *   1. transcribeChunk — OpenAI Whisper (whisper-1) per chunk.
 *   2. cleanupHiligaynon — optional gpt-4o pass that corrects HIL/TL/EN
 *      code-switching while preserving segment boundaries strictly.
 */

const WHISPER_MODEL = 'whisper-1';
const CLEANUP_MODEL = 'gpt-4o';

// OpenAI pricing (subject to change — pin here for cost-telemetry stability).
const WHISPER_USD_PER_MINUTE = 0.006;
const GPT4O_INPUT_USD_PER_MTOK = 2.5;
const GPT4O_OUTPUT_USD_PER_MTOK = 10;

export type WhisperSegment = {
  start: number; // seconds, relative to chunk start
  end: number; // seconds, relative to chunk start
  text: string;
  confidence?: number;
};

export type TranscribeChunkResult = {
  segments: WhisperSegment[];
  durationSeconds: number;
  costUsd: number;
  modelVersion: string;
};

export type CleanupHiligaynonResult = {
  segments: WhisperSegment[]; // same count, same boundaries, cleaned text
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
 * Whisper -> verbose JSON segments for one chunk.
 *
 * `language` is an ISO 639-1 code or undefined for auto-detect. For Hiligaynon
 * sessions we omit the hint (Whisper has no HIL support; auto-detect produces
 * romanized output that the cleanup pass repairs). For 'tl' / 'en' we pass
 * through.
 */
export async function transcribeChunk(
  audioBlob: Blob,
  opts?: { language?: string; filename?: string },
): Promise<TranscribeChunkResult> {
  const client = getOpenAI();
  const filename = opts?.filename ?? 'chunk.webm';
  const file = await toFile(audioBlob, filename);

  // Whisper accepts 'en', 'tl' (Tagalog), etc. — but not 'hil' (Hiligaynon
  // is unsupported). Skip the hint for HIL and rely on auto-detect.
  const language = opts?.language && opts.language !== 'hil' ? opts.language : undefined;

  const response = (await client.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    stream: false,
    ...(language ? { language } : {}),
  })) as unknown as {
    text: string;
    duration?: number;
    segments?: Array<{
      id?: number;
      start: number;
      end: number;
      text: string;
      avg_logprob?: number;
      no_speech_prob?: number;
    }>;
  };

  const durationSeconds = response.duration ?? 0;
  const segments: WhisperSegment[] = (response.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
    // Whisper exposes log-prob, not 0-1 confidence. Map: exp(avg_logprob)
    // approximates per-token confidence; clamp to [0, 1].
    confidence:
      typeof s.avg_logprob === 'number'
        ? Math.max(0, Math.min(1, Math.exp(s.avg_logprob)))
        : undefined,
  }));

  // Fallback: if Whisper returned no segments (rare for short audio), wrap the
  // top-level text as a single segment spanning the full duration.
  if (segments.length === 0 && response.text) {
    segments.push({
      start: 0,
      end: durationSeconds,
      text: response.text.trim(),
    });
  }

  const costUsd = (durationSeconds / 60) * WHISPER_USD_PER_MINUTE;

  return {
    segments,
    durationSeconds,
    costUsd,
    modelVersion: WHISPER_MODEL,
  };
}

const CLEANUP_SYSTEM_PROMPT = `You are correcting an automatic-speech-recognition transcript from a Sangguniang Bayan (Philippine municipal council) session in Lambunao, Iloilo. Speakers code-switch between English, Tagalog, and Hiligaynon (Ilonggo). Whisper produces strong English/Tagalog output but mistranscribes Hiligaynon as English-sounding nonsense.

Your job: return the same array of segments with corrected \`text\` for each segment.

NON-NEGOTIABLE RULES:
1. Return EXACTLY the same number of segments, in the same order.
2. Do NOT change start/end timestamps — copy them through verbatim.
3. Edit only the \`text\` field. Fix Hiligaynon mistranscriptions, restore proper noun capitalisation (Hon., Brgy., RA, Sangguniang, Bayan, etc.), normalise whitespace.
4. If a segment looks correct, copy it through unchanged.
5. Do NOT translate — keep the original language. If a Hiligaynon phrase is genuinely unclear, mark it [unclear: original-text] but keep the segment.
6. Do NOT merge or split segments. Do NOT invent content.
7. Output MUST be valid JSON matching the requested schema.`;

/**
 * Cleanup pass via gpt-4o. Sends all Whisper segments at once, requests
 * structured JSON output preserving segment boundaries strictly.
 */
export async function cleanupHiligaynon(
  segments: WhisperSegment[],
): Promise<CleanupHiligaynonResult> {
  if (segments.length === 0) {
    return { segments: [], costUsd: 0, modelVersion: CLEANUP_MODEL };
  }

  const client = getOpenAI();
  const userPayload = {
    segments: segments.map((s, i) => ({
      index: i,
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };

  const completion = await client.chat.completions.create({
    model: CLEANUP_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Return JSON of shape {"segments": [{"index": int, "start": number, "end": number, "text": string}, ...]}. Input:\n\n${JSON.stringify(userPayload)}`,
      },
    ],
    temperature: 0.1,
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error('Cleanup pass returned empty content.');
  }

  let parsed: { segments?: Array<{ index?: number; start?: number; end?: number; text?: string }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Cleanup pass returned non-JSON content.');
  }

  if (!parsed.segments || !Array.isArray(parsed.segments)) {
    throw new Error('Cleanup pass JSON missing `segments` array.');
  }
  if (parsed.segments.length !== segments.length) {
    throw new Error(
      `Cleanup pass returned ${parsed.segments.length} segments; expected ${segments.length}.`,
    );
  }

  // Rebuild segments preserving original timestamps; only adopt the cleaned text.
  const cleaned: WhisperSegment[] = segments.map((original, i) => {
    const cleanedSeg = parsed.segments![i];
    const text = typeof cleanedSeg?.text === 'string' ? cleanedSeg.text.trim() : original.text;
    return {
      start: original.start,
      end: original.end,
      text: text || original.text,
      confidence: original.confidence,
    };
  });

  const usage = completion.usage;
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const costUsd =
    (inputTokens / 1_000_000) * GPT4O_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * GPT4O_OUTPUT_USD_PER_MTOK;

  return {
    segments: cleaned,
    costUsd,
    modelVersion: CLEANUP_MODEL,
  };
}
