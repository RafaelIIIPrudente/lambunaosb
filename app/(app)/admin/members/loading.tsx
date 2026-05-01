import { Skeleton } from '@/components/ui/skeleton';

export default function MembersListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-10 w-36" />
      </header>
      <Skeleton className="mb-6 h-3 w-32" />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li key={i}>
            <article className="border-ink/15 flex flex-col rounded-md border p-4">
              <Skeleton className="mb-3 aspect-[3/4] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
              </div>
            </article>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading members…</span>
    </div>
  );
}
