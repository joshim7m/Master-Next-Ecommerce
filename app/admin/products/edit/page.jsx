'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, getCategories, updateProduct } from '../../../../src/actions/products';
import ProductInfo from './partials/product-info';
import VariantGenerator from './partials/variant-generator';
import ManageVariant from './partials/manage-variant';

const emptyForm = {
  title: '', slug: '', description: '', specification: '', metaDescription: '', tags: '', unite_price: '', sale_price: '', sku: '', videoUrl: '',
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
  const [options, setOptions] = useState([]); // [{ name, values }] — values comma-separated
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
        specification: product.specification || '',
        metaDescription: product.metaDescription || '',
        tags: product.tags || '',
        videoUrl: product.videoUrl || '',
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
        optionValues: (v.options || []).map((x) => x || ''),
        sku: v.sku || '',
        price: v.unite_price?.toString() || '',
        sale_price: v.sale_price?.toString() || '',
        quantity: v.quantity?.toString() || '',
        imageId: v.imageId || '',
        isDefault: v.isDefault,
      }));

      const valuesByPos = loaded.reduce((acc, v) => {
        (v.optionValues || []).forEach((val, i) => {
          if (!val) return;
          (acc[i] ??= new Set()).add(val);
        });
        return acc;
      }, {});

      let optionRows = (product.options || []).map((o) => ({
        name: o.name,
        values: [...(valuesByPos[o.position] || [])].join(', '),
      }));
      if (optionRows.length === 0 && loaded.length > 0) {
        const len = loaded.reduce((m, v) => Math.max(m, (v.optionValues || []).filter(Boolean).length), 0) || 1;
        optionRows = Array.from({ length: len }, (_, i) => ({
          name: ['Size', 'Color'][i] || `Option ${i + 1}`,
          values: [...(valuesByPos[i] || [])].join(', '),
        }));
      }
      setOptions(optionRows);

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
    const existingByKey = new Map(
      variants
        .filter((v) => v.optionValues?.length)
        .map((v) => [v.optionValues.map((x) => x.trim().toLowerCase()).join('||'), v])
    );

    const keptIds = new Set();
    const generated = combinations.map((combo) => {
      const key = combo.optionValues.map((x) => x.trim().toLowerCase()).join('||');
      const prev = existingByKey.get(key);
      if (prev) {
        if (prev.id) keptIds.add(prev.id);
        return { ...prev, optionValues: combo.optionValues };
      }
      return {
        _key: `gen_${++variantKeyCounter}`,
        id: null,
        optionValues: combo.optionValues,
        sku: '',
        price: form.unite_price,
        sale_price: form.sale_price,
        quantity: form.quantity,
        imageId: '',
        isDefault: false,
      };
    });

    if (generated.length > 0 && !generated.some((v) => v.isDefault)) {
      generated[0].isDefault = true;
    }

    const orphaned = variants
      .filter((v) => v.id && !keptIds.has(v.id))
      .map((v) => v.id);
    if (orphaned.length) {
      setRemovedVariantIds((prev) => [...new Set([...prev, ...orphaned])]);
    }

    setVariants(generated);
  };

  const optionLabels = options
    .filter((o) => o.values.trim())
    .map((o) => o.name.trim() || 'Option');

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
        options: (v.optionValues || []).map((x) => x.trim()).filter(Boolean),
        unite_price: v.price,
        sale_price: v.sale_price,
        quantity: v.quantity ? parseInt(v.quantity) : 0,
        imageId: v.imageId || null,
        isDefault: v.isDefault,
      }));

      const saved = await updateProduct(id, {
        ...form,
        categoryIds: selectedCategories.map((c) => c.id),
        imagePaths,
        removeImageIds,
        options: hasVariants && optionLabels.length ? optionLabels.map((name) => ({ name })) : undefined,
        variants: variantPayload,
        removedVariantIds,
      });

      // Sync ids of newly created variants so a second save updates
      // instead of inserting duplicates.
      const savedByKey = new Map(
        (saved?.variants || []).map((v) => [JSON.stringify(v.options || []), v])
      );
      setVariants((prev) =>
        prev.map((v) => {
          const match = savedByKey.get(JSON.stringify((v.optionValues || []).map((x) => x.trim()).filter(Boolean)));
          return match ? { ...v, id: match.id, imageId: match.imageId || v.imageId } : v;
        })
      );

      // Clear staged uploads so re-saving doesn't re-upload the same files.
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
      setNewFiles([]);
      setNewPreviews([]);

      // Refresh bookkeeping state from the server result.
      setExistingImages(saved?.images || []);
      setRemoveImageIds([]);
      setRemovedVariantIds([]);

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
              if (!e.target.checked) { setVariants([]); setOptions([]); }
            }}
            className="h-4 w-4 rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-700"
          />
          <span className="text-sm font-medium text-slate-900 dark:text-white">This product has variants (size, color, etc.)</span>
        </label>

        {hasVariants && (
          <div className="space-y-6">
            <VariantGenerator
              options={options}
              onOptionsChange={setOptions}
              onGenerate={handleGenerate}
            />
            <ManageVariant
              variants={variants}
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
