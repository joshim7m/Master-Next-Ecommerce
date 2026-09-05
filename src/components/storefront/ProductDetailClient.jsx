'use client';

import { useMemo, useState } from 'react';
import ImageGallery from './partials/ImageGallery';
import ProductInfo from './partials/ProductInfo';
import ProductTabs from './partials/ProductTabs';
import RelatedProducts from './partials/RelatedProducts';

export default function ProductDetailClient({ product, related, whatsappNumber }) {
  const [variantIndex, setVariantIndex] = useState(0);

  const selectedVariant = product.variants?.[variantIndex] || null;

  const variantImageIndex = useMemo(() => {
    if (!selectedVariant?.imageId) return -1;
    return product.images?.findIndex((img) => img.id === selectedVariant.imageId) ?? -1;
  }, [product.images, selectedVariant]);

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <ImageGallery images={product.images} title={product.title} variantImageIndex={variantImageIndex} />
        <div className="lg:sticky lg:top-28">
          <ProductInfo
            product={product}
            selectedVariant={selectedVariant}
            variantIndex={variantIndex}
            onVariantChange={setVariantIndex}
            whatsappNumber={whatsappNumber}
          />
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-white p-5 shadow-ambient sm:p-8 dark:border-dark-border dark:bg-dark-card">
        <ProductTabs product={product} selectedVariant={selectedVariant} />
      </div>

      <RelatedProducts products={related} />
    </>
  );
}
