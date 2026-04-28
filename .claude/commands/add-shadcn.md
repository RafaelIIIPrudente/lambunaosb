---
description: Install shadcn/ui components and explain what each does
argument-hint: <component-name> [<component-name> ...]
---

The user wants to add shadcn/ui components: `$ARGUMENTS`.

Run:

```bash
pnpm dlx shadcn@latest add $ARGUMENTS
```

After the install completes:

1. List each newly-created file under `components/ui/` from the install output.
2. For each component, give a one-line description of what it does and a one-line usage example.
3. If the components have known peer dependencies (e.g., `data-table` needs `@tanstack/react-table`, `chart` needs `recharts`), confirm they are installed; if not, suggest the install command.
4. If any of the requested components do not exist in the shadcn registry, state which ones and ask whether to add them as custom components or skip.

Constraints:

- Do not modify any file outside `components/ui/` without confirming first.
- Always use `cn()` from `@/lib/utils` for any conditional class composition in usage examples — never concatenate Tailwind classes manually.
- shadcn components are owned source — note that future `add` invocations will overwrite them; warn if the user has customized one being re-added.
