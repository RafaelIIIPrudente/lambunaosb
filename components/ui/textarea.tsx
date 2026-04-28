import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brief §4.3 styling — same chrome as Input. Min height 96 (4 rows).
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-ink-ghost/40 bg-paper-3 text-ink placeholder:text-ink-faint',
        'focus-visible:border-navy-primary focus-visible:ring-navy-200/40',
        'aria-invalid:border-warn aria-invalid:ring-warn/20',
        'flex field-sizing-content min-h-24 w-full rounded-md border px-3 py-2 text-sm leading-relaxed transition-colors outline-none',
        'focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:ring-3',
        'public:text-base',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
