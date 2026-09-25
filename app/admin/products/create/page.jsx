'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCategories, createProduct } from '../../../../src/actions/products';
import CategoryMultiSelect from '../../../../src/components/admin/CategoryMultiSelect';
import TipTapEditor from '../../../../src/components/admin/TipTapEditor';
import RichEditorSection from '../../../../src/components/admin/RichEditorSection';

const emptyForm = {
  title: '', slug: '', description: '', specification: '', metaDescription: '', tags: '', unite_price: '', sale_price: '', sku: '', videoUrl: '',
  quantity: '', status: 'draft', featured: false,
};

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

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
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return;
    setSaving(true);
    try {
      let imagePaths = [];
      if (files.length) {
        const uploadForm = new FormData();
        files.forEach((f) => uploadForm.append('images', f));
        const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: uploadForm });
        const uploadData = await uploadRes.json();
        imagePaths = uploadData.urls;
      }
      const product = await createProduct({
        ...form,
        categoryIds: selectedCategories.map((c) => c.id),
        imagePaths,
      });
      router.push(`/admin/products/edit?id=${product.id}`);
    } catch {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]";
  const labelCls = "block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400";

  return (
    <section className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">&larr; Back to Products</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Create Product</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Title</label>
            <input name="title" value={form.title} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Slug</label>
            <div className="mt-1 flex gap-2">
              <input name="slug" value={form.slug} onChange={handleChange} className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
              <button type="button" onClick={generateSlug} disabled={!form.title.trim()} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Generate</button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description &amp; Specifications</label>
            <div className="mt-1.5 space-y-3">
              <RichEditorSection id="description" label="Description" content={form.description}>
                <TipTapEditor
                  content={form.description}
                  onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
                />
              </RichEditorSection>

              <RichEditorSection id="specification" label="Specifications" content={form.specification}>
                <TipTapEditor
                  content={form.specification}
                  onChange={(html) => setForm((prev) => ({ ...prev, specification: html }))}
                />
              </RichEditorSection>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>YouTube Video URL <span className="text-slate-400 normal-case">(optional — shown as a slide in the product gallery)</span></label>
            <input name="videoUrl" type="url" value={form.videoUrl || ''} onChange={handleChange} className={inputCls} placeholder="https://www.youtube.com/watch?v=…" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Meta Description <span className="text-slate-400 normal-case">(SEO — max 160 chars)</span></label>
            <textarea name="metaDescription" value={form.metaDescription} onChange={handleChange} rows={2} maxLength={160} className={inputCls} placeholder="e.g. Buy soft polyester sleepwear set online with cash on delivery across Bangladesh." />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Tags / Keywords <span className="text-slate-400 normal-case">(comma-separated, for SEO)</span></label>
            <input name="tags" value={form.tags} onChange={handleChange} className={inputCls} placeholder="e.g. sleepwear, women nightwear, buy online BD, eghuri" />
          </div>
          <div>
            <label className={labelCls}>Unit Price (৳)</label>
            <input name="unite_price" type="number" step="0.01" value={form.unite_price} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sale Price (৳)</label>
            <input name="sale_price" type="number" step="0.01" value={form.sale_price} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>SKU</label>
            <div className="mt-1 flex gap-2">
              <input name="sku" value={form.sku} onChange={handleChange} className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
              <button type="button" onClick={generateSku} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Generate</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Stock</label>
            <input name="quantity" type="number" value={form.quantity} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="publish">Published</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Featured</label>
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <input
                type="checkbox"
                name="featured"
                checked={!!form.featured}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Feature on Hot Sales
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Images</label>
            <div className="mt-1 flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600">✕</button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#2f0f6b] hover:text-[#2f0f6b] transition dark:border-slate-600 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Categories</label>
            <CategoryMultiSelect categories={categories} selected={selectedCategories} onChange={setSelectedCategories} />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          <Link href="/admin/products" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Cancel</Link>
        </div>
      </div>
    </section>
  );
}
