'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';
import { DURATION, EASE, FADE_UP_DISTANCE, VIEWPORT_AMOUNT, VIEWPORT_ONCE } from './_constants';

type Tag = 'div' | 'section' | 'header' | 'aside' | 'figure' | 'article' | 'nav' | 'p';

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: Tag;
  'aria-label'?: string;
  id?: string;
};

export function FadeUp({
  children,
  delay = 0,
  className,
  as = 'div',
  'aria-label': ariaLabel,
  id,
}: Props) {
  const reduce = useReducedMotion();
  const ariaProps = { 'aria-label': ariaLabel, id };

  if (reduce) {
    const plain = { className: cn(className), ...ariaProps };
    switch (as) {
      case 'section':
        return <section {...plain}>{children}</section>;
      case 'header':
        return <header {...plain}>{children}</header>;
      case 'aside':
        return <aside {...plain}>{children}</aside>;
      case 'figure':
        return <figure {...plain}>{children}</figure>;
      case 'article':
        return <article {...plain}>{children}</article>;
      case 'nav':
        return <nav {...plain}>{children}</nav>;
      case 'p':
        return <p {...plain}>{children}</p>;
      default:
        return <div {...plain}>{children}</div>;
    }
  }

  const transition = { duration: DURATION.base, delay, ease: EASE };
  const initial = { opacity: 0, y: FADE_UP_DISTANCE };
  const whileInView = { opacity: 1, y: 0 };
  const viewport = { once: VIEWPORT_ONCE, amount: VIEWPORT_AMOUNT };
  const shared = {
    className: cn(className),
    initial,
    whileInView,
    viewport,
    transition,
    ...ariaProps,
  };

  switch (as) {
    case 'section':
      return <motion.section {...shared}>{children}</motion.section>;
    case 'header':
      return <motion.header {...shared}>{children}</motion.header>;
    case 'aside':
      return <motion.aside {...shared}>{children}</motion.aside>;
    case 'figure':
      return <motion.figure {...shared}>{children}</motion.figure>;
    case 'article':
      return <motion.article {...shared}>{children}</motion.article>;
    case 'nav':
      return <motion.nav {...shared}>{children}</motion.nav>;
    case 'p':
      return <motion.p {...shared}>{children}</motion.p>;
    default:
      return <motion.div {...shared}>{children}</motion.div>;
  }
}
