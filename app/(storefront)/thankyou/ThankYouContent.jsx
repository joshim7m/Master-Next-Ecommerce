'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pushDataLayer } from '../../../src/lib/gtm';

const CONFETTI = [
  { left: '6%', delay: '0s', duration: '4.2s', emoji: '🌸', size: '18px' },
  { left: '16%', delay: '1.1s', duration: '5s', emoji: '🌼', size: '15px' },
  { left: '26%', delay: '0.6s', duration: '4.8s', emoji: '🌺', size: '17px' },
  { left: '38%', delay: '1.6s', duration: '5.4s', emoji: '✨', size: '14px' },
  { left: '50%', delay: '0.3s', duration: '4.4s', emoji: '🌷', size: '18px' },
  { left: '62%', delay: '1.3s', duration: '5.2s', emoji: '🌻', size: '16px' },
  { left: '72%', delay: '0.8s', duration: '4.6s', emoji: '💐', size: '17px' },
  { left: '82%', delay: '1.9s', duration: '5.6s', emoji: '🌸', size: '14px' },
  { left: '92%', delay: '0.4s', duration: '4.9s', emoji: '🌼', size: '16px' },
];

const FLOWER_PETALS = [0, 60, 120, 180, 240, 300];

export default function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');

  useEffect(() => {
    const raw = sessionStorage.getItem('gtm_purchase');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        pushDataLayer('purchase', { ecommerce: data });
      } catch {}
      sessionStorage.removeItem('gtm_purchase');
    }
  }, []);

  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <style>{`
        @keyframes ty-bloom {
          0% { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          70% { opacity: 1; transform: scale(1.15) rotate(6deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes ty-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ty-fall {
          0% { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes ty-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .ty-bloom { animation: ty-bloom 0.9s 0.2s ease-out both; }
        .ty-spin { animation: ty-spin 14s linear infinite; }
        .ty-float { animation: ty-float 3s ease-in-out infinite; }
        .ty-petal { position: absolute; top: 0; animation: ty-fall linear infinite; }
      `}</style>

      {/* Falling petal confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="ty-petal"
            style={{ left: c.left, fontSize: c.size, animationDelay: c.delay, animationDuration: c.duration }}
          >
            {c.emoji}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-md animate-fade-in rounded-3xl border border-border bg-white/95 p-6 text-center shadow-ambient-lg backdrop-blur transition-all duration-500 hover:shadow-ambient sm:p-10 dark:border-dark-border dark:bg-dark-card/95">
        {/* Colorful success icon with blooming flower */}
        <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center">
          <div className="ty-bloom pointer-events-none absolute left-1/2 top-1/2">
            <div className="ty-spin relative h-36 w-36 -translate-x-1/2 -translate-y-1/2">
              {FLOWER_PETALS.map((deg) => (
                <span
                  key={deg}
                  className="absolute left-1/2 top-1/2 h-12 w-7 rounded-full bg-gradient-to-tr from-pink-400 via-fuchsia-400 to-purple-400 opacity-70 shadow-lg"
                  style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-34px)` }}
                />
              ))}
              <span className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 shadow-xl" />
            </div>
          </div>
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-emerald-400 via-yellow-300 to-pink-400 opacity-60" />
          <span className="relative flex h-20 w-20 ty-float items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-yellow-400 to-pink-500 shadow-xl">
            <span className="material-symbols-outlined text-4xl text-white drop-shadow">check</span>
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-on-surface sm:text-4xl dark:text-dark-text">Congratulations!</h1>
        <p className="mt-3 text-sm text-muted sm:text-base dark:text-dark-muted">
          Your order has been placed successfully.
        </p>

        {orderNo ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-warm-sand px-4 py-2 text-sm font-semibold text-on-surface/80 dark:bg-dark-bg dark:text-dark-text/80">
            <span className="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
            Order No: {orderNo}
          </div>
        ) : null}

        <p className="mt-4 text-sm text-muted dark:text-dark-muted">
          We will contact you shortly with shipping details.
        </p>

        <Link
          href="/categories"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary/90 active:scale-[0.98] dark:bg-primary dark:text-on-primary dark:hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[20px]">storefront</span>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
