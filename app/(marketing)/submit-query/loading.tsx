import 'server-only';

const FIELD_ROWS = 5;

export default function SubmitQueryLoading() {
  return (
    <section
      className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-8 md:py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-paper-3 h-3 w-12 rounded-full" />
        <div className="bg-paper-3 h-3 w-3 rounded-full" />
        <div className="bg-paper-3 h-3 w-32 rounded-full" />
      </div>

      <header className="mb-10">
        <div className="bg-paper-3 mb-4 h-3 w-44 rounded-full" />
        <div className="bg-paper-3 mb-5 h-12 w-3/4 max-w-[480px] rounded-md" />
        <div className="bg-paper-3 h-4 w-full max-w-2xl rounded-full" />
        <div className="bg-paper-3 mt-2 h-4 w-3/4 rounded-full" />
      </header>

      <div className="border-ink/30 bg-paper rounded-md border p-6 md:p-8">
        {Array.from({ length: FIELD_ROWS }).map((_, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="bg-paper-3 mb-2 h-3 w-24 rounded-full" />
            <div className="bg-paper-3 h-10 w-full rounded-md" />
          </div>
        ))}
        <div className="border-ink/30 mt-6 flex items-center gap-3 rounded-md border border-dashed p-4">
          <div className="bg-paper-3 size-4 rounded-sm" />
          <div className="bg-paper-3 h-3 w-3/4 rounded-full" />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <div className="bg-paper-3 h-10 w-24 rounded-full" />
          <div className="bg-paper-3 h-10 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}
