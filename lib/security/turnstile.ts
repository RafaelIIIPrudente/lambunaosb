import 'server-only';

import { env } from '@/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns `true` when the secret env var is unset (dev / pre-Turnstile).
 * Returns `false` on any verification failure or network error (fail-closed).
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<boolean> {
  if (!env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
    return true;
  }

  if (!token || token.length === 0) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (ip) body.append('remoteip', ip);

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) return false;
    const data = (await response.json()) as SiteverifyResponse;
    return Boolean(data.success);
  } catch {
    return false;
  }
}
