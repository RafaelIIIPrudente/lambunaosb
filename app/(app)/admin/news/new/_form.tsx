'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Plus, Save, Sparkles, X } from 'lucide-react';

import { createNewsPost } from '@/app/_actions/news-posts';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_VISIBILITIES,
  NEWS_VISIBILITY_LABELS,
  newsPostSchema,
  slugify,
  type NewsPostInput,
} from '@/lib/validators/news-post';

export function NewsComposerForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tagsInput, setTagsInput] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<NewsPostInput>({
    resolver: standardSchemaResolver(newsPostSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      bodyMdx: '',
      category: 'announcement',
      visibility: 'public',
      pinned: false,
      tags: [],
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const [watchedTitle, watchedSlug] = useWatch({
    control: form.control,
    name: ['title', 'slug'],
  });

  // Auto-suggest slug from title until the user manually edits the slug.
  useEffect(() => {
    if (slugTouched) return;
    const suggested = slugify(watchedTitle);
    if (suggested !== watchedSlug) {
      form.setValue('slug', suggested);
    }
  }, [watchedTitle, watchedSlug, form, slugTouched]);

  function regenerateSlug() {
    setSlugTouched(false);
    form.setValue('slug', slugify(form.getValues('title')));
  }

  function onSubmit(values: NewsPostInput) {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const result = await createNewsPost({ ...values, tags });
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(`/admin/news/${result.data.id}/edit`);
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[1fr_320px]"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-5">
        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Headline
          </p>
          <div className="flex flex-col gap-4">
            <Field label="Title" required error={form.formState.errors.title?.message}>
              <FieldInput
                placeholder="Free vaccination drive — Brgy. Cabatangan, June 22"
                {...form.register('title')}
              />
            </Field>

            <Field
              label="Slug · public URL"
              required
              hint="Lowercase, hyphenated, used as /news/<slug>. Locked once published."
              error={form.formState.errors.slug?.message}
            >
              <div className="flex items-center gap-2">
                <FieldInput
                  className="flex-1"
                  placeholder="vaccination-drive-cabatangan-june-22"
                  {...form.register('slug', {
                    onChange: () => {
                      setSlugTouched(true);
                    },
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerateSlug}
                  className="font-medium"
                  aria-label="Regenerate slug from title"
                >
                  <Sparkles />
                  Auto
                </Button>
              </div>
            </Field>

            <Field
              label="Excerpt (optional, recommended for public posts)"
              hint="Short teaser, 1–2 sentences. Shown in lists."
              error={form.formState.errors.excerpt?.message}
            >
              <FieldTextarea
                rows={2}
                maxLength={280}
                placeholder="One- or two-sentence summary that shows in /news listings."
                {...form.register('excerpt')}
              />
            </Field>
          </div>
        </section>

        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Body
          </p>
          <Field
            label="Body (markdown)"
            required
            hint="Plain markdown. Real MDX rendering with custom components is on the roadmap."
            error={form.formState.errors.bodyMdx?.message}
          >
            <FieldTextarea
              rows={14}
              placeholder={
                'The Sangguniang Bayan announces…\n\n## Schedule\n\n- 8:00 AM — registration\n- 9:00 AM — vaccination begins\n\nFor more information, contact the Office of the Sanggunian at (033) 333-1234.'
              }
              {...form.register('bodyMdx')}
            />
          </Field>
        </section>

        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Classification &amp; visibility
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category" required>
                <FieldSelect {...form.register('category')}>
                  {NEWS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {NEWS_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
              <Field label="Visibility" required>
                <FieldSelect {...form.register('visibility')}>
                  {NEWS_VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                      {NEWS_VISIBILITY_LABELS[v]}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
            </div>

            <Field label="Tags" hint="Comma-separated, e.g. health, infrastructure, public-safety">
              <FieldInput
                placeholder="health, brgy-cabatangan"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </Field>

            <label className="border-ink/30 flex items-center justify-between rounded-md border border-dashed p-4">
              <span className="text-ink font-medium">Pin to top of public news feed</span>
              <input type="checkbox" className="accent-rust size-4" {...form.register('pinned')} />
            </label>
          </div>
        </section>

        {form.formState.errors.root && (
          <p role="alert" className="text-warn text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending} className="font-medium">
            <Save />
            {isPending ? 'Saving…' : 'Save draft'}
            <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => router.push('/admin/news')}
            className="font-medium"
          >
            <X />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-5">
        <div className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Workflow
          </p>
          <ol className="text-ink-soft flex flex-col gap-2 text-xs">
            <li>1. Save this as a draft.</li>
            <li>2. On the edit page, upload a cover image and gallery photos (up to 15).</li>
            <li>3. Refine the body, set tags, toggle visibility.</li>
            <li>4. Publish when ready (Secretary, Vice Mayor, or Mayor).</li>
          </ol>
        </div>
        <div className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            About slugs
          </p>
          <p className="text-ink-soft text-xs italic">
            The slug becomes part of the public URL (
            <code className="font-mono">/news/&lt;slug&gt;</code>
            ). It auto-suggests from the title until you edit it manually. Once published, the slug
            is locked to keep links from breaking.
          </p>
        </div>
        <div className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            <Plus className="mr-1 inline size-3" aria-hidden="true" />
            Photos come next
          </p>
          <p className="text-ink-soft text-xs italic">
            Cover image and the photo gallery (up to 15) live on the edit page — you&apos;ll see
            both panels right after this draft is saved.
          </p>
        </div>
      </aside>
    </form>
  );
}
