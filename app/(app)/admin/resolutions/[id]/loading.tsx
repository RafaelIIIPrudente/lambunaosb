import { Skeleton } from '@/components/ui/skeleton';

export default function ResolutionDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6">
        <Skeleton className="mb-2 h-3 w-40" />
        <Skeleton className="h-9 w-2/3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="border-ink/15 rounded-md border p-6">
          <Skeleton className="mb-4 h-3 w-16" />
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-4 h-3 w-20" />
            <Skeleton className="h-4 w-1/2" />
            <hr className="border-ink/15 my-4 border-t border-dashed" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="mb-2 h-3 w-full" />
            ))}
          </div>
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-4 h-3 w-32" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-4 w-full" />
            ))}
          </div>
        </aside>
      </div>
      <span className="sr-only">Loading resolution…</span>
    </div>
  );
}
