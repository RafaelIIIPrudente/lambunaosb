'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

type Props = {
  title: string;
  url: string;
};

const BUTTON_CLASS =
  'border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-9 items-center gap-1.5 border border-dashed px-3.5 text-sm transition-colors';

export function NewsSharePrint({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; nothing useful we can do without raising a toast lib.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleShare} className={BUTTON_CLASS}>
        <Share2 className="size-3.5" aria-hidden="true" />
        Share
      </button>
      {copied && (
        <span aria-live="polite" className="text-ink-soft font-mono text-xs">
          Link copied
        </span>
      )}
    </div>
  );
}
