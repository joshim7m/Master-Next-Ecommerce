export default function ProductsLoading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
      <div className="mb-6 animate-pulse rounded-2xl bg-slate-200 sm:mb-8" style={{ aspectRatio: '4/1' }} />

      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row">
        {/* Sidebar skeleton */}
        <div className="hidden w-64 shrink-0 animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          <div className="mb-4 h-5 w-24 rounded bg-slate-200" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="mb-3 aspect-square w-full rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 rounded bg-slate-200" />
                    <div className="h-4 w-12 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
