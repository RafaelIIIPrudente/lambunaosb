import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <header>
        <Skeleton className="mb-2 h-3 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-2 h-4 w-56" />
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <Card variant="attention" className="min-h-[180px]">
          <Skeleton className="bg-paper/20 h-3 w-32" />
          <Skeleton className="bg-paper/20 mt-1 h-7 w-3/4" />
          <Skeleton className="bg-paper/20 mt-1 h-4 w-2/3" />
          <Skeleton className="bg-paper/20 mt-3 h-9 w-28" />
        </Card>

        <Card className="min-h-[180px]">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-1 h-6 w-3/4" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-3 h-9 w-28" />
        </Card>

        <Card className="min-h-[180px]">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-1 h-6 w-3/4" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-3 h-9 w-24" />
        </Card>

        <Card className="min-h-[220px]">
          <Skeleton className="h-3 w-44" />
          <ul className="mt-2 flex flex-col gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] items-start gap-3">
                <Skeleton className="mt-0.5 h-3 w-10" />
                <Skeleton className="h-4 w-full" />
              </li>
            ))}
          </ul>
          <Skeleton className="mt-3 h-9 w-32" />
        </Card>
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
