'use client';

import { useEffect } from 'react';

export default function ThemeInit() {
  useEffect(() => {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  }, []);
  return null;
}
