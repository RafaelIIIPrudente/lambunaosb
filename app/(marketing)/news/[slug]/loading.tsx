import 'server-only';

export default function NewsPostLoading() {
  return (
    <article
      className="mx-auto w-full max-w-[860px] px-4 py-12 sm:px-8 md:py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-paper-3 h-3 w-12 rounded-full" />
        <div className="bg-paper-3 h-3 w-3 rounded-full" />
        <div className="bg-paper-3 h-3 w-12 rounded-full" />
        <div className="bg-paper-3 h-3 w-3 rounded-full" />
        <div className="bg-paper-3 h-3 w-20 rounded-full" />
      </div>

      <div className="bg-paper-3 h-12 w-3/4 rounded-md" />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-paper-3 mt-1 size-9 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <div className="bg-paper-3 h-4 w-32 rounded-full" />
            <div className="bg-paper-3 h-3 w-48 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-paper-3 h-9 w-20 rounded-full" />
          <div className="bg-paper-3 h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-10">
        <div className="bg-paper-3 aspect-[16/9] w-full rounded-md" />
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <div className="bg-paper-3 h-4 w-full rounded-full" />
        <div className="bg-paper-3 h-4 w-11/12 rounded-full" />
        <div className="bg-paper-3 h-4 w-full rounded-full" />
        <div className="bg-paper-3 h-4 w-10/12 rounded-full" />
        <div className="bg-paper-3 h-4 w-3/5 rounded-full" />
      </div>
    </article>
  );
}
