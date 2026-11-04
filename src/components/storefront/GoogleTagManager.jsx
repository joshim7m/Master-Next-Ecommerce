'use client';

import { useEffect } from 'react';

export default function GoogleTagManager({ gtmId }) {
  const id = gtmId || '';

  useEffect(() => {
    if (!id) return;

    /* Idempotent: React StrictMode double-invokes effects in dev, and a
       remount must never load the container twice. The script tag is created
       synchronously below, so it also guards a second effect run that happens
       before gtm.js has finished loading (before `google_tag_manager` exists) —
       otherwise `gtm.start` would be queued twice and Container Loaded would
       fire twice. */
    if (window.google_tag_manager?.[id]) return;
    if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${id}"]`)) return;

    /* Standard GTM bootstrap: the container expects `dataLayer` to exist and
       a `gtm.js` (Container Loaded) event queued BEFORE the loader script
       runs. Skipping this broke Initialization/Consent triggers — tags such
       as the Meta Pixel that fire on them never loaded. */
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.firstChild
      ? document.head.insertBefore(script, document.head.firstChild)
      : document.head.appendChild(script);

    if (!document.querySelector(`iframe[src*="googletagmanager.com/ns.html?id=${id}"]`)) {
      const noscript = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${id}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);
    }
  }, [id]);

  return null;
}
