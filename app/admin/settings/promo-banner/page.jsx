'use client';

import { useEffect, useState } from 'react';

const EMPTY = {
  image: '',
  title: '',
  subtitle: '',
  tags: '',
  buttonText: '',
  buttonLink: '',
  trustLabels: 'Cash on Delivery\nDiscreet Packaging\nNationwide Delivery',
  isActive: true,
};

function BannerUpload({ value, onUpload, onRemove }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) onUpload(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="group relative">
          <img src={value} alt="" className="h-24 w-40 rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
          <button type="button" onClick={onRemove} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white sm:opacity-0 sm:group-hover:opacity-100">✕</button>
        </div>
      ) : null}
      <label
        onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-6 text-slate-400 dark:text-slate-500 transition ${
          dragging
            ? 'border-[#2f0f6b] bg-[#2f0f6b]/5 text-[#2f0f6b]'
            : 'border-slate-200 dark:border-slate-700 hover:border-[#2f0f6b] hover:text-[#2f0f6b]'
        }`}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-medium">{value ? 'Replace image' : 'Upload image'}</span>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>
    </div>
  );
}

export default function PromoBannerSettingsPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/promo-banner');
        const data = await res.json();
        if (data && data.id) {
          setForm({
            image: data.image || '',
            title: data.title || '',
            subtitle: data.subtitle || '',
            tags: data.tags || '',
            buttonText: data.buttonText || '',
            buttonLink: data.buttonLink || '',
            trustLabels: data.trustLabels || EMPTY.trustLabels,
            isActive: data.isActive ?? true,
          });
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('images', file);
    fd.append('folder', 'promos');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) setForm((prev) => ({ ...prev, image: data.urls[0] }));
    } catch {} finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/promo-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt((t) => (t === savedAt ? null : t)), 4000);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4 p-4 sm:space-y-6 sm:p-0">
        <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </section>
    );
  }

  const labels = form.trustLabels
    .split(/\n|\|/)
    .map((l) => l.trim())
    .filter(Boolean);
  const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

  return (
    <section className="space-y-4 p-4 sm:space-y-6 sm:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Promo Banner</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Appears as the split banner on the homepage</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]"
          />
          Active
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Banner Content</h2>
            <div className="space-y-4">
              {/* Image */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</label>
                <div className="mt-2">
                  <BannerUpload
                    value={form.image}
                    onUpload={uploadImage}
                    onRemove={() => setForm((prev) => ({ ...prev, image: '' }))}
                  />
                  {uploading && <span className="mt-1 block text-xs text-slate-400">Uploading…</span>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Beautiful finds, made for you" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Subtitle</label>
                  <input name="subtitle" value={form.subtitle} onChange={handleChange} placeholder="Handpicked styles crafted for comfort…" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Tags (comma separated)</label>
                  <input name="tags" value={form.tags} onChange={handleChange} placeholder="New Season, Featured" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Button Text</label>
                    <input name="buttonText" value={form.buttonText} onChange={handleChange} placeholder="Shop Now" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Button Link</label>
                    <input name="buttonLink" value={form.buttonLink} onChange={handleChange} placeholder="/categories" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Trust Labels (one per line)</label>
                <textarea
                  name="trustLabels"
                  value={form.trustLabels}
                  onChange={handleChange}
                  rows={3}
                  placeholder={'Cash on Delivery\nDiscreet Packaging\nNationwide Delivery'}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white p-2.5 text-sm focus:border-[#2f0f6b] dark:focus:border-[#a78bfa] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:ring-[#a78bfa]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f0f6b] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {savedAt && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Preview</h2>
            <div className="max-w-sm rounded-2xl shadow-md ring-1 ring-slate-100 dark:ring-slate-700 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="relative bg-slate-50 dark:bg-slate-900 pt-3">
                  {form.image ? (
                    <img src={form.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-slate-200 dark:text-slate-600">category</span>
                    </div>
                  )}
                  {tags[0] && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#2f0f6b] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                      {tags[0]}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2.5 p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {form.title || 'Banner title'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {form.subtitle || 'Banner subtitle text'}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 dark:bg-white px-3 py-1.5 text-[10px] font-semibold uppercase text-white dark:text-slate-900">
                    {form.buttonText || 'Shop Now'}
                  </span>
                  {labels.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {labels.map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <svg className="h-3 w-3 text-[#2f0f6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
