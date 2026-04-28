import { cn } from '@/lib/utils';

/**
 * Wireframe-aesthetic image placeholder per user-supplied visual target.
 * Dashed border + hatched diagonal fill + monospace caption.
 * Used as a stand-in until real cover/portrait imagery is loaded.
 */
export function ImagePlaceholder({
  label = 'Cover image',
  ratio = '16:9',
  className,
  caption = true,
}: {
  label?: string;
  ratio?: '16:9' | '4:3' | '1:1' | '3:4';
  className?: string;
  caption?: boolean;
}) {
  const ratioClass =
    ratio === '16:9'
      ? 'aspect-[16/9]'
      : ratio === '4:3'
        ? 'aspect-[4/3]'
        : ratio === '3:4'
          ? 'aspect-[3/4]'
          : 'aspect-square';

  return (
    <div
      role="img"
      aria-label={`${label} placeholder, ${ratio}`}
      className={cn(
        'border-ink/25 bg-hatched flex items-center justify-center rounded-md border border-dashed',
        ratioClass,
        className,
      )}
    >
      {caption && (
        <span className="text-ink-faint font-mono text-xs tracking-wide">
          [ {label} · {ratio} ]
        </span>
      )}
    </div>
  );
}
