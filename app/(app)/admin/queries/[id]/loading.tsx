import { Skeleton } from '@/components/ui/skeleton';

export default function QueryDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-4 h-3 w-48" />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="mb-3 h-3 w-48" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-3 w-full" />
            ))}
          </div>
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="h-32 w-full" />
            <div className="mt-4 flex justify-end">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </aside>
      </div>
      <span className="sr-only">Loading citizen query…</span>
    </div>
  );
}
