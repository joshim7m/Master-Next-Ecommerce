'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'device-hash';

function getStorageHash() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function setStorageHash(hash) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, hash);
}

export default function useDeviceFingerprint() {
  const [deviceHash, setDeviceHash] = useState(null);

  useEffect(() => {
    const cached = getStorageHash();
    if (cached) {
      setDeviceHash(cached);
      return;
    }

    import('@fingerprintjs/fingerprintjs').then(({ default: FingerprintJS }) => {
      FingerprintJS.load().then((fp) => fp.get()).then((result) => {
        const hash = result.visitorId;
        setStorageHash(hash);
        setDeviceHash(hash);
      });
    });
  }, []);

  return deviceHash;
}
