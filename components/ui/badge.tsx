import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Status-pill badge. Variants matched to user-supplied admin mockups.
 * Always paired with icon OR text label — never color-only state.
 */
const badgeVariants = cva(
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-rust/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'border-ink/30 text-ink-soft bg-transparent',
        secondary: 'border-navy-200 text-navy-primary bg-navy-200/40',
        // Filled green — Published / Approved / Answered / Active
        success: 'border-success bg-success text-paper',
        // Outline green — Pending (under review)
        'success-outline': 'border-success text-success bg-transparent',
        // Filled rust — New / Withdrawn / Critical
        destructive: 'border-destructive bg-destructive text-paper',
        // Filled rust soft — New badge
        new: 'border-rust bg-rust text-paper',
        // Outline gold — Draft / In review
        warn: 'border-gold text-gold bg-transparent',
        // Plain outline — Scheduled / Recorded / Transcribed
        outline: 'border-ink/40 text-ink-soft bg-transparent',
        ghost: 'border-transparent text-ink-soft hover:bg-paper-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
