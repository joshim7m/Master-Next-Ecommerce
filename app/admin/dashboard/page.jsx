'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardStats, getOrdersByHourLast7Days, getTopProductsThisMonth } from '../../../src/actions/orders';
import HourlyOrdersChart from '../../../src/components/admin/HourlyOrdersChart';
import TopProductsMonth from '../../../src/components/admin/TopProductsMonth';

function StatIcon({ icon }) {
  const cls = 'h-5 w-5';
  switch (icon) {
    case 'today':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'pending':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'incomplete':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'revenue':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
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
    return: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    todayOrders: '\u2014',
    pendingOrders: '\u2014',
    incompleteOrders: '\u2014',
    revenue: '\u2014',
  });
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    getDashboardStats().then(setStats);
    Promise.all([getOrdersByHourLast7Days(), getTopProductsThisMonth(5)]).then(
      ([hourly, top]) => {
        setChartData(hourly);
        setTopProducts(top);
        setLoadingCharts(false);
      },
    );
  }, []);

  const statCards = [
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      href: '/admin/orders',
      icon: 'today',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      href: '/admin/orders?status=pending',
      icon: 'pending',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      label: 'Incomplete Orders',
      value: stats.incompleteOrders,
      href: '/admin/incomplete-orders',
      icon: 'incomplete',
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-700/40',
    },
    {
      label: 'Revenue',
      value: stats.revenue !== '\u2014' ? `\u09F3${Number(stats.revenue).toLocaleString()}` : '\u2014',
      href: '/admin/reports/sales',
      icon: 'revenue',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/30',
    },
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
        {/* Hourly orders chart */}
        <HourlyOrdersChart data={chartData} loading={loadingCharts} />

        {/* Product of the Month */}
        <TopProductsMonth products={topProducts} loading={loadingCharts} />
      </div>
    </div>
  );
}
