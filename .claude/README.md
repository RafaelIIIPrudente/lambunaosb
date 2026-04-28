# .claude/ — Claude Code Configuration

This directory configures Claude Code for the `lambunaosb` project. Files here are loaded automatically when Claude Code opens the repo.

## Layout

```
.claude/
├── settings.json          Permission allow/ask lists + PostToolUse quality-gate hook
├── README.md              This file
├── commands/              Project slash commands (one .md per command)
│   ├── add-shadcn.md
│   ├── new-form.md
│   ├── new-mdx-page.md
│   ├── new-migration.md
│   ├── new-rls-policy.md
│   ├── new-route-handler.md
│   ├── new-route.md
│   ├── new-server-action.md
│   ├── new-supabase-table.md
│   └── new-three-scene.md
├── skills/                Project skills (each is a directory with SKILL.md)
│   ├── ai-streaming-patterns/
│   ├── drizzle-patterns/
│   ├── error-handling-patterns/
│   ├── nextjs-app-router-conventions/
│   └── supabase-patterns/
└── hooks/
    └── quality-gate.ps1   Runs after every Edit/Write/MultiEdit on .ts/.tsx/.mjs/.cjs/.js/.jsx
```

## Adding a slash command

1. Create `.claude/commands/<name>.md`.
2. Add YAML frontmatter:

   ```yaml
   ---
   description: Short summary shown in /help
   argument-hint: <hint>
   ---
   ```

3. Body is the prompt template Claude executes. Use `$ARGUMENTS` as a placeholder for whatever the user typed after the command.
4. Run `/reload` (or restart Claude Code) to pick up the new command.

## Adding a skill

1. Create `.claude/skills/<skill-name>/SKILL.md`.
2. Add YAML frontmatter:

   ```yaml
   ---
   name: skill-name
   description: When this skill should be invoked
   ---
   ```

3. Body is the instruction set Claude follows when the skill activates.
4. Restart Claude Code to pick up the new skill.

## CLAUDE.md vs BASEPLATE.md

- `CLAUDE.md` (repo root) — terse, rule-focused, everything Claude needs to know to work on this project. Update whenever a hard constraint, anti-pattern, or convention changes.
- `BASEPLATE.md` (repo root) — deep rationale: why each tool was picked, alternatives considered, install commands, per-project-type add-ons. Update when the stack itself evolves.

A stack change usually warrants updating both files.

## Heavy hook trade-off

The `PostToolUse` hook runs Prettier, ESLint, and a project-wide `tsc --noEmit` on every edit to `.ts/.tsx/.mjs/.cjs/.js/.jsx`. This catches every type error and lint violation immediately at the cost of ~3–10 seconds per edit (mostly from `tsc` over the whole project).

**To switch to a lighter profile**, edit `.claude/hooks/quality-gate.ps1` and remove the `pnpm tsc --noEmit` block. Type errors will then surface only on `pnpm typecheck`, `pnpm build`, or in your editor. Prettier and ESLint will still run per-file on each edit.

## Documented assumptions

- **Permission rule format**: `Bash(<command-prefix>:*)` and `PowerShell(<command-prefix>:*)`. The `:*` suffix is the canonical "command prefix with any arguments" pattern. If a future Claude Code release changes this syntax, update `settings.json`.
- **Hook event used**: `PostToolUse` with regex matcher targeting tool names (`Edit|Write|MultiEdit`). Hook commands receive the tool invocation as JSON on stdin, with `tool_input.file_path` containing the file being edited.
- **Hook exit codes**: `0` = allow the action to complete; `2` = block the action and surface the error to the agent. Other non-zero codes are treated as errors.
- **Hook runtime on Windows**: `powershell -NoProfile -ExecutionPolicy Bypass -File <script>` runs the script under Windows PowerShell 5.1 without execution-policy friction. The script reads JSON from stdin and uses `[Console]::In.ReadToEnd()` to capture the full payload before `ConvertFrom-Json`.
- **Permission rule overlap**: Both `Bash(...)` and `PowerShell(...)` rules are listed because both shells are available in this environment. If you only use one shell, you can remove the other set without functional loss.
