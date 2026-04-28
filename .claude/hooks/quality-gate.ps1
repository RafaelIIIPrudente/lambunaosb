# quality-gate.ps1 — PostToolUse hook for Claude Code
# Triggered after every Edit/Write/MultiEdit. Runs Prettier, ESLint, and project-wide tsc
# on .ts/.tsx/.mjs/.cjs/.js/.jsx files. Any non-zero exit blocks the originating edit.
#
# Exit codes:
#   0 = allow (file extension not gated, or all checks passed)
#   2 = block (a check failed; surface error to agent)
#   1 = internal error (could not parse hook payload)

$ErrorActionPreference = "Stop"

# Read the tool invocation payload from stdin
$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) {
    # No payload — nothing to check
    exit 0
}

try {
    $payload = $inputJson | ConvertFrom-Json
} catch {
    [Console]::Error.WriteLine("[quality-gate] Failed to parse hook input JSON: $_")
    exit 1
}

# Extract the file path being edited
$filePath = $null
if ($payload.tool_input -and $payload.tool_input.file_path) {
    $filePath = $payload.tool_input.file_path
}

if (-not $filePath) {
    # Tool input had no file_path (some tools don't); nothing to gate
    exit 0
}

# Gate only on JS/TS file extensions
$ext = [System.IO.Path]::GetExtension($filePath).ToLower()
$gatedExts = @('.ts', '.tsx', '.mjs', '.cjs', '.js', '.jsx')
if ($gatedExts -notcontains $ext) {
    exit 0
}

Write-Host "[quality-gate] Running on $filePath" -ForegroundColor Cyan

# Step 1: Prettier (format the file in place)
Write-Host "[quality-gate] prettier --write"
& pnpm prettier --write "$filePath"
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("[quality-gate] prettier failed (exit $LASTEXITCODE) on $filePath")
    exit 2
}

# Step 2: ESLint (auto-fix what's fixable; fail on any remaining warning or error)
Write-Host "[quality-gate] eslint --fix --max-warnings=0"
& pnpm eslint "$filePath" --fix --max-warnings=0
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("[quality-gate] eslint failed (exit $LASTEXITCODE) on $filePath")
    exit 2
}

# Step 3: Project-wide TypeScript typecheck (no emit)
# This is the heaviest step (~3-10s). Documented in .claude/README.md as the trade-off.
Write-Host "[quality-gate] tsc --noEmit (project-wide)"
& pnpm tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("[quality-gate] tsc failed (exit $LASTEXITCODE) — type errors in project")
    exit 2
}

Write-Host "[quality-gate] OK" -ForegroundColor Green
exit 0
