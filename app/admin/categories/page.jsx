'use client';

import { useEffect, useState, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../../src/actions/categories';

const PER_PAGE = 10;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', image: '', description: '' });
  const [page, setPage] = useState(0);

  useEffect(() => {
    getCategories().then((data) => { setCategories(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const resetForm = () => setForm({ name: '', slug: '', image: '', description: '', parentId: '' });
  const openCreate = () => { setEditing('new'); resetForm(); };

  const openEdit = (cat) => {
    setEditing(cat.id);
    setForm({ name: cat.name, slug: cat.slug, image: cat.image || '', description: cat.description || '', parentId: cat.parentId || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    fd.append('folder', 'categories');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) {
        setForm((prev) => ({ ...prev, image: data.urls[0] }));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    try {
      if (editing === 'new') {
        await createCategory(form);
      } else {
        await updateCategory(editing, form);
      }
    } catch {}
    setEditing(null);
    resetForm();
    getCategories().then(setCategories);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try { await deleteCategory(id); } catch {}
    getCategories().then(setCategories);
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Categories</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition">+ New</button>
      </div>

      <div className="relative max-w-full sm:max-w-xs">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
      </div>

      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{editing === 'new' ? 'Create Category' : 'Edit Category'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Slug</label>
              <div className="mt-1 flex">
                <input name="slug" value={form.slug} onChange={handleChange} className="flex-1 rounded-l-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <button
                  type="button"
                  onClick={() => {
                    const slug = form.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    setForm((prev) => ({ ...prev, slug }));
                  }}
                  disabled={!form.name.trim()}
                  className="shrink-0 rounded-r-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Image</label>
              <div className="flex flex-wrap items-center gap-3">
                {form.image ? (
                  <div className="group relative">
                    <img src={form.image} alt="Category" className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                    >
                      &#10005;
                    </button>
                  </div>
                ) : null}
                <label className="flex h-16 w-16 sm:h-20 sm:w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-[#2f0f6b] hover:text-[#2f0f6b] dark:border-slate-600 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Description</label>
              <input name="description" value={form.description} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Parent Category</label>
              <select
                name="parentId"
                value={form.parentId}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">None (Top-level)</option>
                {categories
                  .filter((c) => c.id !== editing)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex gap-3">
            <button onClick={handleSave} className="flex-1 sm:flex-none rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition">Save</button>
            <button onClick={() => { setEditing(null); resetForm(); }} className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Cancel</button>
          </div>
        </div>
      ) : null}


      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slug</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parent</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  <span>{cat.name} - </span>
                  <span className='text-xs dark:text-slate-400'>({cat._count?.products ?? 0})</span>
                  </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{cat.slug}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{cat.parent?.name || <span className="text-slate-300 dark:text-slate-600">none</span>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => openEdit(cat)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#2f0f6b] dark:hover:bg-slate-700 dark:hover:text-[#a78bfa]" title="Edit category">
                      <svg className="h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Delete category">
                      <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">{search ? 'No categories match your search.' : 'No categories yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                i === safePage
                  ? 'bg-[#2f0f6b] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
