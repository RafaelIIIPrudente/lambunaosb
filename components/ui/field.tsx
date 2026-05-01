import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Print-form-style fieldset per user-supplied mockups.
 * Mono uppercase label sits over the input border, paper-colored background
 * "punches through" the line (HTML <fieldset>/<legend> pattern).
 *
 * Compose: <Field label="Full name"><FieldInput type="text" /></Field>
 */
function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reactId = React.useId();
  const id = `field-${reactId}`;
  return (
    <fieldset
      data-slot="field"
      data-error={error ? 'true' : undefined}
      aria-describedby={hint || error ? `${id}-help` : undefined}
      className={cn(
        'relative rounded-md border px-4 pt-3 pb-2.5 transition-colors',
        'border-ink/25 focus-within:border-rust',
        'data-[error=true]:border-warn',
        className,
      )}
    >
      <legend
        className={cn(
          'text-rust font-mono text-[10px] font-medium tracking-[0.18em] uppercase',
          'data-[error=true]:text-warn px-1',
        )}
      >
        {label}
        {required && (
          <span className="text-warn ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      {children}
      {(hint || error) && (
        <p
          id={`${id}-help`}
          role={error ? 'alert' : undefined}
          className={cn(
            'mt-1.5 text-xs leading-snug',
            error ? 'text-warn font-medium' : 'text-ink-faint',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </fieldset>
  );
}

function FieldInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="field-input"
      className={cn(
        'text-ink placeholder:text-ink-faint w-full bg-transparent text-sm font-medium outline-none',
        'public:text-base',
        className,
      )}
      {...props}
    />
  );
}

function FieldTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="field-textarea"
      className={cn(
        'text-ink placeholder:text-ink-faint field-sizing-content min-h-24 w-full bg-transparent text-sm leading-relaxed font-medium outline-none',
        'public:text-base',
        className,
      )}
      {...props}
    />
  );
}

function FieldSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="field-select"
      className={cn(
        'text-ink placeholder:text-ink-faint w-full bg-transparent text-sm font-medium outline-none',
        'public:text-base',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Field, FieldInput, FieldTextarea, FieldSelect };
