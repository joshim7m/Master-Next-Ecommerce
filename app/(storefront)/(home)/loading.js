export default function HomeLoading() {
  const skeletons = Array.from({ length: 12 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 sm:py-6">
      {/* Hero skeleton */}
      <div className="aspect-[4/5] w-full animate-pulse rounded-none bg-slate-200 sm:aspect-[2.8/1] sm:rounded-2xl" />

      <div className="mt-4 flex flex-col gap-4 sm:mt-8 sm:gap-6 lg:flex-row">
        {/* Filter sidebar skeleton (desktop) */}
        <div className="hidden w-full shrink-0 lg:block lg:w-64">
          <div className="animate-pulse space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-2 rounded bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {skeletons.map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="aspect-square w-full bg-slate-200" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-full rounded bg-slate-200" />
                  <div className="h-3 w-3/4 rounded bg-slate-200" />
                  <div className="h-5 w-20 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
