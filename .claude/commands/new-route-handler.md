---
description: Create app/api/<name>/route.ts for webhooks, OAuth, or AI streaming
argument-hint: <name> [webhook|oauth|ai-stream|generic]
---

The user wants a route handler at `app/api/<name>/route.ts`. Spec: `$ARGUMENTS`.

Determine the handler type. If unspecified, ask.

**webhook** (Stripe, Resend, etc.):

- Method: `POST`
- Read raw body via `await req.text()` for signature verification
- Verify the signature using the appropriate SDK (e.g., `stripe.webhooks.constructEvent`) BEFORE processing
- Return 200 quickly; offload heavy work to Inngest if the handler must do more than persist
- Example: `app/api/webhooks/stripe/route.ts`

**oauth** (third-party callback):

- Method: `GET`
- Read query params from `req.nextUrl.searchParams`
- Exchange code for tokens server-side; never expose client secrets
- Redirect to a client route on success; redirect to `/login?error=...` on failure

**ai-stream** (LLM endpoint):

- Method: `POST`
- Validate request body with a Zod schema
- Apply per-user rate limiting via `@upstash/ratelimit` BEFORE invoking the model
- Use `streamText` from the `ai` SDK and return the appropriate stream response (`toAIStreamResponse()` or per current SDK)
- Optional: `export const runtime = 'edge'` for low TTFB if all imports are edge-compatible

**generic**:

- Specify methods (GET/POST/etc.)
- Validate input with Zod
- Return typed JSON via `NextResponse.json(data, { status })`

Constraints:

- NEVER use a server action for webhooks or OAuth callbacks — server actions enforce origin checks that reject third-party POSTs.
- Default runtime is Vercel Node; opt into `edge` only when needed and verify all imports work on edge.
- Redact secrets and tokens from any logs.
- Always validate input at the boundary; never trust the request body shape.
