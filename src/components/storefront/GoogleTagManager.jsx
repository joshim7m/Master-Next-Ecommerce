'use client';

import { useEffect } from 'react';

export default function GoogleTagManager({ gtmId }) {
  const id = gtmId || '';

  useEffect(() => {
    if (!id) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.firstChild
      ? document.head.insertBefore(script, document.head.firstChild)
      : document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${id}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [id]);

  return null;
}
