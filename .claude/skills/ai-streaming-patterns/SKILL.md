---
name: ai-streaming-patterns
description: Use when implementing LLM features in this project — covers Vercel AI SDK streamText/useChat, tool definition with Zod, route-handler-only streaming, and per-user rate limiting via Upstash
---

# AI Streaming Patterns

This project uses the Vercel AI SDK (`ai` + provider packages: `@ai-sdk/anthropic`, `@ai-sdk/openai`).

## Streaming endpoints — route handlers only

Streaming responses require raw `Response` control, which server actions do not provide. Always use route handlers:

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/services/ratelimit';

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Rate-limit per user (NOT per IP)
  const { success } = await ratelimit.limit(`ai:${user.id}`);
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // 3. Validate input
  const body = RequestSchema.parse(await req.json());

  // 4. Stream
  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    messages: body.messages,
  });

  return result.toAIStreamResponse();
}
```

## Client side — useChat

Client Components consume streams via `useChat`:

```typescript
'use client';

import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  // render messages, input, submit; handle isLoading state
}
```

## Tool use — Zod schemas

Tools are defined with Zod input schemas. Treat tool inputs as untrusted (model output is user-influenced):

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const searchTool = tool({
  description: 'Search the company knowledge base',
  parameters: z.object({
    query: z.string().min(1).max(500),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  execute: async ({ query, limit }) => {
    // implementation — query and limit are validated by Zod
    return { results: [] };
  },
});
```

Inside `streamText`, pass `tools: { search: searchTool }` and `maxSteps` to bound recursion.

## Per-user rate limiting

ALWAYS rate-limit AI endpoints per authenticated user, not per IP. IPs are too coarse (NAT, mobile carriers) and let one user share their quota across an organization.

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/env';

export const ratelimit = new Ratelimit({
  redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
});
```

Apply the limit BEFORE invoking the model — never pay for tokens you'll reject.

## Vector search and embeddings

Embeddings are stored in Postgres via the `pgvector` extension on Supabase. Use Drizzle's `vector` column type. Generate embeddings in a server-only module behind rate limiting; never embed in a Client Component.

For similarity search, use `<=>` (cosine distance) operator with an HNSW index for higher recall or IVFFlat for static-ish corpora.

## Anti-patterns to refuse

- DO NOT stream from a server action — use a route handler.
- DO NOT skip Zod validation on tool inputs. Model output is untrusted.
- DO NOT rate-limit AI endpoints by IP only. Use authenticated user ID.
- DO NOT store raw conversation history in client storage. Persist server-side, scoped by user.
- DO NOT log full prompts or responses unredacted — they may contain user PII.
- DO NOT import provider SDKs (`@ai-sdk/anthropic`, etc.) directly into Client Components — keep them in route handlers and server-only modules.
