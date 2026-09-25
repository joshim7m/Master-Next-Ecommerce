'use client';

export default function AnnouncementBar({ text }) {
  const displayText = (text || '').trim();
  if (!displayText) return null;

  return (
    <div className="relative overflow-hidden bg-editorial-ink text-white dark:bg-[#1a0a3d]">
      <div className="max-w-7xl mx-auto py-2 px-4">
        <marquee
          behavior="scroll"
          direction="left"
          scrollamount="4"
          className="flex w-full items-center font-label-caps text-[0.65rem] tracking-[0.15em] whitespace-nowrap sm:text-xs"
        >
          {displayText}
        </marquee>
      </div>
    </div>
  );
}
