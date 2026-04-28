/**
 * Discriminated Result type for server actions consumed by UI.
 * Per CLAUDE.md and design brief — server actions never throw to the UI.
 */
export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E; code: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = <E = string>(error: E, code: string): Result<never, E> => ({
  ok: false,
  error,
  code,
});
