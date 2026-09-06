import { Suspense } from 'react';
import ThankYouContent from './ThankYouContent';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-10 text-center shadow-ambient dark:border-dark-border dark:bg-dark-card"><p className="text-muted dark:text-dark-muted">Loading...</p></div></div>}>
        <ThankYouContent />
      </Suspense>
    </section>
  );
}