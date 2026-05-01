import 'server-only';

const SKELETON_COUNT = 8;

export default function MembersLoading() {
  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 md:py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="mb-12">
        <div className="bg-paper-3 mb-4 h-3 w-48 rounded-full" />
        <div className="bg-paper-3 mb-4 h-12 w-3/4 max-w-[640px] rounded-md" />
        <div className="bg-paper-3 h-5 w-full max-w-2xl rounded-full" />
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <li key={i}>
            <article className="border-ink/30 bg-paper flex h-full flex-col gap-4 rounded-md border border-dashed p-4">
              <div className="bg-paper-3 aspect-square w-full rounded-md" />
              <div className="flex flex-col gap-2.5 px-1 pb-1">
                <div className="bg-paper-3 h-2.5 w-20 rounded-full" />
                <div className="bg-paper-3 h-5 w-4/5 rounded-md" />
                <div className="bg-paper-3 mt-1 h-3 w-2/3 rounded-full" />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
