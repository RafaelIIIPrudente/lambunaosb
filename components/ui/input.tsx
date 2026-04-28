import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brief §4.3: height 40 (touch-target floor); paper-3 fill;
 * 1px ink-ghost border; navy focus ring (3px outline globally).
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-ink-ghost/40 bg-paper-3 text-ink placeholder:text-ink-faint',
        'focus-visible:border-navy-primary focus-visible:ring-navy-200/40',
        'aria-invalid:border-warn aria-invalid:ring-warn/20',
        'h-10 w-full min-w-0 rounded-md border px-3 py-2 text-sm transition-colors outline-none',
        'file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:ring-3',
        // Public surface uses the larger reading size; admin keeps text-sm.
        'public:text-base',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
