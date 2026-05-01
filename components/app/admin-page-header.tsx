import { cn } from '@/lib/utils';

/**
 * Common admin page header per user-supplied mockups.
 * Caveat italic title + optional inline filter pills + optional accessory.
 * Examples: A3 "Meetings", A6 "Resolutions & Ordinances",
 *           A15 "Audit log", A17 "Settings".
 */
export function AdminPageHeader({
  title,
  pills,
  accessory,
  className,
}: {
  title: string;
  pills?: { label: string; count?: number; active?: boolean; onClick?: () => void }[];
  accessory?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="text-ink font-script min-w-0 text-3xl break-words">{title}</h1>
        {pills && pills.length > 0 && (
          <ul role="group" aria-label={`Filter ${title}`} className="flex flex-wrap gap-1.5">
            {pills.map((pill) => (
              <li key={pill.label}>
                <button
                  type="button"
                  aria-pressed={pill.active ?? false}
                  className={cn(
                    'border-ink/30 text-ink-soft hover:border-ink font-script rounded-pill inline-flex h-7 items-center gap-1.5 border px-3 text-sm transition-colors',
                    'aria-[pressed=true]:bg-ink aria-[pressed=true]:text-paper aria-[pressed=true]:border-ink',
                    'first:aria-[pressed=true]:bg-rust first:aria-[pressed=true]:border-rust',
                  )}
                >
                  {pill.label}
                  {pill.count !== undefined && (
                    <span className="font-mono text-[10px] tabular-nums opacity-75">
                      ({pill.count})
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {accessory && <div className="flex flex-wrap items-center gap-2">{accessory}</div>}
    </header>
  );
}
