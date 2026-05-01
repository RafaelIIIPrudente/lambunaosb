import 'server-only';

export default function ConfirmationLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 py-16 text-center sm:px-8 md:py-24"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-paper-3 size-20 rounded-full" />

      <div className="bg-paper-3 mt-8 h-9 w-3/4 rounded-md" />

      <div className="mt-5 flex w-full max-w-md flex-col items-center gap-2">
        <div className="bg-paper-3 h-4 w-full rounded-full" />
        <div className="bg-paper-3 h-4 w-3/4 rounded-full" />
      </div>

      <div className="bg-paper-2 border-ink/15 mt-12 w-full rounded-md border p-6 text-left">
        <div className="bg-paper-3 mb-3 h-3 w-32 rounded-full" />
        <div className="bg-paper-3 mb-3 h-9 w-2/3 rounded-md" />
        <div className="bg-paper-3 h-3 w-3/4 rounded-full" />
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <div className="bg-paper-3 h-10 w-36 rounded-full" />
        <div className="bg-paper-3 h-10 w-36 rounded-full" />
      </div>
    </section>
  );
}
