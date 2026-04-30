import 'server-only';

export default function MemberDetailLoading() {
  return (
    <section
      className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8 md:py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-paper-3 h-3 w-12 rounded-full" />
        <div className="bg-paper-3 h-3 w-3 rounded-full" />
        <div className="bg-paper-3 h-3 w-16 rounded-full" />
        <div className="bg-paper-3 h-3 w-3 rounded-full" />
        <div className="bg-paper-3 h-3 w-32 rounded-full" />
      </div>

      <div className="grid gap-10 md:grid-cols-[280px_1fr] md:gap-12">
        <aside className="flex flex-col gap-5">
          <div className="border-ink/30 rounded-md border border-dashed p-1.5">
            <div className="bg-paper-3 aspect-[3/4] w-full rounded-md" />
          </div>
          <div className="border-ink/25 rounded-md border p-5">
            <div className="bg-paper-3 mb-3 h-2.5 w-16 rounded-full" />
            <div className="bg-paper-3 mb-2 h-4 w-full rounded-md" />
            <div className="bg-paper-3 h-3 w-2/3 rounded-full" />
            <div className="bg-paper-3 mt-4 h-9 w-full rounded-md" />
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <div>
            <div className="bg-paper-3 mb-3 h-2.5 w-48 rounded-full" />
            <div className="bg-paper-3 h-12 w-3/4 rounded-md" />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="bg-paper-3 h-7 w-32 rounded-full" />
            <div className="bg-paper-3 h-7 w-24 rounded-full" />
            <div className="bg-paper-3 h-7 w-28 rounded-full" />
          </div>

          <div>
            <div className="bg-paper-3 mb-3 h-2.5 w-20 rounded-full" />
            <div className="space-y-2">
              <div className="bg-paper-3 h-4 w-full rounded-full" />
              <div className="bg-paper-3 h-4 w-11/12 rounded-full" />
              <div className="bg-paper-3 h-4 w-10/12 rounded-full" />
              <div className="bg-paper-3 h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
