import Image from 'next/image';

import { cn } from '@/lib/utils';
import { FadeUp } from '@/components/motion/fade-up';

type Variant = 'orange' | 'pink';

type Props = {
  caption?: string;
  variant?: Variant;
  className?: string;
};

const SRC: Record<Variant, { src: string; alt: string }> = {
  orange: {
    src: '/lambunao/i-heart-lambunao-orange.png',
    alt: 'The LAMBUNAO sign monument with the heart sculpture, plaza of Lambunao',
  },
  pink: {
    src: '/lambunao/i-heart-lambunao-pink.png',
    alt: 'Place-pride photograph of Lambunao',
  },
};

export function PostcardDivider({
  caption = 'Padayon, Lambunao.',
  variant = 'orange',
  className,
}: Props) {
  const { src, alt } = SRC[variant];

  return (
    <FadeUp
      as="div"
      className={cn(
        'relative mx-auto flex w-full max-w-[1240px] flex-col items-center gap-6 px-4 py-20 sm:px-8 md:py-28',
        className,
      )}
    >
      {/* Postcard frame — dashed mat + photograph + handwritten dateline */}
      <figure className="flex flex-col items-center gap-5">
        <div className="border-ink/30 bg-paper shadow-e1 rounded-md border border-dashed p-2">
          <div className="bg-paper-2 relative aspect-[4/3] w-[clamp(280px,60vw,520px)] overflow-hidden rounded-md">
            <Image
              src={src}
              alt={alt}
              fill
              loading="lazy"
              sizes="(min-width: 768px) 520px, 80vw"
              className="object-cover"
            />
          </div>
        </div>
        <figcaption className="flex items-center gap-3">
          <span className="bg-ink/30 h-px w-10 shrink-0" aria-hidden="true" />
          <p className="font-script text-ink-soft text-2xl break-words md:text-3xl">{caption}</p>
          <span className="bg-ink/30 h-px w-10 shrink-0" aria-hidden="true" />
        </figcaption>
      </figure>
    </FadeUp>
  );
}
