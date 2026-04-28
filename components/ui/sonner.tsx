'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

/**
 * Brief §4.11. Light-only v1 — theme is hardcoded, no next-themes provider.
 * Position: top-right desktop / top-center mobile (Sonner default handles per-viewport).
 * CSS vars map to locked palette via globals.css.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      duration={4000}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-paper)',
          '--normal-text': 'var(--color-ink)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--color-paper)',
          '--success-text': 'var(--color-success)',
          '--success-border': 'var(--color-success)',
          '--error-bg': 'var(--color-paper)',
          '--error-text': 'var(--color-warn)',
          '--error-border': 'var(--color-warn)',
          '--border-radius': 'var(--radius-md)',
          '--shadow': 'var(--shadow-e2)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
