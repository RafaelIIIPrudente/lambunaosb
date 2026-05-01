import 'server-only';

export default function AboutLoading() {
  return (
    <>
      <section
        className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-8 md:py-16"
        aria-busy="true"
        aria-live="polite"
      >
        <header className="mb-12">
          <div className="bg-paper-3 mb-4 h-3 w-40 rounded-full" />
          <div className="bg-paper-3 h-12 w-3/4 max-w-[640px] rounded-md" />
        </header>

        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="bg-paper-3 h-4 w-full rounded-full" />
            <div className="bg-paper-3 h-4 w-11/12 rounded-full" />
            <div className="bg-paper-3 h-4 w-10/12 rounded-full" />
            <div className="bg-paper-3 h-4 w-3/4 rounded-full" />
            <div className="bg-paper-3 mt-4 h-4 w-2/3 rounded-full" />
          </div>

          <aside className="flex flex-col gap-5">
            <div className="border-ink/25 rounded-md border p-5">
              <div className="bg-paper-3 mb-3 h-2.5 w-12 rounded-full" />
              <div className="bg-paper-3 mb-2 h-4 w-full rounded-md" />
              <div className="bg-paper-3 mb-2 h-4 w-2/3 rounded-md" />
              <div className="bg-paper-3 h-4 w-3/4 rounded-md" />
              <hr className="border-ink/15 my-4 border-t border-dashed" />
              <div className="bg-paper-3 mb-2 h-3 w-2/3 rounded-full" />
              <div className="bg-paper-3 h-3 w-3/4 rounded-full" />
            </div>
            <div className="border-ink/30 rounded-md border border-dashed p-1.5">
              <div className="bg-paper-3 aspect-[4/3] w-full rounded-md" />
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-rust/8 border-rust/20 border-t border-b">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8">
          <div className="bg-paper-3 mb-3 h-3 w-32 rounded-full" />
          <div className="bg-paper-3 h-4 w-full max-w-3xl rounded-full" />
          <div className="bg-paper-3 mt-2 h-4 w-3/4 rounded-full" />
        </div>
      </section>
    </>
  );
}
