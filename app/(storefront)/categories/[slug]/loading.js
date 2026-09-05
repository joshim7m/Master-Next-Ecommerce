export default function CategoryProductsLoading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
      <div className="mb-6 animate-pulse rounded-2xl bg-slate-200 sm:mb-8" style={{ aspectRatio: '1400/300' }} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-full shrink-0 lg:block lg:w-64">
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
              <div className="h-8 rounded bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="aspect-square w-full bg-slate-200" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-full rounded bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-5 w-16 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
