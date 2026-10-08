'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPageBySlug, updatePage, deletePage } from '../../../../../../src/actions/pages';
import TipTapEditor from '../../../../../../src/components/admin/TipTapEditor';

export default function EditPagePage({ params }) {
  const router = useRouter();
  const { slug } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageId, setPageId] = useState(null);
  const [originalSlug, setOriginalSlug] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    content: '',
    metaDescription: '',
    status: 'publish',
  });

  useEffect(() => {
    getPageBySlug(slug)
      .then((page) => {
        if (!page) {
          router.push('/admin/settings/pages');
          return;
        }
        setPageId(page.id);
        setOriginalSlug(page.slug);
        setForm({
          name: page.name,
          slug: page.slug,
          content: page.content || '',
          metaDescription: page.metaDescription || '',
          status: page.status,
        });
        setLoading(false);
      })
      .catch(() => router.push('/admin/settings/pages'));
  }, [slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Name and slug are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updatePage(pageId, form);
      router.push('/admin/settings/pages');
    } catch (err) {
      setError(err?.message?.includes('Unique constraint') ? 'A page with this slug already exists.' : (err?.message || 'Failed to save page.'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this page?')) return;
    try { await deletePage(pageId); } catch {}
    router.push('/admin/settings/pages');
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Page</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Slug</label>
            <div className="mt-1 flex gap-2">
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
              />
              <button
                type="button"
                onClick={() => {
                  const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setForm((prev) => ({ ...prev, slug }));
                }}
                disabled={!form.name.trim()}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
              >Generate</button>
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Rendered at /pages/{form.slug || 'slug'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            >
              <option value="publish">Publish</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Meta Description (SEO)</label>
            <input
              name="metaDescription"
              value={form.metaDescription}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Content</label>
          <TipTapEditor
            content={form.content}
            onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.slug.trim()}
            className="rounded-lg bg-[#2f0f6b] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
          >
            {saving ? 'Saving...' : 'Update Page'}
          </button>
          <Link
            href={`/pages/${form.slug}`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >View Page</Link>
          <button
            type="button"
            onClick={() => router.push('/admin/settings/pages')}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >Cancel</button>
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
          >Delete</button>
        </div>
      </div>
    </section>
  );
}