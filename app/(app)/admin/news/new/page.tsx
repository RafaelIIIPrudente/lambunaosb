import { ChevronRight, Globe, Lock, Plus, Save, Upload, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';

const TOOLBAR = ['B', 'I', 'U', 'S', '"', 'H1', 'H2', 'H3', '·', '1.', '—', '🔗', '🖼', '⤓'];

export const metadata = { title: 'New post' };

export default function NewPostPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <nav
          aria-label="Breadcrumb"
          className="text-ink-faint flex items-center gap-1.5 font-mono text-xs"
        >
          <span>News</span>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">New post</span>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="font-script text-base">
            <Save />
            Save draft
          </Button>
          <Button className="font-script text-base">
            <Upload />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <article className="border-ink/20 rounded-md border p-6">
          <Field label="Headline">
            <FieldInput defaultValue="Free vaccination drive — Brgy. Cabatangan, June 22" />
          </Field>

          <div className="border-ink/15 mt-4 flex flex-wrap items-center gap-1 rounded-md border bg-transparent p-1.5">
            {TOOLBAR.map((t) => (
              <button
                key={t}
                className="text-ink-soft hover:bg-paper-2 inline-flex size-7 items-center justify-center rounded-sm font-mono text-xs"
              >
                {t}
              </button>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 pr-1">
              <Badge variant="outline" className="h-6 px-2">
                EN
              </Badge>
              <Badge variant="warn" className="h-6 px-2">
                [TL] needed
              </Badge>
              <Badge variant="warn" className="h-6 px-2">
                [HIL] needed
              </Badge>
            </span>
          </div>

          <div className="text-navy-primary font-display mt-5 flex flex-col gap-3 text-base leading-relaxed italic">
            <p>
              Brgy. Cabatangan will host a{' '}
              <strong className="font-semibold not-italic">free vaccination drive</strong> on June
              22 from 8 AM to noon at the covered court.
            </p>
            <p>
              The drive is open to all residents and visitors who bring a valid ID. Vaccines
              available include:
            </p>
            <ul className="text-ink list-disc space-y-1 pl-5 text-sm not-italic">
              <li>Tetanus toxoid (adults)</li>
              <li>Anti-rabies (post-exposure)</li>
              <li>Hepatitis B (children &lt; 12)</li>
            </ul>
          </div>

          <div className="mt-5">
            <ImagePlaceholder ratio="16:9" label="Image: covered court · drag here" />
          </div>

          <p className="text-ink-soft mt-5 text-sm italic">
            For more information, contact the Office of the Sanggunian at (033) 333-1234.
          </p>
        </article>

        <aside className="flex flex-col gap-5">
          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Visibility
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-rust text-paper border-rust font-script inline-flex h-10 items-center justify-center gap-1.5 rounded-md border text-base">
                <Globe className="size-4" />
                Public
              </button>
              <button className="border-ink/25 text-ink hover:bg-paper-2 font-script inline-flex h-10 items-center justify-center gap-1.5 rounded-md border text-base">
                <Lock className="size-4" />
                Admin
              </button>
            </div>
            <p className="text-ink-faint mt-3 text-xs italic">
              Public posts appear on the citizen-facing News feed.
            </p>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Schedule
            </p>
            <div className="flex gap-2">
              <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-9 flex-1 items-center justify-center rounded-md border border-dashed text-sm">
                Now
              </button>
              <button className="border-ink/25 text-ink hover:bg-paper-2 font-script inline-flex h-9 flex-1 items-center justify-center rounded-md border text-sm">
                Schedule…
              </button>
            </div>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="h-7 px-2.5">
                Health <X className="ml-1 size-2.5" />
              </Badge>
              <Badge variant="outline" className="h-7 px-2.5">
                Brgy. Cabatangan <X className="ml-1 size-2.5" />
              </Badge>
              <button className="border-ink/30 text-ink-soft hover:border-ink rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 font-mono text-[10px] tracking-wide uppercase">
                <Plus className="size-3" /> Add
              </button>
            </div>
          </div>

          <div className="border-ink/20 rounded-md border p-4">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Cover image
            </p>
            <ImagePlaceholder ratio="16:9" label="16:9 cover" />
            <button className="border-ink/30 text-ink hover:bg-paper-2 font-script mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed text-sm">
              <Upload className="size-3.5" />
              Upload
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
