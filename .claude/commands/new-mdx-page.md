---
description: Scaffold an MDX content file with frontmatter and ensure routing exists
argument-hint: <slug> [<title>]
---

The user wants a new MDX page: `$ARGUMENTS`.

Parse slug and optional title. If only a slug is given, derive a Title-Cased title from it. Ask the user for the category (typically `blog`, `docs`, or `pages`) if not obvious from context.

Steps:

1. Create `content/<category>/<slug>.mdx` with frontmatter:

   ```yaml
   ---
   title: <Title>
   description: <one-line summary placeholder>
   date: <today, ISO format>
   tags: []
   draft: true
   ---
   ```

   Body skeleton: `# <Title>` followed by an empty paragraph and a `## Overview` section.

2. If a corresponding dynamic route handler does not yet exist (typically `app/(marketing)/<category>/[slug]/page.tsx`), scaffold one that:
   - Reads the MDX file via `next-mdx-remote/rsc` (server-side compile)
   - Parses frontmatter via `gray-matter`
   - Calls `notFound()` if the slug does not resolve
   - Implements `generateStaticParams` from the `content/<category>/` directory
   - Implements `generateMetadata` from frontmatter

3. If a category index (`page.tsx` listing all posts) doesn't exist, propose scaffolding it but wait for confirmation.

Constraints:

- The MDX-rendering route MUST be a Server Component. Compile MDX server-side; never ship `next-mdx-remote` to the client.
- `metadataBase` must be set in the parent root layout. If it is not, surface the gap.
- `draft: true` content must be filtered from listings in production builds (`process.env.NODE_ENV !== 'production'` — the only legitimate `process.env` read outside `env.ts`, since this is a build-time gate).
- Use `rehype-pretty-code` and `remark-gfm` if the content includes code blocks or GFM features.
