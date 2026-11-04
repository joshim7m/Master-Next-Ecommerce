'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pushDataLayer } from '@/src/lib/gtm';

export default function usePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrlRef = useRef(null);

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    // Skip identical consecutive pushes — StrictMode double-invokes the mount
    // effect in dev, and the effect can re-run without the url changing. Real
    // route changes always produce a new url, so they still fire.
    if (lastUrlRef.current === url) return;
    lastUrlRef.current = url;

    pushDataLayer('page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);
}
