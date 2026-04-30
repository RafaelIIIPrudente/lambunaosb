'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, CheckCircle2, Circle, FileText, Save, Upload, X } from 'lucide-react';

import { createResolution, uploadResolutionPdf } from '@/app/_actions/resolutions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect, FieldTextarea } from '@/components/ui/field';
import { formatBytes } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  createResolutionSchema,
  type CreateResolutionInput,
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
} from '@/lib/validators/resolution';

type Option = { id: string; label: string };

type Props = {
  sponsorOptions: Option[];
  meetingOptions: Option[];
  tenantId: string;
};

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const MAX_BYTES = 25 * 1024 * 1024;
const PDF_BUCKET = 'resolutions-pdfs';

export function NewResolutionForm({ sponsorOptions, meetingOptions, tenantId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [coSponsorIds, setCoSponsorIds] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<CreateResolutionInput>({
    resolver: standardSchemaResolver(createResolutionSchema),
    defaultValues: {
      type: 'resolution',
      title: '',
      bodyMd: '',
      primarySponsorId: undefined,
      coSponsorIds: [],
      meetingId: undefined,
      committeeId: undefined,
      tags: [],
      dateFiled: TODAY_DATE,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const [watchedTitle, watchedType, watchedPrimarySponsor, watchedMeetingId] = useWatch({
    control: form.control,
    name: ['title', 'type', 'primarySponsorId', 'meetingId'],
  });

  const primarySponsorLabel =
    sponsorOptions.find((s) => s.id === watchedPrimarySponsor)?.label ?? null;
  const coSponsorLabels = coSponsorIds
    .map((id) => sponsorOptions.find((s) => s.id === id)?.label)
    .filter((x): x is string => Boolean(x));
  const sponsorPreviewLine = primarySponsorLabel
    ? coSponsorLabels.length > 0
      ? `Sponsored by ${primarySponsorLabel} · +${coSponsorLabels.length}`
      : `Sponsored by ${primarySponsorLabel}`
    : coSponsorLabels.length > 0
      ? `Co-sponsored by ${coSponsorLabels.join(', ')}`
      : 'No sponsor selected yet';

  const checklist = [
    { id: 'pdf', label: 'Signed PDF attached', done: pdfFile !== null },
    {
      id: 'sponsors',
      label: 'At least one sponsor selected',
      done: !!watchedPrimarySponsor || coSponsorIds.length > 0,
    },
    { id: 'meeting', label: 'Linked to a meeting', done: !!watchedMeetingId },
    { id: 'ocr', label: "OCR'd for search", done: false, deferred: true },
  ];

  function validatePdf(file: File): string | null {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are accepted.';
    }
    if (file.size > MAX_BYTES) {
      return `File is too large. Max ${formatBytes(MAX_BYTES)}.`;
    }
    return null;
  }

  function attachPdf(file: File) {
    const err = validatePdf(file);
    if (err) {
      setPdfError(err);
      setPdfFile(null);
      return;
    }
    setPdfError(null);
    setPdfFile(file);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) attachPdf(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) attachPdf(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function toggleCoSponsor(id: string) {
    setCoSponsorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onSubmit(values: CreateResolutionInput) {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: CreateResolutionInput = {
      ...values,
      coSponsorIds,
      tags,
      primarySponsorId: values.primarySponsorId || null,
      meetingId: values.meetingId || null,
    };

    startTransition(async () => {
      setProgressLabel('Saving metadata…');
      const createResult = await createResolution(payload);
      if (!createResult.ok) {
        setProgressLabel(null);
        form.setError('root', { message: createResult.error });
        return;
      }

      const resolutionId = createResult.data.id;

      if (!pdfFile) {
        setProgressLabel(null);
        router.push(`/admin/resolutions/${resolutionId}`);
        router.refresh();
        return;
      }

      setProgressLabel(`Uploading ${formatBytes(pdfFile.size)}…`);
      const safeName = pdfFile.name.replace(/[^A-Za-z0-9._-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = `${tenantId}/${resolutionId}/${timestamp}_${safeName}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(path, pdfFile, { contentType: 'application/pdf', upsert: false });

      if (uploadError) {
        setProgressLabel(null);
        // Resolution was created; PDF upload failed. Send user to detail page so
        // they can retry the upload via the sidebar without losing the metadata.
        form.setError('root', {
          message: `Resolution saved, but PDF upload failed: ${uploadError.message}. Retry from the detail page.`,
        });
        router.push(`/admin/resolutions/${resolutionId}`);
        router.refresh();
        return;
      }

      setProgressLabel('Recording PDF…');
      const recordResult = await uploadResolutionPdf({
        resolutionId,
        storagePath: path,
        byteSize: pdfFile.size,
      });
      setProgressLabel(null);
      if (!recordResult.ok) {
        form.setError('root', {
          message: `PDF uploaded, but failed to record: ${recordResult.error}. Retry from the detail page.`,
        });
        router.push(`/admin/resolutions/${resolutionId}`);
        router.refresh();
        return;
      }

      router.push(`/admin/resolutions/${resolutionId}`);
      router.refresh();
    });
  }

  const previewBadgeVariant = pdfFile ? 'success' : 'outline';
  const previewBadgeLabel = pdfFile ? 'Ready to upload' : 'Draft';

  return (
    <form
      className="grid gap-5 lg:grid-cols-[1fr_320px]"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-5">
        {/* Drop-zone */}
        {pdfFile ? (
          <div className="border-ink/15 flex flex-wrap items-start justify-between gap-3 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <FileText className="text-rust mt-0.5 size-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-ink text-sm font-medium break-all">{pdfFile.name}</p>
                <p className="text-ink-faint mt-0.5 font-mono text-[11px]">
                  {formatBytes(pdfFile.size)} · ready to upload on save
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPdfFile(null)}
              disabled={isPending}
              aria-label="Remove selected PDF"
              className="font-medium"
            >
              <X />
              Remove
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Drop a PDF here, or click to browse"
            className={cn(
              'border-ink/30 focus-visible:ring-rust/40 cursor-pointer rounded-md border-2 border-dashed p-10 text-center transition-colors outline-none focus-visible:ring-2',
              isDragging && 'border-rust bg-rust/5',
            )}
          >
            <Upload className="text-rust mx-auto size-10" aria-hidden="true" />
            <p className="text-ink font-script mt-4 text-2xl">Drop a PDF here</p>
            <p className="text-ink-faint mt-2 font-mono text-xs">
              or click to browse · max {formatBytes(MAX_BYTES)} · PDFs only
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-4 font-medium"
            >
              <FileText />
              Choose file
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onPickFile}
          className="sr-only"
          aria-label="PDF file picker"
        />
        {pdfError && (
          <p role="alert" className="text-warn text-sm font-medium">
            {pdfError}
          </p>
        )}

        {/* Metadata */}
        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Metadata · all fields required
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Type" required>
                <FieldSelect {...form.register('type')}>
                  {RESOLUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RESOLUTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
              <Field label="Date filed" required error={form.formState.errors.dateFiled?.message}>
                <FieldInput type="date" {...form.register('dateFiled')} />
              </Field>
            </div>

            <Field label="Title" required error={form.formState.errors.title?.message}>
              <FieldInput
                placeholder="An ordinance regulating tricycle franchising in poblacion areas"
                {...form.register('title')}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Primary sponsor">
                <FieldSelect
                  {...form.register('primarySponsorId', {
                    setValueAs: (v) => (v === '' || v == null ? null : v),
                  })}
                >
                  <option value="">Select an SB member…</option>
                  {sponsorOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
              <Field label="Linked meeting">
                <FieldSelect
                  {...form.register('meetingId', {
                    setValueAs: (v) => (v === '' || v == null ? null : v),
                  })}
                >
                  <option value="">No linked meeting yet</option>
                  {meetingOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
            </div>

            <fieldset className="border-ink/25 rounded-md border px-4 pt-3 pb-3">
              <legend className="text-rust px-1 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                Co-sponsors · multi-select
              </legend>
              {sponsorOptions.length === 0 ? (
                <p className="text-ink-faint font-mono text-xs">No SB members available.</p>
              ) : (
                <ul role="group" aria-label="Co-sponsors" className="mt-2 flex flex-wrap gap-1.5">
                  {sponsorOptions.map((s) => {
                    const active = coSponsorIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => toggleCoSponsor(s.id)}
                          aria-pressed={active}
                          className={cn(
                            'border-ink/30 text-ink-soft hover:border-ink rounded-pill focus-visible:ring-rust/40 inline-flex h-8 items-center gap-1.5 border px-3 text-sm transition-colors outline-none focus-visible:ring-2',
                            active && 'bg-ink border-ink text-paper hover:border-ink',
                          )}
                        >
                          {s.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>

            <Field label="Tags" hint="Comma-separated, e.g. health, infrastructure, public-safety">
              <FieldInput
                placeholder="health, infrastructure"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </Field>

            <details className="border-ink/15 rounded-md border">
              <summary className="text-ink-soft hover:text-ink focus-visible:ring-rust/40 cursor-pointer rounded-md px-4 py-3 font-mono text-[11px] font-medium tracking-[0.18em] uppercase outline-none focus-visible:ring-2">
                Optional · markdown body
              </summary>
              <div className="border-ink/15 border-t px-4 py-3">
                <FieldTextarea
                  rows={10}
                  placeholder={'WHEREAS, …\n\nNOW, THEREFORE, BE IT RESOLVED, …'}
                  {...form.register('bodyMd')}
                />
                <p className="text-ink-faint mt-2 font-mono text-[11px]">
                  Optional plain-markdown summary or transcribed body. The PDF is the canonical
                  record; this field exists for search and accessibility.
                </p>
              </div>
            </details>
          </div>
        </section>

        {form.formState.errors.root && (
          <p role="alert" className="text-warn text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending} className="font-medium">
            <Save />
            {progressLabel ?? (isPending ? 'Saving…' : 'Save resolution')}
            <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => router.push('/admin/resolutions')}
            className="font-medium"
          >
            <X />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-5" aria-live="polite">
        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Preview
          </p>
          <p className="text-ink-faint mb-3 text-xs italic">How citizens will see it</p>
          <div className="bg-paper-2/60 border-ink/15 rounded-md border p-4">
            <p className="text-rust font-mono text-[10px] tracking-wide uppercase">
              Pending № · {RESOLUTION_TYPE_LABELS[watchedType]}
            </p>
            <p className="text-ink font-display mt-2 text-base leading-snug font-semibold">
              {watchedTitle.trim().length > 0 ? watchedTitle : 'Untitled resolution'}
            </p>
            <p className="text-ink-soft mt-3 text-xs italic">{sponsorPreviewLine}</p>
            <Badge variant={previewBadgeVariant} className="mt-3">
              {previewBadgeLabel}
            </Badge>
          </div>
        </section>

        <section className="border-ink/15 rounded-md border p-5">
          <p className="text-rust mb-3 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Upload checklist
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {checklist.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'inline-flex items-start gap-2',
                  item.done ? 'text-ink' : 'text-ink-soft',
                  item.deferred && 'text-ink-faint',
                )}
              >
                {item.done ? (
                  <CheckCircle2
                    className="text-success mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle className="text-ink-faint mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className={cn(item.deferred && 'italic')}>
                  {item.label}
                  {item.deferred && (
                    <span className="text-ink-faint ml-1 font-mono text-[10px] not-italic">
                      (coming soon)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </form>
  );
}
