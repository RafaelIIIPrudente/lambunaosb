import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Globe, Plus, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';
import { safeBuildtimeQuery } from '@/lib/db/queries/_safe';
import { getAllMemberIds, getMemberById } from '@/lib/db/queries/members';

export async function generateStaticParams() {
  return safeBuildtimeQuery(() => getAllMemberIds(), []);
}

export default async function MemberEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <nav
          aria-label="Breadcrumb"
          className="text-ink-faint flex items-center gap-1.5 font-mono text-xs"
        >
          <Link href="/admin/members" className="hover:text-rust">
            SB Members
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href={`/admin/members/${id}`} className="hover:text-rust">
            {member.honorific} [Member 1]
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">Edit</span>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="font-script text-base">
            Cancel
          </Button>
          <Button className="font-script text-base">✓ Save changes</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Photo column */}
        <aside>
          <div className="border-ink/20 bg-paper-2 flex aspect-[3/4] items-center justify-center rounded-md border">
            <span className="text-ink-faint font-mono text-xs">[ Member photo ]</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed text-sm">
              <Upload className="size-3.5" />
              Upload
            </button>
            <button className="border-ink/30 text-ink hover:bg-paper-2 font-script inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed text-sm">
              <Trash2 className="size-3.5" />
              Remove
            </button>
          </div>
          <p className="text-ink-faint mt-3 font-mono text-[11px]">
            Recommended 3:4 portrait · ≥ 800px · ≤ 2 MB.
          </p>
        </aside>

        {/* Form column */}
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <FieldInput defaultValue={`${member.honorific} [Member 1]`} />
            </Field>
            <Field label="Honorific">
              <FieldInput defaultValue="Hon." />
            </Field>
            <Field label="Position">
              <FieldSelect defaultValue="sb_member">
                <option value="mayor">Mayor</option>
                <option value="vice_mayor">Vice Mayor</option>
                <option value="sb_member">&gt; SB Member</option>
              </FieldSelect>
            </Field>
            <Field label="Seniority">
              <FieldInput defaultValue="Senior Member" />
            </Field>
            <Field label="Term start">
              <FieldInput type="date" defaultValue="2025-07-01" />
            </Field>
            <Field label="Term end">
              <FieldInput type="date" defaultValue="2028-06-30" />
            </Field>
            <Field label="Email (optional)">
              <FieldInput type="email" defaultValue="member1@lambunao.gov.ph" />
            </Field>
            <Field label="Office phone">
              <FieldInput defaultValue="(033) 333-1234" />
            </Field>
          </div>

          <Field label="Committees">
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <CommitteeChip>HEALTH & SANITATION (CHAIR)</CommitteeChip>
              <CommitteeChip>EDUCATION</CommitteeChip>
              <CommitteeChip>WOMEN & FAMILY</CommitteeChip>
              <button className="border-ink/30 text-ink-soft hover:border-ink rounded-pill inline-flex h-7 items-center gap-1 border border-dashed px-2.5 font-mono text-[10px] tracking-wide uppercase">
                <Plus className="size-3" /> Add committee
              </button>
            </div>
          </Field>

          <Field
            label="Bio · supports [TL] / [HIL]"
            hint="EN · 124 / 600 · TL missing · HIL missing"
          >
            <textarea
              defaultValue="[Short biography placeholder — 2 to 4 sentences. Background, areas of advocacy, prior public service. Markdown allowed.]"
              rows={5}
              className="w-full bg-transparent text-sm leading-relaxed font-medium italic outline-none"
            />
          </Field>

          <label className="border-ink/30 mt-2 flex items-center justify-between rounded-md border border-dashed p-4">
            <span className="text-ink inline-flex items-center gap-2 font-medium">
              <Globe className="text-rust size-4" aria-hidden="true" />
              Show on public directory
            </span>
            <span
              aria-hidden="true"
              className="bg-rust inline-flex h-5 w-9 items-center rounded-full p-0.5"
            >
              <span className="bg-paper size-4 translate-x-4 rounded-full" />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function CommitteeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-ink text-paper rounded-pill inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-[10px] tracking-wide uppercase">
      {children}
      <button aria-label={`Remove ${children}`}>
        <X className="size-3" />
      </button>
    </span>
  );
}
