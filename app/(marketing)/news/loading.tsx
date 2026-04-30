import 'server-only';

const SKELETON_COUNT = 4;

export default function NewsLoading() {
  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="mb-10">
        <div className="bg-paper-3 mb-4 h-3 w-24 rounded-full" />
        <div className="bg-paper-3 h-12 w-3/4 max-w-[640px] rounded-md" />
      </header>

      <div className="mb-10 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-paper-3 h-9 w-20 rounded-full" />
        ))}
      </div>

      <ul className="grid gap-8 lg:grid-cols-2">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <li key={i}>
            <article className="border-ink/30 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-6">
              <div className="bg-paper-3 aspect-[16/9] w-full rounded-md" />
              <div className="flex flex-col gap-3 px-1">
                <div className="bg-paper-3 h-2.5 w-16 rounded-full" />
                <div className="bg-paper-3 h-7 w-11/12 rounded-md" />
                <div className="bg-paper-3 h-3 w-2/3 rounded-full" />
                <div className="bg-paper-3 mt-1 h-4 w-full rounded-full" />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
