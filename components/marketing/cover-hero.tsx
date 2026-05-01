'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  eyebrow: string;
  headline: ReactNode;
  dateline?: string;
  children?: ReactNode;
  className?: string;
};

export function CoverHero({ src, alt, eyebrow, headline, dateline, children, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <section
      className={cn(
        'relative isolate flex min-h-[680px] w-full overflow-hidden',
        'h-[100svh] max-h-[1100px]',
        className,
      )}
    >
      {reduce ? (
        <Image src={src} alt={alt} fill priority sizes="100vw" className="-z-20 object-cover" />
      ) : (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-20"
          initial={{ scale: 1.08 }}
          animate={{ scale: [1.04, 1.0, 1.04] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      )}

      <div
        aria-hidden="true"
        className="from-ink/15 via-ink/35 to-ink/85 absolute inset-0 -z-10 bg-gradient-to-b"
      />
      <div aria-hidden="true" className="bg-rust/8 absolute inset-0 -z-10 mix-blend-multiply" />

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-end px-4 pt-32 pb-14 sm:px-8 md:pb-20">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-paper/85 mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase"
        >
          <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
          {eyebrow}
        </motion.p>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-paper font-display max-w-[14ch] text-[clamp(48px,9vw,112px)] leading-[0.95] font-bold tracking-tight break-words"
        >
          {headline}
        </motion.h1>

        {dateline && (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-script text-paper/95 mt-7 max-w-[34ch] text-2xl leading-snug break-words md:text-3xl"
          >
            {dateline}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Bottom credit / scroll cue */}
      <div className="absolute right-4 bottom-4 z-10 flex items-center gap-3 sm:right-8 sm:bottom-6">
        <span className="text-paper/70 font-mono text-[10px] tracking-[0.18em] uppercase">
          Municipal Hall · Lambunao, Iloilo
        </span>
      </div>
    </section>
  );
}
