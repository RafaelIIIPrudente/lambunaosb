import { Skeleton } from '@/components/ui/skeleton';

export default function NewsListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-10 w-32" />
      </header>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <ul className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <article className="border-ink/15 grid gap-4 rounded-md border p-4 sm:grid-cols-[200px_1fr]">
              <Skeleton className="aspect-video w-full" />
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </article>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading news…</span>
    </div>
  );
}
