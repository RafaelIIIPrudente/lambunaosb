import Image from 'next/image';

import { cn } from '@/lib/utils';
import { FadeUp } from '@/components/motion/fade-up';

type Props = {
  src: string;
  alt: string;
  caption?: string;
  eyebrow?: string;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
};

const HEIGHT_CLASS: Record<NonNullable<Props['height']>, string> = {
  sm: 'h-[42svh] min-h-[320px] md:h-[48svh]',
  md: 'h-[60svh] min-h-[420px] md:h-[68svh]',
  lg: 'h-[78svh] min-h-[540px] md:h-[82svh]',
};

export function PhotoBand({ src, alt, caption, eyebrow, height = 'md', className }: Props) {
  return (
    <FadeUp
      as="figure"
      className={cn('relative isolate w-full overflow-hidden', HEIGHT_CLASS[height], className)}
    >
      <Image src={src} alt={alt} fill sizes="100vw" className="-z-20 object-cover" />
      <div
        aria-hidden="true"
        className="from-ink/75 via-ink/25 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
      />

      <figcaption className="absolute bottom-0 left-0 flex w-full max-w-[1240px] flex-col gap-2 px-4 pb-8 sm:px-8 md:pb-12">
        {eyebrow && (
          <span className="text-paper/85 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            <span className="bg-gold mr-3 inline-block h-px w-6 align-middle" />
            {eyebrow}
          </span>
        )}
        {caption && (
          <p className="text-paper font-script max-w-[40ch] text-2xl leading-snug break-words md:text-3xl">
            {caption}
          </p>
        )}
      </figcaption>
    </FadeUp>
  );
}
