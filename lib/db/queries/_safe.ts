/**
 * Wraps a query that runs at build time (e.g. generateStaticParams).
 * Returns the fallback when the DB is unreachable, so the build does not crash
 * before Supabase is wired. The route falls back to on-demand rendering.
 */
export async function safeBuildtimeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
