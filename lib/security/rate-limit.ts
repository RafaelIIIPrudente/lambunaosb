import 'server-only';

// Minimal in-memory sliding-window rate limiter for sign-up + password-reset
// surfaces. Per-process state — works on a single Vercel function instance,
// breaks down across cold starts and multiple regions.
//
// REPLACE WITH UPSTASH FOR PRODUCTION. The proper wiring is:
//   import { Ratelimit } from '@upstash/ratelimit';
//   import { Redis } from '@upstash/redis';
//   const rl = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(3, '15 m') });
//   const { success } = await rl.limit(key);
// Then add KV_REST_API_URL + KV_REST_API_TOKEN to env.ts and Vercel.

type Bucket = { hits: number[] }; // unix-ms timestamps

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { success: boolean; remaining: number; reset: number };

/**
 * Check whether `key` is under the limit of `max` hits in the past `windowMs`.
 * Records the hit if successful. Fail-OPEN on internal errors so a broken
 * limiter doesn't block legitimate traffic — Turnstile is the primary gate.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0] ?? now;
    return { success: false, remaining: 0, reset: oldest + windowMs };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { success: true, remaining: max - bucket.hits.length, reset: now + windowMs };
}

export const SIGNUP_PER_IP = { max: 3, windowMs: 15 * 60 * 1000 };
export const SIGNUP_PER_EMAIL = { max: 1, windowMs: 30 * 60 * 1000 };
export const PASSWORD_RESET_PER_EMAIL = { max: 3, windowMs: 30 * 60 * 1000 };
