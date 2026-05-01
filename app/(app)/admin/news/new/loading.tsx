import { Skeleton } from '@/components/ui/skeleton';

export default function NewNewsPostLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-6 h-9 w-44" />
      <Skeleton className="mb-6 h-3 w-72" />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-10 w-44" />
        </div>
        <aside className="flex flex-col gap-5">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </aside>
      </div>
      <span className="sr-only">Loading composer…</span>
    </div>
  );
}
