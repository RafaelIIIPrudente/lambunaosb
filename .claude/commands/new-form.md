---
description: Scaffold a Client Component form with react-hook-form + Zod + shadcn Form
argument-hint: <FormName> [field1:type field2:type ...]
---

The user wants a new form: `$ARGUMENTS`.

Parse the form name and any field hints. If the field list is unclear, ask the user for fields (name, type, validation rules) before scaffolding.

Create:

1. `lib/validators/<form-name>.ts` — Zod schema and `export type X = z.infer<typeof Schema>`.

2. `components/forms/<FormName>.tsx` — Client Component (`'use client'` at the top) using:
   - `useForm` from `react-hook-form`
   - `zodResolver` from `@hookform/resolvers/zod`
   - `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` from `@/components/ui/form`
   - shadcn primitives (`Input`, `Textarea`, `Select`, etc.) per field type
   - `Button` for submit, with `disabled={form.formState.isSubmitting}`

3. A matching server action at `app/_actions/<form-name>.ts` (or colocated next to the route that uses it). The action must:
   - Start with `'use server'`, then `import 'server-only'`
   - Re-import the same Zod schema from `lib/validators/`
   - Validate via `Schema.safeParse`
   - Return `Result<T>`

4. Wire the form to the action via `<form action={action}>` for progressive enhancement, with `handleSubmit` wrapping for client-side validation feedback. Show field errors via `<FormMessage />`.

Constraints:

- TypeScript strict and `noUncheckedIndexedAccess` — explicitly handle every undefined case.
- Import the Zod schema in BOTH the server action and the client form so validation is consistent.
- Never use `any`. Use `z.infer` for derived types.
- Use `cn()` for any conditional class composition.
- Never trust client-typed values in the action — Zod is the boundary.
