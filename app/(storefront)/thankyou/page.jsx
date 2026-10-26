import { Suspense } from 'react';
import ThankYouContent from './ThankYouContent';
import { getSiteSettings } from '@/src/lib/getSiteSettings';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ThankYouPage() {
  // Brand name and the WhatsApp number come from Site Config, so the page
  // follows the store's settings instead of hardcoding them.
  const settings = await getSiteSettings();

  return (
    <section className="mx-auto w-full max-w-7xl px-2 sm:px-4">
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-10 text-center shadow-ambient dark:border-dark-border dark:bg-dark-card"><p className="text-muted dark:text-dark-muted">Loading...</p></div></div>}>
        <ThankYouContent siteName={settings.siteName} mobile={settings.mobile} />
      </Suspense>
    </section>
  );
}
