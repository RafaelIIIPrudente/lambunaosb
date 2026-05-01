import { Skeleton } from '@/components/ui/skeleton';

export default function EditNewsPostLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-2 h-3 w-72" />
      <Skeleton className="mb-2 h-9 w-44" />
      <Skeleton className="mb-6 h-4 w-1/2" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside>
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-3 h-9 w-full" />
        </aside>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
      <span className="sr-only">Loading editor…</span>
    </div>
  );
}
