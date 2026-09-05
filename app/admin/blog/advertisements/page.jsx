'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement } from '../../../../src/actions/blog';

const PER_PAGE = 10;

export default function AdminAdvertisementsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', image: '', text: '', price: '', productLink: '' });
  const [page, setPage] = useState(0);

  useEffect(() => {
    getAdvertisements().then((data) => { setAds(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return ads;
    const q = search.toLowerCase();
    return ads.filter((a) => a.title.toLowerCase().includes(q));
  }, [ads, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const resetForm = () => setForm({ title: '', image: '', text: '', price: '', productLink: '' });
  const openCreate = () => { setEditing('new'); resetForm(); };

  const openEdit = (ad) => {
    setEditing(ad.id);
    setForm({ title: ad.title, image: ad.image || '', text: ad.text || '', price: ad.price || '', productLink: ad.productLink || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    fd.append('folder', 'ads');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) setForm((prev) => ({ ...prev, image: data.urls[0] }));
    } catch {}
  };

  const handleSave = async () => {
    if (!form.title) return;
    try {
      if (editing === 'new') await createAdvertisement(form);
      else await updateAdvertisement(editing, form);
    } catch {}
    setEditing(null);
    resetForm();
    getAdvertisements().then(setAds);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this advertisement?')) return;
    try { await deleteAdvertisement(id); } catch {}
    getAdvertisements().then(setAds);
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Advertisements</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{ads.length} {ads.length === 1 ? 'advertisement' : 'advertisements'}</p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">+ New</button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search ads\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
      </div>

      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{editing === 'new' ? 'Create Advertisement' : 'Edit Advertisement'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Price</label>
              <input name="price" value={form.price} onChange={handleChange} type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Text / Description</label>
              <textarea name="text" value={form.text} onChange={handleChange} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Product Link</label>
              <input name="productLink" value={form.productLink} onChange={handleChange} placeholder="https://..." className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Image</label>
              <div className="flex flex-wrap items-center gap-3">
                {form.image ? (
                  <div className="group relative">
                    <img src={form.image} alt="Ad" className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: '' }))} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100">✕</button>
                  </div>
                ) : null}
                <label className="flex h-16 w-16 sm:h-20 sm:w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-[#2f0f6b] hover:text-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }} className="hidden" />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex gap-3">
            <button onClick={handleSave} className="flex-1 sm:flex-none rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">Save</button>
            <button onClick={() => { setEditing(null); resetForm(); }} className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Link</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Posts</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((ad) => (
              <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <td className="w-[72px] px-4 py-3">
                  {ad.image ? (
                    <img src={ad.image} alt={ad.title} className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-400 dark:bg-slate-900/50 dark:text-slate-500">{ad.title.charAt(0).toUpperCase()}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate dark:text-white">{ad.title}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap dark:text-slate-400">{ad.price ? `৳${parseFloat(ad.price).toLocaleString()}` : <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-500 dark:text-slate-400">{ad.productLink || <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">{ad._count?.blogPosts ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => openEdit(ad)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#2f0f6b] dark:hover:bg-slate-700/30 dark:hover:text-[#a78bfa]" title="Edit">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(ad.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Delete">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">{search ? 'No ads match your search.' : 'No advertisements yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Previous</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`h-8 w-8 rounded-lg text-sm font-medium transition ${i === safePage ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30'}`}>{i + 1}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Next</button>
        </div>
      ) : null}
    </section>
  );
}
