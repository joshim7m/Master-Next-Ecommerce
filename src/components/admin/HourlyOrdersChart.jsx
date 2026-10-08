'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from './ThemeProvider';

// `react-chartjs-2` registers nothing for you, and chart.js is consumed from its
// tree-shaken ESM build, so nothing is auto-registered either. BarController is
// what turns `type: 'bar'` into a chart at all: without it Chart.js throws
// '"bar" is not a registered controller' and the card renders blank.
ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip);

// Chart geometry constants. These mirror the buckets the server action produces;
// the y axis is clock time, so these are hours, not row indices.
const START_HOUR = 8; // 8 AM, bottom of the axis
const END_HOUR = 24; // midnight, top of the axis
const CHART_HEIGHT = 'h-[440px] sm:h-[380px]';

// Admin accent (brand purple), same tokens as the rest of the dashboard chrome.
const ACCENT = { light: '#2f0f6b', dark: '#a78bfa' };

// Empty buckets stay visible as a grid slot rather than disappearing, so a busy
// hour reads as a break in an otherwise continuous column.
const EMPTY_ALPHA = { light: 0.07, dark: 0.1 };
// Floor for a bucket that has orders, so a single order in a busy window is still
// visible next to the peak.
const MIN_ALPHA = 0.3;

function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Orders placed per hour, for each of the current Sat → Fri Bangladesh week.
 *
 * Orientation is the whole point of this chart, so it is worth stating plainly:
 *
 *   X = the 7 weekdays (one column each, always Sat, Sun, Mon, …, Fri)
 *   Y = clock time, 8 AM at the bottom through midnight at the top
 *
 * Each block is one (day, hour) pair drawn as a *floating* bar — `y: [hour,
 * hour + 1]` — so the vertical axis is a real clock rather than an order count.
 * The earlier version mapped order count onto the vertical axis and encoded the
 * hour only as one of sixteen legend-coloured datasets, which put "how many" where
 * "what time" belonged and forced a 16-entry legend to explain it.
 *
 * Because all 16 blocks of a day share one category label, they also share the
 * same x centre and simply stack down the hour range — which is what makes a day
 * read as a single column.
 */
export default function HourlyOrdersChart({ data, loading }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const days = data?.days || [];
  const hourLabels = data?.hourLabels || [];
  const total = data?.total || 0;
  const isDark = theme === 'dark';

  const points = useMemo(() => {
    const list = [];
    let max = 0;
    for (const day of days) {
      for (let i = 0; i < day.hours.length; i += 1) {
        const bucket = day.hours[i];
        if (bucket.count > max) max = bucket.count;
        list.push({
          x: day.label,
          // Floating bar: occupies the hour, height is always one hour.
          y: [bucket.hour, bucket.hour + 1],
          count: bucket.count,
          weekday: day.weekday,
          dateLabel: day.dateLabel,
          // "3:00 PM – 4:00 PM", from the same boundary labels as the y axis.
          rangeLabel: `${hourLabels[i]} – ${hourLabels[i + 1]}`,
        });
      }
    }
    return { list, max };
  }, [days, hourLabels]);

  // Order volume is expressed only as colour intensity — bar height stays
  // one hour wide, because scaling it by count would stretch the clock axis.
  const blockColor = useMemo(() => {
    const base = isDark ? ACCENT.dark : ACCENT.light;
    const empty = EMPTY_ALPHA[isDark ? 'dark' : 'light'];
    return (count) => {
      if (!count) return withAlpha(base, empty);
      const intensity = points.max > 0 ? count / points.max : 0;
      return withAlpha(base, MIN_ALPHA + (1 - MIN_ALPHA) * intensity);
    };
  }, [isDark, points.max]);

  const options = useMemo(() => {
    const muted = isDark ? '#64748b' : '#94a3b8';

    return {
      responsive: true,
      maintainAspectRatio: false,
      // Nearest block only: index mode would list all 16 hours of a day at once,
      // which defeats the point of the layout.
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        // One dataset and one accent colour — the legend would only repeat that.
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: isDark ? '#1e293b' : '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const raw = items[0]?.raw;
              return raw ? `${raw.weekday} · ${raw.dateLabel}` : '';
            },
            label: (item) => item.raw?.rangeLabel || '',
            // Read the count off the raw block, never off parsed.y, which is the
            // [15, 16] hour interval rather than a number of orders.
            afterLabel: (item) => `Orders: ${item.raw?.count ?? 0}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            // All seven day names stay on screen at every width.
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: { size: 11 },
            color: muted,
          },
        },
        y: {
          min: START_HOUR,
          max: END_HOUR,
          // Fixed bounds: quiet days must not stretch the axis, and the top of
          // the axis is the midnight boundary rather than a 12 AM bucket.
          grid: { color: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)' },
          border: { display: false },
          ticks: {
            stepSize: 1,
            padding: 6,
            precision: 0,
            font: { size: 10 },
            color: muted,
            callback: (value) => hourLabels[Math.round(value) - START_HOUR] || '',
          },
        },
      },
    };
  }, [hourLabels, isDark]);

  const chartData = useMemo(
    () => ({
      labels: days.map((d) => d.label),
      datasets: [
        {
          label: 'Orders',
          data: points.list,
          // Scriptable per block: intensity is a function of that block's count.
          backgroundColor: (ctx) => blockColor(ctx.raw?.count),
          hoverBackgroundColor: withAlpha(isDark ? ACCENT.dark : ACCENT.light, 1),
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.82,
          categoryPercentage: 0.9,
        },
      ],
    }),
    [blockColor, days, isDark, points.list],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Orders by Day &amp; Hour
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            8:00 AM &ndash; 12:00 AM &middot; Sat &ndash; Fri week (Bangladesh time)
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#2f0f6b]/10 px-2.5 py-1 text-sm font-semibold text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]">
          {total} this week
        </span>
      </div>

      {loading ? (
        <div className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50 ${CHART_HEIGHT}`} />
      ) : !mounted ? (
        <div className={CHART_HEIGHT} />
      ) : !days.length || !hourLabels.length ? (
        <div className={`flex items-center justify-center text-sm text-slate-400 ${CHART_HEIGHT}`}>
          Loading chart&hellip;
        </div>
      ) : total === 0 ? (
        <div className={`flex flex-col items-center justify-center gap-1 px-4 text-center ${CHART_HEIGHT}`}>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No orders between 8:00 AM and 12:00 AM during this period
          </p>
          <p className="text-xs text-slate-400">
            Only orders placed inside these hours are counted &mdash; the chart covers the
            current Saturday&ndash;Friday week.
          </p>
        </div>
      ) : (
        <div className={CHART_HEIGHT}>
          {/* The canvas is a single opaque element to a screen reader, so the
              summary is passed as the canvas's own fallback content. */}
          <Bar
            options={options}
            data={chartData}
            fallbackContent="Orders by day and hour, 8 AM to midnight, Saturday to Friday week in Bangladesh time."
          />
        </div>
      )}
    </div>
  );
}
