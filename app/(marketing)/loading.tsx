import { Skeleton } from '@/components/ui/skeleton';

export default function LandingLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero */}
      <section className="border-ink/12 border-b">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-14 w-full max-w-[640px]" />
            <Skeleton className="h-14 w-3/4 max-w-[520px]" />
            <Skeleton className="mt-4 h-6 w-full max-w-md" />
            <Skeleton className="h-6 w-5/6 max-w-md" />
            <div className="mt-6 flex gap-3">
              <Skeleton className="h-12 w-44" />
              <Skeleton className="h-12 w-36" />
            </div>
            <Skeleton className="mt-4 h-3 w-72" />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 lg:items-end">
            <Skeleton className="aspect-square w-full max-w-[360px] rounded-md" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-paper-2 border-ink/12 border-b">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
          <Skeleton className="mb-5 h-3 w-32" />
          <div className="flex max-w-4xl flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-9/12" />
          </div>
          <Skeleton className="mt-6 h-5 w-44" />
        </div>
      </section>

      {/* Upcoming session */}
      <section className="border-ink/12 border-b">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
          <Skeleton className="mb-5 h-3 w-44" />
          <div className="bg-paper-2 border-ink/12 flex flex-col gap-3 rounded-md border p-6 md:p-8">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </section>

      {/* News */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-6 w-32" />
        </header>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <article className="border-ink/15 bg-paper flex h-full flex-col gap-4 rounded-md border p-4">
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="flex flex-col gap-2 px-1 pb-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Members */}
      <section className="bg-paper-2 border-ink/12 border-t">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 md:py-20">
          <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-10 w-72" />
            </div>
            <Skeleton className="h-6 w-36" />
          </header>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <article className="border-ink/15 bg-paper flex h-full flex-col gap-4 rounded-md border p-4">
                  <Skeleton className="aspect-square w-full" />
                  <div className="flex flex-col gap-1.5 px-1 pb-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <span className="sr-only">Loading homepage…</span>
    </div>
  );
}
