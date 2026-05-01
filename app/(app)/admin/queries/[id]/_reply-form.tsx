'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

import { replyToCitizenQuery } from '@/app/_actions/citizen-queries';
import { Button } from '@/components/ui/button';
import { Field, FieldTextarea } from '@/components/ui/field';

type Props = {
  queryId: string;
  recipientEmail: string;
  recipientName: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function ReplyForm({
  queryId,
  recipientEmail,
  recipientName,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setError(null);
    startTransition(async () => {
      const result = await replyToCitizenQuery({ queryId, bodyMd: body.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody('');
      router.refresh();
    });
  }

  const trimmedLength = body.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < 10;

  return (
    <form onSubmit={onSubmit} className="border-ink/15 rounded-md border p-5" noValidate>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-rust font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Your reply
        </p>
        <span className="text-ink-faint font-mono text-[11px] tracking-wide">
          To: <span className="text-ink-soft">{recipientName}</span> &lt;{recipientEmail}&gt;
        </span>
      </div>

      {disabled ? (
        <p className="text-ink-faint border-ink/15 rounded-md border border-dashed p-4 text-sm italic">
          {disabledReason ?? 'Replies are disabled for this query.'}
        </p>
      ) : (
        <>
          <Field
            label="Reply"
            required
            hint="Records the reply in the audit trail. Contact the citizen directly via the email address shown above."
            error={error ?? (tooShort ? 'Reply must be at least 10 characters.' : undefined)}
          >
            <FieldTextarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Maraming salamat, ${recipientName}.\n\n…`}
              maxLength={8000}
              required
              disabled={isPending}
            />
          </Field>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-ink-faint font-mono text-[11px] tabular-nums">
              {trimmedLength.toLocaleString()} / 8,000
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || trimmedLength < 10}
              className="font-medium"
            >
              <Send />
              {isPending ? 'Saving…' : 'Record reply'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
