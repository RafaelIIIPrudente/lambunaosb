'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { updateCitizenQueryTags } from '@/app/_actions/citizen-queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';

type Props = {
  queryId: string;
  initialTags: string[];
};

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
}

function tagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tag, i) => tag === b[i]);
}

export function TagsEditor({ queryId, initialTags }: Props) {
  const router = useRouter();
  const [input, setInput] = useState(initialTags.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = parseTags(input);
  const dirty = !tagsEqual(parsed, initialTags);

  function save() {
    if (!dirty) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCitizenQueryTags({ queryId, tags: parsed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="border-ink/15 rounded-md border p-5">
      <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        Tags
      </p>

      {initialTags.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {initialTags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline">{tag}</Badge>
            </li>
          ))}
        </ul>
      )}

      <Field
        label="Tags"
        hint="Comma-separated, up to 20. Used for filtering and reporting."
        error={error ?? undefined}
      >
        <FieldInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="permits, fiesta-2026, follow-up"
          disabled={isPending}
        />
      </Field>

      {dirty && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={save}
          className="mt-3 font-medium"
        >
          <Save />
          {isPending ? 'Saving…' : 'Save tags'}
        </Button>
      )}
    </section>
  );
}
