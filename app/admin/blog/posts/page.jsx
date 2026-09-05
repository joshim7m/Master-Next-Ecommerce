'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBlogPosts, getBlogCategories, deleteBlogPost } from '../../../../src/actions/blog';

export default function AdminBlogPostsPage() {
  const [data, setData] = useState({ posts: [], total: 0, totalPages: 0, currentPage: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const result = await getBlogPosts({ page: p, perPage: 12, search, categoryId: categoryFilter, status: statusFilter });
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBlogCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchData(1);
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const goToPage = (p) => {
    setPage(p);
    fetchData(p);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try { await deleteBlogPost(id); } catch {}
    fetchData(page);
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Blog Posts</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{data.total} {data.total === 1 ? 'post' : 'posts'}</p>
        </div>
        <Link href="/admin/blog/posts/create" className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">+ New</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search posts\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto order-last sm:order-none">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          >
            <option value="">Status</option>
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.posts.map((post) => (
              <tr key={post.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {post.bannerImage ? (
                      <div className="aspect-video w-14 shrink-0 overflow-hidden rounded border border-slate-200 dark:border-slate-700">
                        <img src={post.bannerImage} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-14 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 max-w-[200px]">
                      <Link href={`/admin/blog/posts/edit/${post.slug}`} className="block font-medium text-slate-900 truncate hover:text-[#2f0f6b] transition dark:text-white dark:hover:text-[#a78bfa]">{post.title}</Link>
                      <p className="text-xs text-slate-400 truncate dark:text-slate-500">{post.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap dark:text-slate-400">{post.category?.title || <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex h-5 min-w-[3.5rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold ${post.status === 'publish' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-400'}`}>{post.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap dark:text-slate-400">{formatDate(post.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link href={`/admin/blog/posts/edit/${post.slug}`} className="rounded-lg p-2 text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400" title="Edit">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Link>
                    <button onClick={() => handleDelete(post.id)} className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Delete">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.posts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No posts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >Previous</button>
          {Array.from({ length: data.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i + 1)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition ${i + 1 === page ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30'}`}
            >{i + 1}</button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === data.totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >Next</button>
        </div>
      )}
    </section>
  );
}
