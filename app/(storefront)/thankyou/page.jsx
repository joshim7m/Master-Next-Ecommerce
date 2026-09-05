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
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-500 dark:text-slate-400">Loading...</p></div>}>
        <ThankYouContent />
      </Suspense>
    </section>
  );
}