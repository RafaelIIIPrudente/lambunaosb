'use client';

import { useCallback, useEffect, useState, type KeyboardEvent, type FocusEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LAMBUNAO_SLIDES,
  type PhotoCarouselSlide,
} from '@/components/marketing/photo-carousel.data';

export type PhotoCarouselProps = {
  slides?: PhotoCarouselSlide[];
  eyebrow?: string;
  autoAdvanceMs?: number;
  className?: string;
};

export function PhotoCarousel({
  slides = DEFAULT_LAMBUNAO_SLIDES,
  eyebrow = 'Mga eksena · scenes of Lambunao',
  autoAdvanceMs = 6000,
  className,
}: PhotoCarouselProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const count = slides.length;
  const current = slides[active] ?? slides[0]!;

  const goTo = useCallback(
    (i: number) => {
      if (count <= 0) return;
      const next = ((i % count) + count) % count;
      setActive(next);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(active + 1), [goTo, active]);
  const goPrev = useCallback(() => goTo(active - 1), [goTo, active]);

  useEffect(() => {
    function onVisibility() {
      setTabHidden(document.visibilityState === 'hidden');
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const isPaused = hovered || focused || tabHidden || reduce || autoAdvanceMs <= 0;

  useEffect(() => {
    if (isPaused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % count);
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [isPaused, autoAdvanceMs, count]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(count - 1);
    }
  }

  function onFocus() {
    setFocused(true);
  }

  function onBlur(e: FocusEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }

  if (count === 0) return null;

  const counter = `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={eyebrow}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn(
        'relative mx-auto w-full max-w-[1240px] overflow-x-clip px-4 py-20 sm:px-8 md:py-28',
        'focus-visible:outline-none',
        className,
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        {/* FEATURED PHOTO */}
        <div className="border-ink/25 relative min-w-0 rounded-md border border-dashed p-1.5">
          <div className="bg-paper-2 relative aspect-[4/3] w-full overflow-hidden rounded-md">
            {slides.map((slide, idx) => {
              const isActive = idx === active;
              return (
                <motion.div
                  key={slide.src}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${count}: ${slide.caption}`}
                  aria-hidden={!isActive}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                  className={cn('absolute inset-0', isActive ? 'z-10' : 'pointer-events-none z-0')}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="(min-width: 1024px) 880px, 100vw"
                    priority={false}
                    className="object-cover"
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Mobile overlay prev/next — keeps slide controls visible on small screens
              where the chrome column is below the photo + thumb strip. */}
          <div className="pointer-events-none absolute inset-x-3 bottom-4 z-20 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="bg-paper/90 text-ink hover:bg-paper hover:text-rust focus-visible:ring-rust/60 pointer-events-auto inline-flex size-11 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors outline-none focus-visible:ring-2"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="bg-paper/90 text-ink hover:bg-paper hover:text-rust focus-visible:ring-rust/60 pointer-events-auto inline-flex size-11 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors outline-none focus-visible:ring-2"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* CHROME COLUMN */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Eyebrow + counter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-rust font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              <span className="bg-gold mr-3 inline-block h-px w-8 align-middle" />
              {eyebrow}
            </p>
            <p
              className="text-ink-faint font-mono text-[11px] tracking-[0.22em] uppercase tabular-nums"
              aria-label={`Slide ${active + 1} of ${count}`}
            >
              {counter}
            </p>
          </div>

          {/* Caption */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[5.5rem]">
            <p className="font-script text-ink-soft text-2xl leading-snug break-words md:text-3xl">
              {current.caption}
            </p>
            {current.location && (
              <p className="text-ink-faint mt-2 font-mono text-[11px] tracking-[0.18em] break-words uppercase">
                {current.location}
              </p>
            )}
          </div>

          {/* Thumbnails — desktop grid */}
          <ul className="hidden grid-cols-2 gap-3 lg:grid" aria-label="Choose a slide">
            {slides.map((slide, idx) => (
              <li key={`grid-${slide.src}`}>
                <ThumbButton
                  slide={slide}
                  index={idx}
                  active={active}
                  reduce={reduce ?? false}
                  onSelect={goTo}
                  variant="grid"
                />
              </li>
            ))}
          </ul>

          {/* Thumbnails — mobile horizontal scroll */}
          <ul
            className={cn(
              'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:hidden',
              '-mx-4 px-4 sm:-mx-8 sm:px-8',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
            aria-label="Choose a slide"
          >
            {slides.map((slide, idx) => (
              <li key={`scroll-${slide.src}`} className="w-24 shrink-0">
                <ThumbButton
                  slide={slide}
                  index={idx}
                  active={active}
                  reduce={reduce ?? false}
                  onSelect={goTo}
                  variant="scroll"
                />
              </li>
            ))}
          </ul>

          {/* Prev / Next */}
          <div className="border-ink/15 flex items-center gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goPrev}
              aria-label="Previous slide"
              className="hover:border-rust hover:text-rust"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goNext}
              aria-label="Next slide"
              className="hover:border-rust hover:text-rust"
            >
              <ChevronRight />
            </Button>
            <span className="text-ink-faint font-script ml-auto hidden text-base italic sm:inline">
              {reduce
                ? 'Use arrows to browse'
                : isPaused
                  ? 'Paused'
                  : `Auto-advances every ${Math.round(autoAdvanceMs / 1000)}s`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThumbButton({
  slide,
  index,
  active,
  reduce,
  onSelect,
  variant,
}: {
  slide: PhotoCarouselSlide;
  index: number;
  active: number;
  reduce: boolean;
  onSelect: (i: number) => void;
  variant: 'grid' | 'scroll';
}) {
  const isActive = index === active;
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-label={`Go to slide ${index + 1}: ${slide.caption}`}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'group/thumb focus-visible:ring-rust relative block aspect-[4/3] w-full snap-start overflow-hidden rounded-md focus-visible:ring-2 focus-visible:outline-none',
        'transition-all duration-200',
        isActive
          ? 'border-rust shadow-e1 border-2'
          : 'border-ink/25 hover:border-ink/55 border border-dashed',
      )}
    >
      <Image
        src={slide.src}
        alt=""
        fill
        sizes={variant === 'grid' ? '160px' : '96px'}
        className={cn(
          'object-cover',
          !reduce && 'transition-transform duration-200 group-hover/thumb:scale-[1.02]',
          !isActive && 'opacity-90',
        )}
      />
    </button>
  );
}
