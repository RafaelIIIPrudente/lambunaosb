'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

import { cn } from '@/lib/utils';
import {
  DURATION,
  EASE,
  FADE_UP_DISTANCE,
  STAGGER_CHILD,
  VIEWPORT_AMOUNT,
  VIEWPORT_ONCE,
} from './_constants';

const STAGGER_PARENT: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_CHILD },
  },
};

const STAGGER_CHILD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: FADE_UP_DISTANCE },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
};

type ParentTag = 'div' | 'section' | 'header' | 'aside' | 'article' | 'ul';

type ParentProps = {
  children: ReactNode;
  className?: string;
  as?: ParentTag;
};

export function Stagger({ children, className, as = 'div' }: ParentProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    switch (as) {
      case 'section':
        return <section className={cn(className)}>{children}</section>;
      case 'header':
        return <header className={cn(className)}>{children}</header>;
      case 'aside':
        return <aside className={cn(className)}>{children}</aside>;
      case 'article':
        return <article className={cn(className)}>{children}</article>;
      case 'ul':
        return <ul className={cn(className)}>{children}</ul>;
      default:
        return <div className={cn(className)}>{children}</div>;
    }
  }

  const shared = {
    className: cn(className),
    initial: 'hidden' as const,
    whileInView: 'visible' as const,
    viewport: { once: VIEWPORT_ONCE, amount: VIEWPORT_AMOUNT },
    variants: STAGGER_PARENT,
  };

  switch (as) {
    case 'section':
      return <motion.section {...shared}>{children}</motion.section>;
    case 'header':
      return <motion.header {...shared}>{children}</motion.header>;
    case 'aside':
      return <motion.aside {...shared}>{children}</motion.aside>;
    case 'article':
      return <motion.article {...shared}>{children}</motion.article>;
    case 'ul':
      return <motion.ul {...shared}>{children}</motion.ul>;
    default:
      return <motion.div {...shared}>{children}</motion.div>;
  }
}

type ChildTag = 'div' | 'li' | 'article' | 'section' | 'aside';

type ChildProps = {
  children: ReactNode;
  className?: string;
  as?: ChildTag;
};

export function StaggerItem({ children, className, as = 'div' }: ChildProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    switch (as) {
      case 'li':
        return <li className={cn(className)}>{children}</li>;
      case 'article':
        return <article className={cn(className)}>{children}</article>;
      case 'section':
        return <section className={cn(className)}>{children}</section>;
      case 'aside':
        return <aside className={cn(className)}>{children}</aside>;
      default:
        return <div className={cn(className)}>{children}</div>;
    }
  }

  const shared = {
    className: cn(className),
    variants: STAGGER_CHILD_VARIANTS,
  };

  switch (as) {
    case 'li':
      return <motion.li {...shared}>{children}</motion.li>;
    case 'article':
      return <motion.article {...shared}>{children}</motion.article>;
    case 'section':
      return <motion.section {...shared}>{children}</motion.section>;
    case 'aside':
      return <motion.aside {...shared}>{children}</motion.aside>;
    default:
      return <motion.div {...shared}>{children}</motion.div>;
  }
}
