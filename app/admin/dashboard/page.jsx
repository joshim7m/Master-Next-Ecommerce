'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardStats, getRecentOrders } from '../../../src/actions/orders';

function StatIcon({ icon }) {
  const cls = 'h-5 w-5';
  switch (icon) {
    case 'products':
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'categories':
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
    case 'orders':
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case 'revenue':
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

function StatusBadge({ status }) {
  const colors = {
    Shipped: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Processed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ products: '\u2014', categories: '\u2014', orders: '\u2014', revenue: '\u2014' });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getDashboardStats().then(setStats);
    getRecentOrders(5).then(setOrders);
  }, []);

  const statCards = [
    { label: 'Total Products', value: stats.products, href: '/admin/products', icon: 'products', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Categories', value: stats.categories, href: '/admin/categories', icon: 'categories', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Orders', value: stats.orders, href: '/admin/orders', icon: 'orders', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Revenue', value: stats.revenue !== '\u2014' ? `\u09F3${Number(stats.revenue).toLocaleString()}` : '\u2014', href: '/admin/orders', icon: 'revenue', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  ];

  const quickActions = [
    { label: 'Add Product', href: '/admin/products/create', desc: 'Create a new product listing' },
    { label: 'Manage Categories', href: '/admin/categories', desc: 'Organize your catalog' },
    { label: 'View Orders', href: '/admin/orders', desc: 'Track and fulfill orders' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <div className={"rounded-lg " + s.bg + " p-1.5 sm:p-2 " + s.color}>
                <StatIcon icon={s.icon} />
              </div>
            </div>
            <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">
              View all
            </Link>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider dark:border-slate-700">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-50 last:border-0 cursor-pointer transition hover:bg-slate-50/50 dark:border-slate-700/50 dark:hover:bg-slate-700/30"
                    onClick={() => window.location.href = "/admin/orders/" + o.orderNo}
                  >
                    <td className="py-3 pr-4 font-medium text-[#2f0f6b] dark:text-[#a78bfa]">{o.orderNo}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{o.details?.customerName || o.user?.name || '\u2014'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={o.orderStatus} /></td>
                    <td className="py-3 pr-4 text-slate-900 dark:text-white">{'\u09F3'}{Number(o.total).toLocaleString()}</td>
                    <td className="py-3 text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : '\u2014'}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={"/admin/orders/" + o.orderNo}
                className="block rounded-lg border border-slate-100 p-3 transition hover:border-[#2f0f6b]/20 hover:bg-[#2f0f6b]/5 dark:border-slate-700 dark:hover:border-[#a78bfa]/30 dark:hover:bg-[#a78bfa]/5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#2f0f6b] dark:text-[#a78bfa]">{o.orderNo}</span>
                  <StatusBadge status={o.orderStatus} />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{o.details?.customerName || o.user?.name || "\u2014"}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{'\u09F3'}{Number(o.total).toLocaleString()}</span>
                  <span>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}</span>
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No orders yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="block rounded-lg border border-slate-100 p-3 transition hover:border-[#2f0f6b]/20 hover:bg-[#2f0f6b]/5 dark:border-slate-700 dark:hover:border-[#a78bfa]/30 dark:hover:bg-[#a78bfa]/5"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white">{a.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
