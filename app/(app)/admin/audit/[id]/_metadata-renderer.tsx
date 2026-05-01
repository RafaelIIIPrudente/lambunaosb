import { cn } from '@/lib/utils';

type Props = {
  metadata: Record<string, unknown>;
};

const MAX_INLINE_KEYS = 12;

// Renders a flat object as a key-value table. Falls back to a JSON <pre> when
// any value is itself an object/array (i.e. shape isn't shallow), or when the
// metadata exceeds MAX_INLINE_KEYS.
export function MetadataRenderer({ metadata }: Props) {
  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return <p className="text-ink-faint text-xs italic">No metadata recorded for this entry.</p>;
  }

  const isShallow = entries.length <= MAX_INLINE_KEYS && entries.every(([, v]) => isPrimitive(v));

  if (!isShallow) {
    return (
      <pre className="bg-paper-2 border-ink/15 text-ink overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  }

  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-ink-faint font-mono break-all">{key}</dt>
          <dd
            className={cn(
              'text-ink-soft break-words',
              typeof value === 'string' ? 'font-medium' : 'font-mono',
            )}
          >
            {renderPrimitive(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function isPrimitive(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}

function renderPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
