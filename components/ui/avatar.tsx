'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Sizes per design brief §4.12:
 *   sm  24 · md (default) 40 · lg 64 · xl 120 (member detail)
 * Public uses circle (rounded-full); admin uses rounded-md for table compactness.
 * Fallback: gold initials on navy ground per brief.
 */
function Avatar({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'sm' | 'default' | 'lg' | 'xl';
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex shrink-0 overflow-hidden select-none',
        'border-ink-ghost/40 border',
        'data-[size=default]:size-10 data-[size=lg]:size-16 data-[size=sm]:size-6 data-[size=xl]:size-30',
        // public surface = circle; admin = rounded-md
        'admin:rounded-md rounded-full',
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-navy-primary text-gold flex size-full items-center justify-center font-semibold uppercase',
        'text-xs group-data-[size=default]/avatar:text-base group-data-[size=lg]/avatar:text-2xl group-data-[size=xl]/avatar:text-4xl',
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        'bg-success ring-paper absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 select-none',
        'group-data-[size=sm]/avatar:size-2',
        'group-data-[size=default]/avatar:size-2.5',
        'group-data-[size=lg]/avatar:size-3.5',
        'group-data-[size=xl]/avatar:size-4',
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'group/avatar-group *:data-[slot=avatar]:ring-paper flex -space-x-2 *:data-[slot=avatar]:ring-2',
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'bg-paper-3 text-ink-soft ring-paper relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm ring-2',
        'group-has-data-[size=lg]/avatar-group:size-16 group-has-data-[size=sm]/avatar-group:size-6',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge };
