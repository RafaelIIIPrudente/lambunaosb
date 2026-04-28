import { Edit3, Eye, Globe, Lock, Pin, Trash2 } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';

const POSTS = [
  {
    id: 'p1',
    author: '[Secretary]',
    age: '3h ago',
    visibility: 'public' as const,
    title: 'Free vaccination drive — Brgy. Cabatangan, June 22',
    body: 'Brgy. Cabatangan will host a free vaccination drive on June 22 from 8 AM to noon at the covered court. Open to all residents bringing valid ID.',
    cover: true,
    views: 412,
    likes: 34,
    shares: 12,
  },
  {
    id: 'p2',
    author: '[Secretary]',
    age: 'Yesterday',
    visibility: 'admin_only' as const,
    title: 'Notice: Session Hall closed Saturday for re-roofing',
    body: 'All sessions scheduled for the morning of June 21 are moved to the Annex. Recordings continue as normal.',
    cover: false,
    views: 412,
  },
];

const FILTERS = [
  { label: 'All posts', count: 47, active: true },
  { label: 'Public', count: 38 },
  { label: 'Admin only', count: 9 },
  { label: 'Drafts', count: 2 },
  { label: 'Pinned', count: 1 },
];

const POST_TYPES = ['Announcement', 'Notice', 'Resolution highlight', 'Event', 'Press release'];

export const metadata = { title: 'News' };

export default function NewsAdminPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <AdminPageHeader title="News & Updates" />
        <ul className="flex flex-col gap-5">
          {POSTS.map((post) => (
            <li key={post.id}>
              <article className="border-ink/20 bg-paper rounded-md border p-5">
                <header className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-paper-3 border-ink/15 inline-flex size-9 shrink-0 items-center justify-center rounded-full border"
                  />
                  <div className="flex-1">
                    <p className="text-ink font-medium">{post.author}</p>
                    <p className="text-ink-faint mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px]">
                      {post.age}
                      <span aria-hidden="true">·</span>
                      {post.visibility === 'public' ? (
                        <>
                          <Globe className="size-3" aria-hidden="true" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="size-3" aria-hidden="true" />
                          Admin only
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-ink-faint hover:text-ink p-1"
                      aria-label="Edit"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="text-ink-faint hover:text-warn p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </header>

                <h2 className="text-ink font-display mt-4 text-xl font-bold">{post.title}</h2>
                <p className="text-ink-soft mt-2 text-sm leading-relaxed italic">{post.body}</p>

                {post.cover && (
                  <div className="mt-4">
                    <ImagePlaceholder ratio="16:9" />
                  </div>
                )}

                <footer className="text-ink-faint mt-4 flex items-center justify-between font-mono text-[11px]">
                  <p className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" /> {post.views} views
                    </span>
                    {post.likes !== undefined && <span>{post.likes} likes</span>}
                    {post.shares !== undefined && <span>{post.shares} shares</span>}
                  </p>
                  <button
                    type="button"
                    className="border-ink/30 text-ink hover:bg-paper-2 font-script rounded-pill inline-flex h-7 items-center gap-1.5 border border-dashed px-3 text-sm transition-colors"
                  >
                    <Pin className="size-3" aria-hidden="true" />
                    Pin
                  </button>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col gap-5">
        <RailCard label="Filters">
          <ul className="flex flex-col gap-1">
            {FILTERS.map((f) => (
              <li key={f.label}>
                <button
                  type="button"
                  aria-current={f.active ? 'true' : undefined}
                  className="hover:bg-paper-2 aria-[current=true]:bg-rust/10 aria-[current=true]:text-rust flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors"
                >
                  <span className="font-script text-base">{f.label}</span>
                  <span className="text-ink-faint font-mono text-[11px]">({f.count})</span>
                </button>
              </li>
            ))}
          </ul>
        </RailCard>

        <RailCard label="Post types">
          <ul className="flex flex-col">
            {POST_TYPES.map((t) => (
              <li
                key={t}
                className="text-ink-soft hover:text-ink font-script border-ink/10 border-b border-dashed py-2 text-base last:border-0"
              >
                {t}
              </li>
            ))}
          </ul>
        </RailCard>
      </aside>
    </div>
  );
}

function RailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-ink/20 rounded-md border p-4">
      <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
