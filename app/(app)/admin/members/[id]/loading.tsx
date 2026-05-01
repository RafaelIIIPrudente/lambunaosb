import { Skeleton } from '@/components/ui/skeleton';

export default function MemberDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-2 h-3 w-48" />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-9 w-72" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </header>
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr_280px]">
        <Skeleton className="aspect-[3/4] w-full" />
        <div className="flex flex-col gap-5">
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-3 h-3 w-24" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-4 w-full" />
            ))}
          </div>
          <div className="border-ink/15 rounded-md border p-5">
            <Skeleton className="mb-3 h-3 w-44" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-9 w-full" />
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </aside>
      </div>
      <span className="sr-only">Loading member detail…</span>
    </div>
  );
}
