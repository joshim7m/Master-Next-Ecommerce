'use client';

import { useEffect, useState } from 'react';

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className="fixed left-4 right-4 top-20 z-50 animate-fade-in sm:left-auto sm:right-6">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md sm:px-5 sm:py-3.5 ${
          isSuccess
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-red-200 bg-red-50/95 text-red-800'
        }`}
      >
        {isSuccess ? (
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={() => {}}
          className={`ml-2 shrink-0 rounded-lg p-1 transition ${
            isSuccess ? 'hover:bg-emerald-100' : 'hover:bg-red-100'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 sm:space-y-8 sm:px-0">
      <div>
        <div className="mb-2 h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-72 rounded-lg bg-slate-100 dark:bg-slate-700/50" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-4 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-4">
            <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-700/50" />
            <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-700/50" />
          </div>
        </div>
      ))}
      <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function ImageUpload({ label, value, field, onUpload, onRemove, hint }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(field, file);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) onUpload(field, e.target.files[0]);
    e.target.value = '';
  };

  const isFavicon = field === 'favicon';

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div className="group relative">
            <img
              src={value}
              alt={label}
              className={`rounded-lg border border-slate-200 object-cover dark:border-slate-700 ${
                isFavicon ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-20 w-full max-w-[200px] sm:h-24 sm:w-52'
              }`}
            />
            <button
              type="button"
              onClick={() => onRemove(field)}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-100 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ) : null}
        <label
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition ${
            dragging
              ? 'border-[#2f0f6b] bg-[#2f0f6b]/5 text-[#2f0f6b]'
              : 'border-slate-300 text-slate-400 hover:border-[#2f0f6b] hover:text-[#2f0f6b] dark:border-slate-600 dark:text-slate-500 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]'
          } ${isFavicon ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-20 w-full max-w-[200px] sm:h-24 sm:w-52'}`}
        >
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, rows }) {
  const baseCls =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-[#2f0f6b] focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${baseCls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseCls}
        />
      )}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">{children}</div>
    </div>
  );
}

export default function SiteSettingsPage() {
  const [form, setForm] = useState({
    siteName: '',
    logo: '',
    favicon: '',
    mobile: '',
    email: '',
    address: '',
    copyrightText: '',
    announcementText: '',
    aboutCompany: '',
    aboutCompanyBn: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/site')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setForm({
          siteName: data.siteName || '',
          logo: data.logo || '',
          favicon: data.favicon || '',
          mobile: data.mobile || '',
          email: data.email || '',
          address: data.address || '',
          copyrightText: data.copyrightText || '',
          announcementText: data.announcementText || '',
          aboutCompany: data.aboutCompany || '',
          aboutCompanyBn: data.aboutCompanyBn || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          metaKeywords: data.metaKeywords || '',
          ogImage: data.ogImage || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleUpload = async (field, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    fd.append('folder', 'settings');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) {
        setForm((prev) => ({ ...prev, [field]: data.urls[0] }));
      }
    } catch {}
  };

  const handleRemove = (field) => {
    setForm((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Settings saved successfully.' });
      } else {
        setToast({ type: 'error', message: 'Failed to save settings.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      <Toast toast={toast} />

      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2f0f6b]/10 dark:bg-[#a78bfa]/20 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-[#2f0f6b] dark:text-[#a78bfa] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Site Setting</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage your site branding and contact information.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <SectionCard title="Branding" description="Your site identity and visual assets.">
          <InputField
            label="Company Name"
            value={form.siteName}
            onChange={(e) => setForm((prev) => ({ ...prev, siteName: e.target.value }))}
            placeholder="Your Company Name"
          />

          <ImageUpload
            label="Logo"
            field="logo"
            value={form.logo}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />

          <ImageUpload
            label="Favicon"
            field="favicon"
            value={form.favicon}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />
        </SectionCard>

        <SectionCard title="Contact" description="How customers can reach you.">
          <div className="grid gap-4 sm:grid-cols-5 sm:gap-5">
            <div className="sm:col-span-2">
              <InputField
                label="Mobile"
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
            <div className="sm:col-span-3">
              <InputField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contact@example.com"
              />
            </div>
          </div>
          <InputField
            label="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Enter your business address"
            rows={3}
          />
        </SectionCard>

        <SectionCard title="About Company" description="Company description shown on the About page and for SEO.">
          <InputField
            label="About Company (English)"
            value={form.aboutCompany}
            onChange={(e) => setForm((prev) => ({ ...prev, aboutCompany: e.target.value }))}
            placeholder="Tell customers about your company..."
            rows={10}
          />
          <InputField
            label="About Company (বাংলা)"
            value={form.aboutCompanyBn}
            onChange={(e) => setForm((prev) => ({ ...prev, aboutCompanyBn: e.target.value }))}
            placeholder="আপনার কোম্পানি সম্পর্কে গ্রাহকদের জানান..."
            rows={10}
          />
        </SectionCard>

        <SectionCard title="SEO & Sharing" description="Global defaults used across the storefront for titles, descriptions, keywords, and social sharing. Leave blank to fall back to your company name and about text.">
          <InputField
            label="Meta Title Suffix"
            value={form.metaTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
            placeholder="e.g. Radiant Picks"
            hint="Appended to every page title, e.g. About Us | Radiant Picks."
          />
          <InputField
            label="Meta Description"
            value={form.metaDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
            placeholder="Default description used across the site..."
            rows={4}
          />
          <InputField
            label="Meta Keywords"
            value={form.metaKeywords}
            onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
            placeholder="lingerie Bangladesh, bra shop online BD, nightwear for women..."
            hint="Comma-separated keywords used as the site-wide default."
          />
          <ImageUpload
            label="Default OG Image"
            field="ogImage"
            value={form.ogImage}
            onUpload={handleUpload}
            onRemove={handleRemove}
            hint="Used for social sharing (Facebook, WhatsApp, etc.). Recommended size: 1200 × 630 px. Max upload: 5MB (JPEG, PNG, WebP, AVIF, SVG)."
          />
        </SectionCard>

        <SectionCard title="Announcement Bar" description="The message shown at the top of every page.">
          <InputField
            label="Announcement Text"
            value={form.announcementText}
            onChange={(e) => setForm((prev) => ({ ...prev, announcementText: e.target.value }))}
            placeholder="Call or WhatsApp us to order: +880 1XXX-XXXXXX"
          />
        </SectionCard>

        <SectionCard title="Footer" description="Copyright text displayed in your site footer.">
          <InputField
            label="Copyright Text"
            value={form.copyrightText}
            onChange={(e) => setForm((prev) => ({ ...prev, copyrightText: e.target.value }))}
            placeholder="© 2026 Your Company. All rights reserved."
          />
        </SectionCard>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">All changes are saved immediately to your site.</p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f0f6b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f0f6b]/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/30 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90 disabled:opacity-50 sm:w-auto"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}