'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Lock, Save, Sparkles, X } from 'lucide-react';

import { updateNewsPost } from '@/app/_actions/news-posts';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_VISIBILITIES,
  NEWS_VISIBILITY_LABELS,
  slugify,
  updateNewsPostSchema,
  type UpdateNewsPostInput,
} from '@/lib/validators/news-post';

type CommitteeOption = { id: string; label: string; isStanding: boolean };

type Props = {
  postId: string;
  slugLocked: boolean;
  initialValues: Omit<UpdateNewsPostInput, 'postId'>;
  committeeOptions: CommitteeOption[];
};

export function NewsEditorForm({ postId, slugLocked, initialValues, committeeOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tagsInput, setTagsInput] = useState(initialValues.tags.join(', '));

  const form = useForm<UpdateNewsPostInput>({
    resolver: standardSchemaResolver(updateNewsPostSchema),
    defaultValues: { postId, ...initialValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function regenerateSlug() {
    if (slugLocked) return;
    form.setValue('slug', slugify(form.getValues('title')));
  }

  function onSubmit(values: UpdateNewsPostInput) {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const result = await updateNewsPost({
        ...values,
        tags,
        committeeId: values.committeeId || null,
      });
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(`/admin/news/${postId}`);
      router.refresh();
    });
  }

  return (
    <form className="flex min-w-0 flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="border-ink/15 min-w-0 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Headline
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Title" required error={form.formState.errors.title?.message}>
            <FieldInput {...form.register('title')} />
          </Field>

          <Field
            label="Slug · public URL"
            required
            hint={
              slugLocked
                ? 'Slug is locked because this post is published. Unpublish first to change it.'
                : 'Lowercase, hyphenated, used as /news/<slug>.'
            }
            error={form.formState.errors.slug?.message}
          >
            <div className="flex items-center gap-2">
              <FieldInput className="flex-1" disabled={slugLocked} {...form.register('slug')} />
              {slugLocked ? (
                <span
                  className="text-ink-faint inline-flex items-center gap-1 font-mono text-xs"
                  aria-label="Slug is locked"
                >
                  <Lock className="size-3.5" aria-hidden="true" />
                  Locked
                </span>
              ) : (
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
              )}
            </div>
          </Field>

          <Field
            label="Excerpt (optional)"
            hint="Short teaser shown in lists. Recommended for public posts."
            error={form.formState.errors.excerpt?.message}
          >
            <FieldTextarea rows={2} maxLength={280} {...form.register('excerpt')} />
          </Field>
        </div>
      </section>

      <section className="border-ink/15 min-w-0 rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Body
        </p>
        <Field label="Body (markdown)" required error={form.formState.errors.bodyMdx?.message}>
          <FieldTextarea rows={16} {...form.register('bodyMdx')} />
        </Field>
      </section>

      <section className="border-ink/15 min-w-0 rounded-md border p-5">
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

          <Field
            label="Referring committee"
            hint="Optional · attribute this post to a specific committee"
          >
            <FieldSelect
              {...form.register('committeeId', {
                setValueAs: (v) => (v === '' || v == null ? null : v),
              })}
            >
              <option value="">No referring committee</option>
              <optgroup label="Standing">
                {committeeOptions
                  .filter((c) => c.isStanding)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Special">
                {committeeOptions
                  .filter((c) => !c.isStanding)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </optgroup>
            </FieldSelect>
          </Field>

          <Field label="Tags" hint="Comma-separated.">
            <FieldInput value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
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
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => router.push(`/admin/news/${postId}`)}
          className="font-medium"
        >
          <X />
          Cancel
        </Button>
      </div>
    </form>
  );
}
