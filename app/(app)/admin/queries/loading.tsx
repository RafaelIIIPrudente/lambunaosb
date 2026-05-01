import { Skeleton } from '@/components/ui/skeleton';

export default function QueriesListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-28" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-6">
          <div>
            <Skeleton className="mb-3 h-3 w-16" />
            <div className="flex flex-col gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="mb-3 h-3 w-20" />
            <div className="flex flex-col gap-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
          <ul className="border-ink/15 divide-ink/10 flex flex-col divide-y rounded-md border">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="grid items-center gap-4 px-4 py-3 sm:grid-cols-[auto_1fr_auto_auto]"
              >
                <Skeleton className="size-2 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <span className="sr-only">Loading citizen queries…</span>
    </div>
  );
}
