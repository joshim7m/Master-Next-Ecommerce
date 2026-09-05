export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Image skeleton */}
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="aspect-square w-full rounded-lg bg-slate-200 sm:h-[28rem]" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-16 rounded bg-slate-200" />
            <div className="h-8 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
          </div>
        </div>

        {/* Details sidebar skeleton */}
        <div className="space-y-6">
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-12 rounded bg-slate-200" />
            <div className="mt-4 h-10 w-40 rounded bg-slate-200" />
          </div>

          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-32 rounded bg-slate-200" />
            <div className="mt-4 flex gap-3">
              <div className="h-10 w-20 rounded-xl bg-slate-200" />
              <div className="h-10 w-20 rounded-xl bg-slate-200" />
              <div className="h-10 w-20 rounded-xl bg-slate-200" />
            </div>
          </div>

          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="h-4 w-16 rounded bg-slate-200" />
                <div className="mt-2 h-8 w-12 rounded bg-slate-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-12 w-12 rounded-full bg-slate-200" />
                <div className="h-12 w-12 rounded-full bg-slate-200" />
              </div>
            </div>
            <div className="mt-6 h-14 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
