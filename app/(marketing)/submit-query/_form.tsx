'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, Mail, ShieldCheck, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldTextarea } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TurnstileWidget } from '@/components/marketing/turnstile-widget';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import {
  citizenQuerySchema,
  CITIZEN_QUERY_CATEGORY_LABELS,
  MESSAGE_MAX,
  type CitizenQueryInput,
} from '@/lib/validators/citizen-query';

import { createCitizenQuery } from './_actions';

export function SubmitQueryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CitizenQueryInput>({
    resolver: standardSchemaResolver(citizenQuerySchema),
    defaultValues: {
      fullName: '',
      email: '',
      category: 'general',
      subject: '',
      message: '',
      consent: false as unknown as true,
      website: '',
    },
    mode: 'onBlur',
  });

  // useWatch is memoizable; form.watch() is not (React Compiler bails).
  // useWatch is memoizable; form.watch() is not (React Compiler bails).
  const messageValue = useWatch({ control: form.control, name: 'message' }) ?? '';
  const consentValue = useWatch({ control: form.control, name: 'consent' });
  const messageLength = messageValue.length;
  const messageNearMax = messageLength / MESSAGE_MAX >= 0.9;

  function onSubmit(values: CitizenQueryInput) {
    startTransition(async () => {
      const result = await createCitizenQuery(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      router.push(
        `/submit-query/confirmation?ref=${encodeURIComponent(
          result.data.referenceNumber,
        )}&email=${encodeURIComponent(result.data.submitterEmail)}`,
      );
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-ink/30 bg-paper rounded-md border p-6 md:p-8"
    >
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...form.register('website')}
        />
      </div>

      <Stagger as="div">
        <StaggerItem className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" required error={form.formState.errors.fullName?.message}>
            <div className="flex items-center gap-2">
              <User className="text-ink-faint size-4" aria-hidden="true" />
              <FieldInput
                type="text"
                placeholder="Juan dela Cruz"
                autoComplete="name"
                {...form.register('fullName')}
              />
            </div>
          </Field>

          <Field
            label="Email · for our reply"
            required
            error={form.formState.errors.email?.message}
          >
            <div className="flex items-center gap-2">
              <Mail className="text-ink-faint size-4" aria-hidden="true" />
              <FieldInput
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                {...form.register('email')}
              />
            </div>
          </Field>
        </StaggerItem>

        <StaggerItem>
          <Field
            label="Category"
            required
            className="mt-4"
            error={form.formState.errors.category?.message}
          >
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="border-ink/20 bg-paper text-ink h-10 w-full rounded-md px-3 text-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CITIZEN_QUERY_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </StaggerItem>

        <StaggerItem>
          <Field
            label="Subject · 1 line"
            required
            className="mt-4"
            error={form.formState.errors.subject?.message}
          >
            <FieldInput
              type="text"
              placeholder="What is your message about?"
              maxLength={160}
              {...form.register('subject')}
            />
          </Field>
        </StaggerItem>

        <StaggerItem>
          <Field
            label="Message"
            required
            className="mt-4"
            error={form.formState.errors.message?.message}
          >
            <FieldTextarea
              placeholder="Tell us what's on your mind. You may write in English, Tagalog or Hiligaynon."
              rows={5}
              maxLength={MESSAGE_MAX}
              {...form.register('message')}
            />
            <p
              aria-live="polite"
              className={`mt-2 text-right font-mono text-xs tabular-nums ${
                messageNearMax ? 'text-warn' : 'text-ink-faint'
              }`}
            >
              {messageLength.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}
            </p>
          </Field>
        </StaggerItem>

        <StaggerItem>
          <p className="text-ink-faint mt-4 text-xs leading-relaxed italic">
            <ShieldCheck className="mr-1 inline size-3" aria-hidden="true" />
            Hidden honeypot field &ldquo;website&rdquo; — a real human never sees it; bots fill it
            and get rejected.
          </p>
        </StaggerItem>

        <StaggerItem className="mt-6">
          <TurnstileWidget
            onToken={(token) => form.setValue('turnstileToken', token, { shouldValidate: false })}
          />
        </StaggerItem>

        {/* Consent */}
        <StaggerItem>
          <label className="border-ink/30 mt-4 flex items-start gap-3 rounded-md border border-dashed p-4">
            <input
              type="checkbox"
              checked={consentValue === true}
              onChange={(e) => form.setValue('consent', e.target.checked as unknown as true)}
              aria-required="true"
              className="accent-rust mt-1 size-4 shrink-0"
            />
            <span className="text-navy-primary font-display text-sm leading-relaxed italic">
              By submitting, you consent to the LGU storing your name and email only to respond to
              this query, per the Data Privacy Act of 2012 (RA 10173). Your message may be redacted
              before any public summary.
            </span>
          </label>
        </StaggerItem>
        {form.formState.errors.consent && (
          <p role="alert" className="text-warn mt-2 text-xs font-medium">
            {form.formState.errors.consent.message}
          </p>
        )}

        {form.formState.errors.root && (
          <p role="alert" className="text-warn mt-3 text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <StaggerItem className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-faint text-xs italic">min 20 characters</p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild className="font-script text-base">
              <Link href="/">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="font-script text-base transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
            >
              {isPending ? 'Sending…' : 'Send query'}
              <ArrowRight />
            </Button>
          </div>
        </StaggerItem>
      </Stagger>
    </form>
  );
}
