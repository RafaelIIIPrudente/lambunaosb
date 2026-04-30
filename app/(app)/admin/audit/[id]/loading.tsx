import { Skeleton } from '@/components/ui/skeleton';

export default function AuditEntryDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-4 h-3 w-48" />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-32" />
      </header>
      <div className="mb-6 flex gap-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <aside className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </aside>
      </div>
      <span className="sr-only">Loading audit entry…</span>
    </div>
  );
}
