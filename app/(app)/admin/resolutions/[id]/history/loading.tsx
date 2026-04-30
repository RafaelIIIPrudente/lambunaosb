import { Skeleton } from '@/components/ui/skeleton';

export default function ResolutionHistoryLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-2 h-3 w-72" />
      <Skeleton className="mb-2 h-9 w-56" />
      <Skeleton className="mb-6 h-4 w-2/3" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading version history…</span>
    </div>
  );
}
