export default function CategoriesLoading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
      <div className="mb-10 animate-pulse rounded-2xl bg-slate-200" style={{ aspectRatio: '1400/300' }} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 aspect-square w-full rounded-xl bg-slate-200" />
            <div className="space-y-2 text-center">
              <div className="mx-auto h-4 w-24 rounded bg-slate-200" />
              <div className="mx-auto h-4 w-10 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
