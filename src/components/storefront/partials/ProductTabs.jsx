'use client';

import { useState } from 'react';

const TABS = ['Description', 'Specifications', 'Reviews'];

export default function ProductTabs({ product, selectedVariant }) {
  const [active, setActive] = useState('Description');

  const optionNames = (product.options || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((o) => o.name);

  const tabs = {
    Description: (
      <div className="prose prose-sm max-w-none text-on-surface/70 dark:text-dark-text/70 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-3 [&_h1,_&_h2,_&_h3]:text-on-surface dark:[&_h1]:text-dark-text dark:[&_h2]:text-dark-text dark:[&_h3]:text-dark-text">
        {product.description ? (
          <div
            className="overflow-x-hidden"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        ) : (
          <p className="italic text-muted dark:text-dark-muted">No description available.</p>
        )}
      </div>
    ),
    Specifications: (
      <div className="space-y-4 text-sm">
        {product.specification ? (
          <div
            className="prose prose-sm max-w-none overflow-x-hidden text-on-surface/70 dark:text-dark-text/70 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: product.specification }}
          />
        ) : null}
        {selectedVariant?.sku && (
          <div className="flex items-center justify-between border-b border-border/50 pb-2 dark:border-dark-border/50">
            <span className="text-muted dark:text-dark-muted">SKU</span>
            <span className="font-medium text-on-surface dark:text-dark-text">{selectedVariant.sku}</span>
          </div>
        )}
        {product.variants?.map((v, i) => (
          <div key={v.id} className="rounded-lg border border-border p-3 dark:border-dark-border">
            <p className="font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">
              Variant {i + 1}
            </p>
            <div className="mt-2 space-y-1">
              {(v.options || []).map((val, j) =>
                val ? (
                  <p key={j} className="text-on-surface/70 dark:text-dark-text/70">
                    <span className="font-medium">{optionNames[j] || `Option ${j + 1}`}:</span> {val}
                  </p>
                ) : null
              )}
              {v.sku && <p className="text-on-surface/70 dark:text-dark-text/70"><span className="font-medium">SKU:</span> {v.sku}</p>}
              <p className="text-on-surface/70 dark:text-dark-text/70">
                <span className="font-medium">Stock:</span>{' '}
                {v.quantity > 0 ? (
                  <span className="text-success">{v.quantity} available</span>
                ) : (
                  <span className="text-badge-sale">Out of stock</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
    Reviews: (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="mb-4 material-symbols-outlined text-[40px] text-muted/30 dark:text-dark-muted/30">
          star
        </span>
        <p className="text-sm text-muted dark:text-dark-muted">No reviews yet.</p>
        <p className="mt-1 text-xs text-muted/60 dark:text-dark-muted/60">Be the first to review this product.</p>
      </div>
    ),
  };

  return (
    <div>
      <div className="flex border-b border-border dark:border-dark-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              active === tab
                ? 'text-primary'
                : 'text-muted hover:text-on-surface/70 dark:text-dark-muted dark:hover:text-dark-text/70'
            }`}
          >
            {tab}
            {active === tab && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="py-6">
        {tabs[active]}
      </div>
    </div>
  );
}
