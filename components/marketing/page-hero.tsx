import type { ReactNode } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { FadeUp } from '@/components/motion/fade-up';

type Props = {
  src: string;
  alt: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  caption?: string;
  align?: 'left' | 'center';
  className?: string;
};

export function PageHero({
  src,
  alt,
  eyebrow,
  title,
  lede,
  caption,
  align = 'left',
  className,
}: Props) {
  return (
    <FadeUp
      as="section"
      className={cn(
        'relative isolate w-full overflow-hidden',
        'h-[58svh] min-h-[460px] md:h-[68svh]',
        className,
      )}
    >
      <Image src={src} alt={alt} fill priority sizes="100vw" className="-z-20 object-cover" />
      <div
        aria-hidden="true"
        className="from-ink/85 via-ink/45 to-ink/20 absolute inset-0 -z-10 bg-gradient-to-t"
      />
      <div aria-hidden="true" className="bg-rust/8 absolute inset-0 -z-10 mix-blend-multiply" />

      <div
        className={cn(
          'relative mx-auto flex h-full w-full max-w-[1240px] flex-col justify-end px-4 pt-24 pb-12 sm:px-8 md:pb-16',
          align === 'center' && 'items-center text-center',
        )}
      >
        <p className="text-paper/85 mb-5 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
          {eyebrow}
        </p>
        <h1 className="text-paper font-display max-w-[18ch] text-[clamp(40px,7vw,84px)] leading-[1.0] font-bold tracking-tight">
          {title}
        </h1>
        {lede && (
          <p className="text-paper/90 font-script mt-6 max-w-[44ch] text-xl leading-snug md:text-2xl">
            {lede}
          </p>
        )}
      </div>

      {caption && (
        <p className="text-paper/70 absolute right-4 bottom-4 font-mono text-[10px] tracking-[0.18em] uppercase sm:right-8 sm:bottom-5">
          {caption}
        </p>
      )}
    </FadeUp>
  );
}
