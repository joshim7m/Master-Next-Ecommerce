'use client';

import { useState, useRef, useEffect } from 'react';

export default function ImageGallery({ images, title, variantImageIndex }) {
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (variantImageIndex >= 0) setSelected(variantImageIndex);
  }, [variantImageIndex]);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [selected]);

  const items = images?.length ? images : [];
  const active = items[selected] || null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-warm-sand sm:rounded-2xl dark:bg-dark-card">
        <div className="aspect-square w-full sm:aspect-auto sm:h-[36rem]">
          {!loaded && !error && (
            <div className="absolute inset-0 animate-pulse bg-border/50 dark:bg-dark-border/50" />
          )}
          {active && !error ? (
            <img
              ref={imgRef}
              src={active.image_path}
              alt={active.altText || title}
              className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted dark:text-dark-muted">
              <span className="material-symbols-outlined text-[48px]">image</span>
            </div>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible scrollbar-none">
          {items.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => { setSelected(i); setLoaded(false); setError(false); }}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                i === selected ? 'border-primary dark:border-primary' : 'border-border hover:border-primary/50 dark:border-dark-border dark:hover:border-primary/50'
              }`}
            >
              <img
                src={img.image_path}
                alt={img.altText || ''}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
