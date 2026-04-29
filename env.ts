import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().url(),

    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Dev-only escape hatch: when false, middleware skips auth checks and the
    // admin layout skips requireUser() so the UI is browsable before Supabase
    // is wired. Defaults to true (production-safe).
    AUTH_ENABLED: z.coerce.boolean().default(true),

    // Dev-only data source switch: when true, every lib/db/queries/* function
    // returns hand-curated fixtures instead of hitting Drizzle. Pair with
    // AUTH_ENABLED=false so the public + admin UI is fully browsable before
    // Supabase exists. Defaults to false (production-safe — real DB).
    MOCK_DATA: z.coerce.boolean().default(false),

    // Cloudflare Turnstile secret. Optional — when unset the verify helper
    // returns true (dev / pre-Turnstile mode).
    CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

    // Resend API key. Optional — actions skip the send call when unset.
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.string().url(),

    // Cloudflare Turnstile public sitekey. Optional in dev.
    NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AUTH_ENABLED: process.env.AUTH_ENABLED,
    MOCK_DATA: process.env.MOCK_DATA,
    CLOUDFLARE_TURNSTILE_SECRET_KEY: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
  },
  emptyStringAsUndefined: true,
});
