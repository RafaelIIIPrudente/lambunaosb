'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { assignCitizenQuery } from '@/app/_actions/citizen-queries';
import { FieldSelect } from '@/components/ui/field';
import type { AdminAssigneeOption } from '@/lib/db/queries/citizen-queries';

type Props = {
  queryId: string;
  currentAssigneeId: string | null;
  options: AdminAssigneeOption[];
};

const ROLE_LABELS: Record<string, string> = {
  secretary: 'Secretary',
  vice_mayor: 'Vice Mayor',
  mayor: 'Mayor',
  sb_member: 'SB Member',
};

export function AssignPanel({ queryId, currentAssigneeId, options }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const next = value === '' ? null : value;
    if (next === currentAssigneeId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignCitizenQuery({ queryId, assigneeId: next });
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
        Assigned to
      </p>
      <FieldSelect
        aria-label="Assign to admin"
        value={currentAssigneeId ?? ''}
        onChange={onChange}
        disabled={isPending}
      >
        <option value="">Unassigned</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.fullName} · {ROLE_LABELS[opt.role] ?? opt.role}
          </option>
        ))}
      </FieldSelect>

      {error && (
        <p role="alert" className="text-warn mt-2 text-xs font-medium">
          {error}
        </p>
      )}
    </section>
  );
}
