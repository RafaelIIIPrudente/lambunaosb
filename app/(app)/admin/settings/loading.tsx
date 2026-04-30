import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-7 w-24" />
      </header>

      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <aside className="flex flex-col gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>

        <div className="flex flex-col gap-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-ink/15 rounded-md border p-6">
              <Skeleton className="mb-4 h-3 w-24" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full md:w-2/3" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading settings…</span>
    </div>
  );
}
