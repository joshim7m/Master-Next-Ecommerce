'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Clock,
  Eye,
  Truck,
  PauseCircle,
  PhoneCall,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Ban,
  ClipboardList,
  Coins,
} from 'lucide-react';
import { getDashboardStats, getOrdersByHourLast7Days, getTopProductsThisMonth } from '../../../src/actions/orders';
import HourlyOrdersChart from '../../../src/components/admin/HourlyOrdersChart';
import TopProductsMonth from '../../../src/components/admin/TopProductsMonth';

/**
 * Every order status the shop knows (see src/lib/courierStatus.js), each as a
 * compact one-line card. Placeholders read '—' until the query lands.
 */
const STATUS_TILES = [
  { key: 'today', label: "Today's Orders", href: '/admin/orders', Icon: CalendarClock, chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  { key: 'pending', label: 'Pending', href: '/admin/orders?status=pending', Icon: Clock, chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  { key: 'in_review', label: 'In Review', href: '/admin/orders?status=in_review', Icon: Eye, chip: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  { key: 'in_courier', label: 'In Courier', href: '/admin/orders?status=in_courier', Icon: Truck, chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' },
  { key: 'hold', label: 'Hold', href: '/admin/orders?status=hold', Icon: PauseCircle, chip: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
  { key: 'follow_up', label: 'Follow-Up', href: '/admin/orders?status=follow_up', Icon: PhoneCall, chip: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400' },
  { key: 'return', label: 'Return', href: '/admin/orders?status=return', Icon: RotateCcw, chip: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' },
  { key: 'cancelled', label: 'Cancelled', href: '/admin/orders?status=cancelled', Icon: XCircle, chip: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  { key: 'completed', label: 'Completed', href: '/admin/orders?status=completed', Icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  { key: 'blocked', label: 'Blocked', href: '/admin/orders?status=blocked', Icon: Ban, chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  { key: 'incomplete', label: 'Incomplete', href: '/admin/incomplete-orders', Icon: ClipboardList, chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300' },
];

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

const RANGE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState({ todayOrders: '\u2014', statusCounts: {}, soldValue: '\u2014' });
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  // Stats refetch whenever the period tab changes.
  useEffect(() => {
    let alive = true;
    getDashboardStats(range).then((data) => { if (alive) setStats(data); });
    return () => { alive = false; };
  }, [range]);

  // Charts are period-independent — fetched once on mount.
  useEffect(() => {
    Promise.all([getOrdersByHourLast7Days(), getTopProductsThisMonth(5)]).then(
      ([hourly, top]) => {
        setChartData(hourly);
        setTopProducts(top);
        setLoadingCharts(false);
      },
    );
  }, []);

  const statusValue = (key) => {
    if (key === 'today') return stats.todayOrders ?? '\u2014';
    const n = stats.statusCounts?.[key];
    return n === undefined ? '\u2014' : n;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Period tabs — one row, pinned to the right of the breadcrumb heading */}
      <div className="flex justify-end">
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm sm:w-auto dark:border-slate-700 dark:bg-slate-800" role="tablist" aria-label="Dashboard period">
          {RANGE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={range === t.key}
              onClick={() => setRange(t.key)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                range === t.key
                  ? 'bg-[#2f0f6b] text-white shadow-sm dark:bg-[#a78bfa] dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards — every status + sold value, each card a single line */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {STATUS_TILES.map(({ key, label, href, Icon, chip }) => (
          <Link
            key={key}
            href={href}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-110 ${chip}`}>
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 sm:text-[13px] dark:text-slate-400">{label}</p>
            <p className="shrink-0 text-base font-bold text-slate-900 sm:text-lg dark:text-white">{statusValue(key)}</p>
          </Link>
        ))}
        {/* Sold value — net product money (revenue minus delivery charges) */}
        <Link
          href="/admin/reports/sales"
          className="group flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 shadow-sm transition hover:shadow dark:border-violet-800 dark:bg-violet-900/20"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 transition group-hover:scale-110 dark:bg-violet-900/40 dark:text-violet-300">
            <Coins size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-violet-700 sm:text-[13px] dark:text-violet-300">Sold Value</p>
          <p className="shrink-0 text-base font-bold text-violet-700 sm:text-lg dark:text-violet-200">
            {stats.soldValue !== '\u2014' ? `\u09F3${Number(stats.soldValue).toLocaleString()}` : '\u2014'}
          </p>
        </Link>
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
