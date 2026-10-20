'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { deleteIncompleteOrders } from '../lib/incompleteCheckout';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/*
 * Bangladesh business hours.
 *
 * `createdAt` is stored as UTC, but the shop's hours are Bangladesh's. Bangladesh
 * has no DST, so a fixed +6h offset is exact — verified against
 * `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })`. These helpers live
 * here rather than in a shared module because `'use server'` files can only export
 * async functions, so they cannot be imported by a client component.
 */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Wall-clock fields of a UTC instant, as observed in Bangladesh. */
function bdParts(date) {
  const d = new Date(date.getTime() + BD_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    // Shifting by a whole number of hours keeps the weekday correct too — the
    // offset is an exact multiple of a day in Bangladesh, so no drift accrues.
    weekday: d.getUTCDay(),
  };
}

/** The UTC instant of 00:00 Bangladesh time on the BD day containing `date`. */
function bdMidnightUtc(date) {
  const p = bdParts(date);
  return new Date(Date.UTC(p.year, p.month, p.day) - BD_OFFSET_MS);
}

/** `YYYY-MM-DD` of the Bangladesh calendar day containing `date`. */
function bdDateKey(date) {
  const p = bdParts(date);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export async function getRecentOrders(limit = 5) {
  const orders = await prisma.order.findMany({
    take: limit,
    include: { details: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

export async function getDashboardStats() {
  const todayStart = bdMidnightUtc(new Date());
  const [todayOrders, pendingOrders, incompleteOrders, revenueResult] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: todayStart }, orderStatus: { not: 'incomplete' } },
    }),
    prisma.order.count({ where: { orderStatus: 'pending' } }),
    prisma.order.count({ where: { orderStatus: 'incomplete' } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { orderStatus: { notIn: ['cancelled', 'incomplete'] } },
    }),
  ]);
  return serialize({
    todayOrders,
    pendingOrders,
    incompleteOrders,
    revenue: revenueResult._sum.total ? Number(revenueResult._sum.total) : 0,
  });
}

const CHART_START_HOUR = 8; // 8 AM, the bottom of the chart
const CHART_HOURS = 16; // buckets 8..23 BD
const CHART_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function hourLabel(hour) {
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Order counts per (day, hour) for the current Saturday → Friday Bangladesh week.
 *
 * The product owner requires the x axis to read Sat, Sun, Mon, Tue, Wed, Thu, Fri
 * — Bangladesh's week starts on Saturday — so the window is the Sat-first calendar
 * week *containing* today, not "today plus the previous six days" (which produced
 * whatever weekday order today happened to fall in, e.g. Thu…Wed on a Wednesday).
 * The seven columns are therefore always in the same order, and today is always on
 * screen: the column is partial after 12 AM, and the days still to come in the week
 * are simply empty until they arrive.
 *
 * Shape: 7 days in Saturday-first order, each holding 16 hourly buckets that are
 * present even when empty, so a quiet (day, hour) pair renders as an empty grid
 * slot instead of collapsing an axis. The chart draws X = weekday and Y = clock
 * time, so nothing here is meant to be read as a magnitude on the y axis.
 *
 * `incomplete` orders are draft carts rather than orders (see
 * `docs/incomplete-checkout-attempts.md`), so they are excluded. Cancelled orders
 * still count: this measures orders *placed*, and the chart is not revenue.
 */
export async function getOrdersByHourLast7Days() {
  const now = new Date();
  // Days from this week's starting Saturday back to 00:00 BD today. `weekday` is
  // the JS convention (Sun = 0 … Sat = 6), so Sat → 0, Sun → 1, … Fri → 6: the
  // first column is always Saturday and today always falls inside the window.
  const daysSinceSaturday = (bdParts(now).weekday + 1) % 7;
  const start = new Date(bdMidnightUtc(now).getTime() - daysSinceSaturday * DAY_MS);
  // End of the week (00:00 BD on next Saturday). Nothing can exist beyond `now`,
  // but bounding by the week keeps the query's meaning equal to the columns shown.
  const end = new Date(start.getTime() + CHART_DAYS * DAY_MS);

  // createdAt only — no PII leaves the database for this chart.
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      orderStatus: { not: 'incomplete' },
    },
    select: { createdAt: true },
  });

  // Boundaries, not buckets: index i is the label of clock hour 8 + i, so there is
  // one more entry than there are buckets and the last one is 12 AM (hour 24).
  // The client reads the same array for y-axis ticks and for tooltip ranges, so
  // the "3 PM – 4 PM" wording cannot drift from the axis labels. Short form is
  // used deliberately: the axis is the mandatory format, and a second formatter
  // for the tooltip is exactly the kind of duplication that drifts later.
  const hourLabels = Array.from({ length: CHART_HOURS + 1 }, (_, i) =>
    hourLabel((CHART_START_HOUR + i) % 24),
  );

  // Built straight off `start`, so index 0 is this week's Saturday and the labels
  // come out as Sat, Sun, Mon, Tue, Wed, Thu, Fri without any re-sorting.
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const p = bdParts(new Date(start.getTime() + i * DAY_MS));
    return {
      label: DAY_NAMES[p.weekday],
      weekday: WEEKDAY_NAMES[p.weekday],
      date: bdDateKey(new Date(start.getTime() + i * DAY_MS)),
      dateLabel: `${MONTH_NAMES[p.month]} ${p.day}`,
      hours: Array.from({ length: CHART_HOURS }, (_, h) => ({
        hour: CHART_START_HOUR + h,
        count: 0,
      })),
    };
  });

  let plotted = 0;
  for (const order of orders) {
    const p = bdParts(order.createdAt);
    const dayIndex = Math.floor(
      (bdMidnightUtc(order.createdAt).getTime() - start.getTime()) / DAY_MS,
    );
    const hourIndex = p.hour - CHART_START_HOUR;

    // Orders outside the 8 AM-midnight window are skipped rather than folded
    // into a neighbouring bucket, which would silently misreport them.
    if (dayIndex < 0 || dayIndex >= CHART_DAYS) continue;
    if (hourIndex < 0 || hourIndex >= CHART_HOURS) continue;

    days[dayIndex].hours[hourIndex].count += 1;
    plotted += 1;
  }

  return serialize({ days, hourLabels, total: plotted });
}

/**
 * Best-selling products in the current Bangladesh calendar month, ranked by
 * units sold, with the ৳ they brought in alongside.
 *
 * Cancelled / returned / draft orders are excluded so the ranking matches how
 * revenue is counted elsewhere in the admin.
 */
export async function getTopProductsThisMonth(limit = 5) {
  const now = new Date();
  const p = bdParts(now);
  const monthStart = new Date(
    Date.UTC(p.year, p.month, 1) - BD_OFFSET_MS,
  );

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: monthStart },
        orderStatus: { notIn: ['cancelled', 'return', 'incomplete'] },
      },
    },
    select: {
      sku: true,
      productTitle: true,
      variantName: true,
      itemImagePath: true,
      quantity: true,
      purchasePrice: true,
    },
  });

  /*
   * Grouped by sku rather than title. OrderItem is a snapshot row with no
   * productId back to Product, and two different products can legitimately share
   * a title. Rows with no sku fall back to the title so they still count once.
   *
   * Reduced in JS rather than via groupBy(_sum: { purchasePrice }): that would
   * sum bare unit prices, so qty 3 @ ৳500 would report ৳500 instead of ৳1500.
   */
  const grouped = new Map();
  for (const item of items) {
    const key = item.sku || `title:${item.productTitle}`;
    const entry = grouped.get(key) || {
      sku: item.sku || null,
      title: item.productTitle,
      image: item.itemImagePath,
      variants: new Set(),
      units: 0,
      revenue: 0,
    };
    entry.units += item.quantity;
    entry.revenue += Number(item.purchasePrice) * item.quantity;
    if (item.variantName) entry.variants.add(item.variantName);
    grouped.set(key, entry);
  }

  const ranked = Array.from(grouped.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit)
    .map((entry) => ({
      sku: entry.sku,
      title: entry.title,
      image: entry.image,
      variants: Array.from(entry.variants),
      units: entry.units,
      revenue: entry.revenue,
    }));

  // Resolve slugs so each row can deep-link into the product editor. Skipped when
  // nothing ranked carries a sku, to avoid an empty `in: []` query.
  const skus = ranked.map((r) => r.sku).filter(Boolean);
  const products = skus.length
    ? await prisma.product.findMany({
        where: { sku: { in: skus } },
        select: { id: true, sku: true },
      })
    : [];
  const idBySku = new Map(products.map((p) => [p.sku, p.id]));

  return serialize(
    ranked.map((entry) => ({
      ...entry,
      productId: entry.sku ? idBySku.get(entry.sku) || null : null,
    })),
  );
}

export async function getOrders() {
  const orders = await prisma.order.findMany({
    include: { details: true, items: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

const ORDERS_PAGE_SIZE = 20;
/** The orders list never shows anything older than this rolling window. */
const ORDERS_WINDOW_DAYS = 31;

/**
 * UTC instant of 00:00 Bangladesh time `daysAgo` days before today.
 * Bangladesh has no DST, so whole-day arithmetic on the BD midnight is exact.
 */
function bdMidnightDaysAgo(daysAgo, now = new Date()) {
  return new Date(bdMidnightUtc(now).getTime() - daysAgo * DAY_MS);
}

/** UTC instant of 00:00 Bangladesh time on a `YYYY-MM-DD` calendar date. */
function bdDateKeyToUtc(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - BD_OFFSET_MS);
}

/**
 * Resolve the filter preset to a [from, to] window, clamped to the last 31
 * Bangladesh days. `to` can end up before `from` (empty range) when a custom
 * range lies entirely outside the window — the caller turns that into 0 rows.
 */
function resolveOrdersRange(preset, fromKey, toKey, now = new Date()) {
  const todayStart = bdMidnightUtc(now);
  const windowStart = bdMidnightDaysAgo(ORDERS_WINDOW_DAYS - 1, now);

  let start = windowStart;
  let end = now;

  switch (preset) {
    case 'today':
      start = todayStart;
      break;
    case 'yesterday':
      start = new Date(todayStart.getTime() - DAY_MS);
      end = new Date(todayStart.getTime() - 1);
      break;
    case 'last7':
      // Rolling window: today plus the previous six Bangladesh days.
      start = bdMidnightDaysAgo(6, now);
      break;
    case 'custom': {
      const customStart = bdDateKeyToUtc(fromKey);
      const customEnd = bdDateKeyToUtc(toKey);
      if (customStart && customEnd) {
        start = customStart;
        end = new Date(customEnd.getTime() + DAY_MS - 1);
      }
      break;
    }
    default:
      break;
  }

  const clampedStart = start < windowStart ? windowStart : start;
  const clampedEnd = end > now ? now : end;
  // A range entirely before the window (or in the future) yields zero rows.
  return { from: clampedStart, to: clampedEnd < clampedStart ? new Date(clampedStart.getTime() - 1) : clampedEnd };
}

/**
 * One page (20) of orders for /admin/orders, filtered and paginated in the
 * database. Covers only the last 31 Bangladesh days — by design, older orders
 * are not reachable from this list.
 */
export async function getOrdersPage({
  preset = 'today',
  from = null,
  to = null,
  status = 'all',
  search = '',
  page = 1,
} = {}) {
  const range = resolveOrdersRange(preset, from, to);
  const query = String(search || '').trim();

  const where = {
    createdAt: { gte: range.from, lte: range.to },
    ...(status && status !== 'all' ? { orderStatus: status } : {}),
    ...(query
      ? {
          OR: [
            { orderNo: { contains: query, mode: 'insensitive' } },
            { details: { is: { phoneNumber: { contains: query, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const orders = total
    ? await prisma.order.findMany({
        where,
        include: { details: true, items: true, user: true },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * ORDERS_PAGE_SIZE,
        take: ORDERS_PAGE_SIZE,
      })
    : [];

  return serialize({
    orders,
    total,
    page: safePage,
    pageSize: ORDERS_PAGE_SIZE,
    totalPages,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
}

/**
 * All-time order counts for one phone number — the stats popup in the orders
 * list, which must not be limited to the page (or 31-day window) on screen.
 */
export async function getCustomerOrderStats(phone) {
  const mobile = String(phone || '').trim();
  if (!mobile) {
    return serialize({ name: null, total: 0, completed: 0, returned: 0, others: 0 });
  }

  const where = { details: { is: { phoneNumber: mobile } } };
  const [total, completed, returned, latest] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, orderStatus: 'completed' } }),
    prisma.order.count({ where: { ...where, orderStatus: 'return' } }),
    prisma.order.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { details: { select: { customerName: true } } },
    }),
  ]);

  return serialize({
    name: latest?.details?.customerName || null,
    total,
    completed,
    returned,
    others: total - completed - returned,
  });
}

export async function getOrderReport(fromISO, toISO) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: new Date(fromISO), lte: new Date(toISO) } },
    include: { details: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

export async function getOrderByOrderNo(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { details: true, items: true, user: true, courierBooking: true },
  });
  return serialize(order);
}

export async function getIncompleteOrders() {
  const orders = await prisma.order.findMany({
    where: { orderStatus: 'incomplete' },
    include: { details: true, items: true },
    orderBy: { updatedAt: 'desc' },
  });
  return serialize(orders);
}

export async function deleteIncompleteOrder(id) {
  const order = await prisma.order.findFirst({
    where: { id, orderStatus: 'incomplete' },
  });
  if (!order) throw new Error('Incomplete order not found');
  const deleted = await prisma.$transaction(async (tx) => {
    return deleteIncompleteOrders(tx, { id });
  });
  revalidatePath('/admin/incomplete-orders');
  return deleted;
}

export async function updateOrderStatus(id, data) {
  const order = await prisma.order.update({
    where: { id },
    data,
  });
  revalidatePath('/admin/orders');
  return serialize(order);
}

/**
 * Recomputes an order's stored total from its line items:
 * subtotal + deliveryCharge - discount, never below zero.
 * Returns the stored total.
 */
async function recalculateOrderTotal(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, details: true },
  });
  if (!order) throw new Error('Order not found');
  const subtotal = order.items.reduce(
    (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
  );
  const deliveryCharge = Number(order.details?.deliveryCharge || 0);
  const discount = Number(order.details?.discount || 0);
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  await prisma.order.update({ where: { id: orderId }, data: { total } });
  return total;
}

export async function updateOrderItemQuantity(itemId, quantity) {
  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { order: true },
  });
  await recalculateOrderTotal(item.orderId);
  revalidatePath('/admin/orders');
  return serialize(item);
}

export async function deleteOrderItem(itemId) {
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item) throw new Error('Item not found');
  if (item.order.orderStatus === 'completed') throw new Error('Cannot remove items from completed orders');
  await prisma.orderItem.delete({ where: { id: itemId } });
  await recalculateOrderTotal(item.orderId);
  revalidatePath('/admin/orders');
  return serialize(item);
}

export async function updateOrderDetails(orderId, data) {
  const discountProvided = data.discount !== undefined;
  let discount;

  if (discountProvided) {
    discount = Number(data.discount);
    if (!Number.isFinite(discount) || discount < 0) {
      throw new Error('Discount must be a positive amount');
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, details: true },
    });
    if (!order) throw new Error('Order not found');
    const subtotal = order.items.reduce(
      (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
    );
    const deliveryCharge = Number(order.details?.deliveryCharge || 0);
    const maxDiscount = subtotal + deliveryCharge;
    if (discount > maxDiscount) discount = maxDiscount;
    data = { ...data, discount };
  }

  const details = await prisma.orderDetails.update({
    where: { orderId },
    data,
  });

  if (data.deliveryCharge !== undefined || discountProvided) {
    await recalculateOrderTotal(orderId);
  }
  revalidatePath('/admin/orders');
  return serialize(details);
}
