import { Skeleton } from '@/components/ui/skeleton';

export default function ResolutionsListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-10 w-44" />
      </header>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading resolutions…</span>
    </div>
  );
}
