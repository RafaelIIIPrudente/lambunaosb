'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

type CarouselImage = {
  url: string;
  alt: string;
  isCover: boolean;
};

type Props = {
  images: CarouselImage[];
  title: string;
};

const ARROW_BASE =
  'absolute top-1/2 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full border border-ink/15 bg-paper/85 text-ink shadow-e1 transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust';

export function NewsCarousel({ images, title }: Props) {
  const reduce = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const total = images.length;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  if (total === 0) return null;
  const single = total === 1;
  const activeAlt = images[current]?.alt;

  const opts = reduce ? { duration: 0 } : undefined;

  return (
    <figure
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} photo carousel`}
      className="flex flex-col"
    >
      <div className="relative">
        <Carousel setApi={setApi} opts={opts} className="w-full">
          <CarouselContent>
            {images.map((image, i) => (
              <CarouselItem key={image.url}>
                <div
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${total}`}
                  className="bg-paper-2 relative aspect-[16/9] w-full overflow-hidden rounded-md"
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 768px) 860px, 100vw"
                    className="object-cover"
                    unoptimized
                    priority={image.isCover}
                    loading={image.isCover ? undefined : 'lazy'}
                  />
                  {!single && (
                    <span className="text-paper bg-ink/55 rounded-pill pointer-events-none absolute right-3 bottom-3 px-2.5 py-1 font-mono text-[10px] tracking-wide backdrop-blur-sm">
                      {i + 1} of {total}
                    </span>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {!single && (
          <>
            <button
              type="button"
              onClick={() => api?.scrollPrev()}
              aria-label="Previous slide"
              className={cn(ARROW_BASE, 'left-4')}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => api?.scrollNext()}
              aria-label="Next slide"
              className={cn(ARROW_BASE, 'right-4')}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {activeAlt && (
        <figcaption className="text-ink-faint mt-3 font-mono text-xs italic">
          {activeAlt}
        </figcaption>
      )}
    </figure>
  );
}
