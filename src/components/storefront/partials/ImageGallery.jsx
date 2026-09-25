'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

function youtubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?[^ ]*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export default function ImageGallery({ images, title, variantImageIndex, videoUrl }) {
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  const videoId = useMemo(() => youtubeId(videoUrl), [videoUrl]);

  useEffect(() => {
    if (variantImageIndex >= 0) setSelected(variantImageIndex);
  }, [variantImageIndex]);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [selected]);

  const items = useMemo(() => {
    const imgs = images?.length ? images.map((img) => ({ type: 'image', ...img })) : [];
    if (videoId) imgs.push({ type: 'video', videoId });
    return imgs;
  }, [images, videoId]);

  const active = items[selected] || null;
  const activeIsVideo = active?.type === 'video';

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-warm-sand sm:rounded-2xl dark:bg-dark-card">
        <div className={(activeIsVideo ? 'aspect-video w-full sm:h-[36rem] sm:aspect-auto' : 'aspect-square w-full sm:aspect-auto sm:h-[36rem]')}>
          {activeIsVideo ? (
            <iframe
              key={active.videoId}
              src={`https://www.youtube.com/embed/${active.videoId}?rel=0`}
              title={title || 'Product video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible scrollbar-none">
          {items.map((item, i) => (
            <button
              key={item.type === 'video' ? `video-${item.videoId}` : item.id}
              type="button"
              onClick={() => { setSelected(i); setLoaded(false); setError(false); }}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                i === selected ? 'border-primary dark:border-primary' : 'border-border hover:border-primary/50 dark:border-dark-border dark:hover:border-primary/50'
              }`}
            >
              {item.type === 'video' ? (
                <>
                  <img
                    src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                    alt="Video"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 pl-0.5 shadow">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-black"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                </>
              ) : (
                <img
                  src={item.image_path}
                  alt={item.altText || ''}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
