import { Skeleton } from '@/components/ui/skeleton';

export default function NewsPostDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-2 h-3 w-48" />
      <Skeleton className="mb-3 h-9 w-3/4" />
      <Skeleton className="mb-4 h-4 w-2/3" />
      <div className="mb-6 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="aspect-video w-full" />
          <div className="border-ink/15 rounded-md border p-6">
            <Skeleton className="mb-4 h-3 w-16" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="mb-2 h-4 w-full" />
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-5">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </aside>
      </div>
      <span className="sr-only">Loading news post…</span>
    </div>
  );
}
