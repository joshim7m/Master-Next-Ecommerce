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

export default function ThankYouContent({ siteName = 'Chahida Ghor', mobile = '' }) {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');

  // wa.me wants the international form with no "+". BD numbers are stored as
  // 01XXXXXXXXX; anything already carrying 880 passes through untouched.
  const waNumber = (() => {
    const digits = String(mobile).replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('880') ? digits : `880${digits.replace(/^0+/, '')}`;
  })();

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

        <h1 className="font-display text-3xl font-bold text-on-surface sm:text-4xl dark:text-dark-text">
          অভিনন্দন! 🎉
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base dark:text-dark-muted">
          আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে
        </p>
        <p className="mt-1 text-sm text-muted sm:text-base dark:text-dark-muted">
          {siteName}-কে বেছে নেওয়ার জন্য আপনাকে অসংখ্য ধন্যবাদ।
        </p>

        {orderNo ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-warm-sand px-4 py-2 text-sm font-semibold text-on-surface/80 dark:bg-dark-bg dark:text-dark-text/80">
            <span className="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
            Order No: {orderNo}
          </div>
        ) : null}

        <p className="mt-4 text-sm text-muted dark:text-dark-muted">
          📞 আমাদের টিম অতি শীঘ্রই আপনার সঙ্গে যোগাযোগ করবে। অনুগ্রহ করে আপনার মোবাইল ফোনটি সচল রাখুন।
        </p>

        {waNumber ? (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            যেকোনো প্রয়োজনে WhatsApp-এ যোগাযোগ করুন
          </a>
        ) : (
          <p className="mt-3 text-sm text-muted dark:text-dark-muted">
            যেকোনো প্রয়োজনে WhatsApp-এ যোগাযোগ করুন
          </p>
        )}

        <p className="mt-3 text-sm font-medium text-on-surface/80 dark:text-dark-text/80">
          Thank you for shopping with {siteName} 💚
        </p>

        <Link
          href="/categories"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary/90 active:scale-[0.98] dark:bg-primary dark:text-on-primary dark:hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[20px]">storefront</span>
          Continue Shopping
        </Link>

        {orderNo ? (
          <Link
            href={`/track-order?orderNo=${encodeURIComponent(orderNo)}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3.5 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary active:scale-[0.98] dark:border-dark-border dark:text-dark-text dark:hover:border-primary dark:hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">location_searching</span>
            Track Your Order
          </Link>
        ) : null}
      </div>
    </div>
  );
}
