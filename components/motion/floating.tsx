'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  durationSec?: number;
};

export function Floating({ children, className, amplitude = 4, durationSec = 6 }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      animate={{ y: [-amplitude, amplitude] }}
      transition={{
        duration: durationSec,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}
