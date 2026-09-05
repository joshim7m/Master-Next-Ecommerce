'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, getCategories, updateProduct } from '../../../../src/actions/products';
import ProductInfo from './partials/product-info';
import VariantGenerator from './partials/variant-generator';
import ManageVariant from './partials/manage-variant';

const emptyForm = {
  title: '', slug: '', description: '', metaDescription: '', tags: '', unite_price: '', sale_price: '', sku: '',
  quantity: '', status: 'draft', featured: false,
};

let variantKeyCounter = 0;

function EditProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([]);
  const [optionLabels, setOptionLabels] = useState([]);
  const [removedVariantIds, setRemovedVariantIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    Promise.all([getProduct(id), getCategories()]).then(([product, cats]) => {
      if (!product) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setForm({
        title: product.title,
        slug: product.slug,
        description: product.description || '',
        metaDescription: product.metaDescription || '',
        tags: product.tags || '',
        unite_price: product.unite_price.toString(),
        sale_price: product.sale_price?.toString() || '',
        sku: product.sku?.toString() || '',
        quantity: product.quantity?.toString() || '',
        status: product.status,
        featured: Boolean(product.featured),
      });
      setSelectedCategories(product.categories || []);
      setExistingImages(product.images || []);
      setCategories(cats);

      const loaded = (product.variants || []).map((v) => ({
        _key: `existing_${++variantKeyCounter}`,
        id: v.id,
        optionValues: [v.size || '', v.color || ''].filter(Boolean),
        sku: v.sku || '',
        price: v.price?.toString() || '',
        sale_price: v.sale_price?.toString() || '',
        quantity: v.quantity?.toString() || '',
        imageId: v.imageId || '',
        isDefault: v.isDefault,
        _delete: false,
      }));

      const optionLabels = loaded.some((v) => v.optionValues.length > 0)
        ? ['Size', 'Color'].slice(0, loaded[0]?.optionValues?.length || 1)
        : [];
      setOptionLabels(optionLabels);

      setVariants(loaded);
      setHasVariants(loaded.length > 0);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    return () => newPreviews.forEach((p) => URL.revokeObjectURL(p));
  }, [newPreviews]);

  const handleChange = (e) =>
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((prev) => ({ ...prev, slug }));
  };

  const generateSku = () => {
    const sku = String(Math.floor(100000 + Math.random() * 900000));
    setForm((prev) => ({ ...prev, sku }));
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setNewFiles((prev) => [...prev, ...selected]);
    setNewPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    setRemoveImageIds((prev) => [...prev, imageId]);
    setVariants((prev) => prev.map((v) => v.imageId === imageId ? { ...v, imageId: '' } : v));
  };

  const handleVariantChange = (key, field, value) => {
    setVariants((prev) => prev.map((v) => (v._key === key ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (key) => {
    setVariants((prev) => {
      const removed = prev.find((v) => v._key === key);
      if (removed?.id) {
        setRemovedVariantIds((r) => [...r, removed.id]);
      }
      const remaining = prev.filter((v) => v._key !== key);
      if (remaining.length > 0 && remaining.every((v) => !v.isDefault)) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
  };

  const toggleDefault = (key) => {
    setVariants((prev) => prev.map((v) => ({ ...v, isDefault: v._key === key })));
  };

  const handleGenerate = (parsed, combinations) => {
    const labels = parsed.map((o) => o.name);
    const generated = combinations.map((combo) => ({
      _key: `gen_${++variantKeyCounter}`,
      id: null,
      optionValues: combo.optionValues,
      sku: '',
      price: form.unite_price,
      sale_price: form.sale_price,
      quantity: form.quantity,
      imageId: '',
      isDefault: false,
      _delete: false,
    }));

    if (generated.length > 0) generated[0].isDefault = true;

    setOptionLabels(labels);
    setVariants(generated);
  };

  const existingOptions = (() => {
    if (variants.length === 0) return [];
    const sample = variants[0];
    const vals0 = [...new Set(variants.map((v) => v.optionValues?.[0]).filter(Boolean))];
    const vals1 = [...new Set(variants.map((v) => v.optionValues?.[1]).filter(Boolean))];
    const result = [];
    if (optionLabels[0]) result.push({ name: optionLabels[0], values: vals0.join(', ') });
    if (optionLabels[1]) result.push({ name: optionLabels[1], values: vals1.join(', ') });
    return result.length ? result : [];
  })();

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(clearToast, 3000);
      return () => clearTimeout(t);
    }
  }, [toast, clearToast]);

  const handleSave = async () => {
    if (!form.title || !form.slug || !id) return;
    setSaving(true);
    setToast(null);
    try {
      let imagePaths = [];
      if (newFiles.length) {
        const uploadForm = new FormData();
        newFiles.forEach((f) => uploadForm.append('images', f));
        const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        imagePaths = uploadData.urls;
      }

      const variantPayload = variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.optionValues?.[0] || '',
        color: v.optionValues?.[1] || '',
        price: v.price,
        sale_price: v.sale_price,
        quantity: v.quantity ? parseInt(v.quantity) : 0,
        imageId: v.imageId,
        isDefault: v.isDefault,
      }));

      await updateProduct(id, {
        ...form,
        categoryIds: selectedCategories.map((c) => c.id),
        imagePaths,
        removeImageIds,
        variants: variantPayload,
        removedVariantIds,
      });
      setToast({ type: 'success', message: 'Product saved successfully.' });
      router.refresh();
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  if (notFound) {
    return (
      <section className="space-y-6">
        <div>
          <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">&larr; Back to Products</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Product Not Found</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">The product you are looking for does not exist.</p>
        </div>
      </section>
    );
  }

  const allImages = [
    ...existingImages.map((img) => ({ id: img.id, url: img.image_path })),
    ...newPreviews.map((url, i) => ({ id: `preview_${i}`, url })),
  ];

  return (
    <section className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.message}
          <button type="button" onClick={clearToast} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">&larr; Back to Products</Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Product</h1>
          {form.slug && (
            <Link
              href={`/products/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#2f0f6b] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#8f6af0]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z" />
              </svg>
              View in Store
            </Link>
          )}
        </div>
      </div>

      <ProductInfo
        form={form}
        onChange={handleChange}
        onGenerateSlug={generateSlug}
        onGenerateSku={generateSku}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        existingImages={existingImages}
        newPreviews={newPreviews}
        onRemoveExisting={removeExistingImage}
        onRemoveNew={removeNewImage}
        onAdd={handleFileSelect}
      />

      {/* Variants section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <label className="flex items-center gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              setHasVariants(e.target.checked);
              if (!e.target.checked) { setVariants([]); setOptionLabels([]); }
            }}
            className="h-4 w-4 rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-700"
          />
          <span className="text-sm font-medium text-slate-900 dark:text-white">This product has variants (size, color, etc.)</span>
        </label>

        {hasVariants && (
          <div className="space-y-6">
            <VariantGenerator onGenerate={handleGenerate} existingOptions={existingOptions} />
            <ManageVariant
              variants={variants}
              optionLabels={optionLabels}
              allImages={allImages}
              onChange={handleVariantChange}
              onRemove={removeVariant}
              onToggleDefault={toggleDefault}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50">
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
        <Link href="/admin/products" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Cancel</Link>
      </div>
    </section>
  );
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>}>
      <EditProductForm />
    </Suspense>
  );
}
