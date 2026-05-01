import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Card variants per user-supplied visual target:
 *   - default    → solid 1px border, paper bg (admin density)
 *   - dashed     → dashed 1px border, paper bg (public editorial cards)
 *   - attention  → rust surface, paper text — ONE per page max
 *                  (dashboard "Upcoming session" hero card pattern)
 */
const cardVariants = cva(
  'group/card text-card-foreground flex flex-col gap-4 transition-[box-shadow,background] duration-150',
  {
    variants: {
      variant: {
        default: 'bg-card border border-ink/12 rounded-md',
        dashed: 'bg-card border border-dashed border-ink/30 rounded-md',
        attention: 'bg-rust text-paper border border-rust-dark rounded-md shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Card({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(
        cardVariants({ variant }),
        'public:p-6 admin:p-4 p-4',
        'data-[size=sm]:gap-3 data-[size=sm]:p-3',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid auto-rows-min items-start gap-1', className)}
      {...props}
    />
  );
}

function CardEyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-eyebrow"
      className={cn(
        'text-rust group-data-[variant=attention]/card:text-paper/85',
        'font-mono text-[10px] font-medium tracking-[0.18em] uppercase',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        'text-ink group-data-[variant=attention]/card:text-paper',
        'font-display text-xl leading-tight font-semibold',
        'group-data-[size=sm]/card:text-base',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        'text-ink-soft group-data-[variant=attention]/card:text-paper/85',
        'text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('mt-2 flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardEyebrow,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
  cardVariants,
};
