import { CheckCircle2, FileText, Plus, Upload, X } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';

const CHECKS = [
  'Signed PDF (final version only)',
  'All sponsors confirmed',
  'Linked to a meeting record',
  "OCR'd for search (auto)",
];

export const metadata = { title: 'Upload a resolution' };

export default function UploadResolutionPage() {
  return (
    <div>
      <AdminPageHeader title="Upload a resolution" />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          {/* Drop zone */}
          <div className="border-ink/30 rounded-md border-2 border-dashed p-12 text-center">
            <Upload className="text-rust mx-auto size-12" aria-hidden="true" />
            <p className="text-ink font-script mt-5 text-2xl">Drop a PDF here</p>
            <p className="text-ink-faint mt-2 font-mono text-xs">
              or click to browse · max 25 MB · PDFs only
            </p>
            <Button className="font-script mt-5 text-base">
              <FileText />
              Choose file
            </Button>
          </div>

          {/* Upload progress */}
          <div className="flex items-center gap-3">
            <FileText className="text-ink-faint size-5" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink font-medium">RES-2026-014_v3_signed.pdf</span>
                <button aria-label="Remove" className="text-ink-faint hover:text-warn">
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-ink-faint mt-0.5 font-mono text-[11px]">
                1.2 MB · 68% uploaded · est. 14s on 3G
              </p>
              <div className="bg-paper-3 mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-rust h-full w-[68%]" />
              </div>
            </div>
          </div>

          {/* Metadata form */}
          <section className="border-ink/20 rounded-md border p-6">
            <p className="text-rust mb-5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Metadata · all fields required except notes
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Resolution №">
                <FieldInput defaultValue="2026-014" />
              </Field>
              <Field label="Type">
                <FieldSelect defaultValue="ordinance">
                  <option value="ordinance">&gt; Ordinance</option>
                  <option value="resolution">Resolution</option>
                </FieldSelect>
              </Field>
              <Field label="Title" className="md:col-span-2">
                <FieldInput defaultValue="An ordinance regulating tricycle franchising in poblacion areas" />
              </Field>
              <Field label="Date filed">
                <FieldInput type="date" defaultValue="2026-05-28" />
              </Field>
              <Field label="Linked meeting">
                <FieldSelect defaultValue="reg-14">
                  <option value="reg-14">Reg. Session #14</option>
                </FieldSelect>
              </Field>
            </div>

            <p className="text-rust mt-5 mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Sponsor(s) · multi-select
            </p>
            <div className="flex flex-wrap gap-1.5">
              <SponsorChip name="Hon. [Member 3]" />
              <SponsorChip name="Hon. [Member 7]" />
              <button className="border-ink/30 text-ink-soft hover:border-ink font-script rounded-pill inline-flex h-8 items-center gap-1.5 border border-dashed px-3 text-sm">
                <Plus className="size-3.5" /> Add
              </button>
            </div>
          </section>
        </div>

        <aside className="sticky top-20 flex h-fit flex-col gap-5">
          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Preview
            </p>
            <p className="text-ink-faint mb-3 text-xs italic">How citizens will see it</p>
            <div className="bg-paper-2/60 border-ink/15 rounded-md border p-4">
              <p className="text-rust font-mono text-[10px] tracking-wide uppercase">
                RES-2026-014 · Ordinance
              </p>
              <p className="text-ink font-display mt-2 text-base leading-snug font-semibold">
                An ordinance regulating tricycle franchising in poblacion areas
              </p>
              <p className="text-ink-soft mt-3 text-xs italic">
                Sponsored by Hon. [Member 3], Hon. [Member 7] · Approved Jun 12, 2026
              </p>
              <Badge variant="success" className="mt-3">
                ✓ Approved
              </Badge>
            </div>
          </div>

          <div className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Upload checklist
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {CHECKS.map((c) => (
                <li key={c} className="text-ink-soft inline-flex items-start gap-2 italic">
                  <CheckCircle2
                    className="text-success mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SponsorChip({ name }: { name: string }) {
  return (
    <span className="bg-ink text-paper rounded-pill inline-flex h-8 items-center gap-1.5 px-3 font-mono text-[10px] tracking-wide uppercase">
      {name}
      <button aria-label={`Remove ${name}`} className="hover:opacity-75">
        <X className="size-3" />
      </button>
    </span>
  );
}
