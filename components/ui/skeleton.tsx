import { cn } from '@/lib/utils';

/**
 * Static placeholder. No shimmer / pulse — design brief §4.13
 * (3G performance + reduced-motion respect).
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('bg-paper-3 rounded-md', className)} {...props} />;
}

export { Skeleton };
