export default function AdCard({ ad }) {
  return (
    <a
      href={ad.productLink || '#'}
      target={ad.productLink ? '_blank' : undefined}
      rel={ad.productLink ? 'noopener noreferrer' : undefined}
      className="group flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 transition hover:shadow-md hover:border-amber-300 dark:border-slate-600 dark:from-slate-800 dark:to-slate-800/80 dark:hover:border-amber-500/50"
    >
      {ad.image && (
        <div className="flex w-24 shrink-0 sm:w-28">
          <img
            src={ad.image}
            alt={ad.title}
            className="min-h-0 flex-1 object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex flex-1 items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">{ad.title}</p>
          {ad.text && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{ad.text}</p>
          )}
          {ad.price && (
            <p className="mt-1 text-sm font-bold text-[#2f0f6b] dark:text-[#a78bfa]">৳{parseFloat(ad.price).toLocaleString()}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition group-hover:from-amber-500 group-hover:to-orange-500 dark:from-amber-500 dark:to-orange-500">
          Shop
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </a>
  );
}
