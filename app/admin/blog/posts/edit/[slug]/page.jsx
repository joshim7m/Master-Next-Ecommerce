'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPublishedBlogCategories, getAdvertisements, getBlogPostBySlug, updateBlogPost } from '../../../../../../src/actions/blog';
import TipTapEditor from '../../../../../../src/components/admin/TipTapEditor';
import AdvertisementMultiSelect from '../../../../../../src/components/admin/AdvertisementMultiSelect';

export default function EditBlogPostPage({ params }) {
  const router = useRouter();
  const { slug } = use(params);
  const [categories, setCategories] = useState([]);
  const [ads, setAds] = useState([]);
  const [selectedAds, setSelectedAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    bannerImage: '',
    categoryId: '',
    tags: '',
    metaDescription: '',
    status: 'draft',
    advertisementIds: [],
  });

  useEffect(() => {
    Promise.all([
      getPublishedBlogCategories(),
      getAdvertisements(),
      getBlogPostBySlug(slug),
    ]).then(([cats, adList, post]) => {
      if (!post) {
        router.push('/admin/blog/posts');
        return;
      }
      setCategories(cats);
      setAds(adList);
      setPostId(post.id);
      setSelectedAds(post.advertisements?.map((pa) => pa.advertisement) || []);
      setForm({
        title: post.title,
        slug: post.slug,
        content: post.content || '',
        bannerImage: post.bannerImage || '',
        categoryId: post.categoryId || '',
        tags: post.tags || '',
        metaDescription: post.metaDescription || '',
        status: post.status,
        advertisementIds: post.advertisements?.map((pa) => pa.advertisementId) || [],
      });
      setLoading(false);
    }).catch(() => router.push('/admin/blog/posts'));
  }, [slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    fd.append('folder', 'blog');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) setForm((prev) => ({ ...prev, bannerImage: data.urls[0] }));
    } catch {}
  };

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.categoryId || !postId) return;
    setSaving(true);
    try {
      await updateBlogPost(postId, form);
      router.push('/admin/blog/posts');
    } catch {} finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Blog Post</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Title</label>
            <input
              name="title"
              value={form.title}
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
                  const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setForm((prev) => ({ ...prev, slug }));
                }}
                disabled={!form.title.trim()}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
              >Generate</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Category</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            >
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Tags (comma-separated)</label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="e.g. fashion, tips, trends"
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Meta Description</label>
            <textarea
              name="metaDescription"
              value={form.metaDescription}
              onChange={handleChange}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Banner Image</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.bannerImage ? (
                <div className="group relative">
                  <img src={form.bannerImage} alt="Banner" className="h-24 w-40 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, bannerImage: '' }))}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                  >✕</button>
                </div>
              ) : null}
              <label className="flex h-24 w-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-[#2f0f6b] hover:text-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:hover:text-[#a78bfa]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Content</label>
          <TipTapEditor
            content={form.content}
            onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
          />
        </div>

        {ads.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Advertisements</label>
            <AdvertisementMultiSelect
              advertisements={ads}
              selected={selectedAds}
              onChange={(newSelected) => {
                setSelectedAds(newSelected);
                setForm((prev) => ({
                  ...prev,
                  advertisementIds: newSelected.map((ad) => ad.id),
                }));
              }}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.title || !form.slug || !form.categoryId}
            className="rounded-lg bg-[#2f0f6b] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
          >
            {saving ? 'Saving...' : 'Update Post'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/blog/posts')}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >Cancel</button>
        </div>
      </div>
    </section>
  );
}
