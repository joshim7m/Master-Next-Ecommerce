'use client';

const DEFAULT_TEXT = 'FREE SHIPPING ON ALL ORDERS OVER ৳5,000 | SHOP NEW ARRIVALS';

export default function AnnouncementBar({ text }) {
  const displayText = text || DEFAULT_TEXT;

  return (
    <div className="bg-editorial-ink text-white dark:bg-[#1a0a3d]">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center">
        <span className="font-label-caps text-[0.65rem] tracking-[0.15em] sm:text-xs">
          {displayText}
        </span>
      </div>
    </div>
  );
}
