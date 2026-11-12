'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { deleteIncompleteOrders } from '../lib/incompleteCheckout';
import { captureCompletedCustomer } from '../lib/completedCustomers';
import { getDeliveryAreas } from '../lib/getDeliveryAreas';
import { getFreeDeliverySettings } from '../lib/getFreeDeliverySettings';
import { applyFreeDelivery } from '../lib/freeDelivery';
import { resolveAreaName, chargeForArea } from '../lib/deliveryAreas';

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

const DASHBOARD_EXCLUDED_STATUSES = ['cancelled', 'incomplete'];

/**
 * Date window for a dashboard period (Bangladesh calendar days):
 * `all` · `today` · `yesterday` · `week` (last 7 BD days incl. today) ·
 * `month` (from the 1st of the current BD month). Returns the `createdAt`
 * filter fragment — `{}` for all.
 */
function dashboardRangeFilter(range) {
  const now = new Date();
  let since = null;
  let until = null;
  switch (range) {
    case 'today':
      since = bdMidnightUtc(now);
      break;
    case 'yesterday':
      since = bdMidnightUtc(new Date(now.getTime() - DAY_MS));
      until = bdMidnightUtc(now);
      break;
    case 'week':
      since = bdMidnightUtc(new Date(now.getTime() - 6 * DAY_MS));
      break;
    case 'month': {
      const p = bdParts(now);
      since = new Date(Date.UTC(p.year, p.month, 1) - BD_OFFSET_MS);
      break;
    }
    default:
      break;
  }
  if (!since && !until) return {};
  return {
    createdAt: {
      ...(since ? { gte: since } : {}),
      ...(until ? { lt: until } : {}),
    },
  };
}

export async function getDashboardStats(range = 'all') {
  const dateFilter = dashboardRangeFilter(String(range || 'all'));
  const [todayOrders, grouped, totals, delivery] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: bdMidnightUtc(new Date()) }, orderStatus: { not: 'incomplete' } },
    }),
    // One query gives a count for every status that actually has rows — the
    // dashboard derives each status tile from this (missing keys mean 0).
    prisma.order.groupBy({
      by: ['orderStatus'],
      _count: { _all: true },
      where: dateFilter,
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { orderStatus: { notIn: DASHBOARD_EXCLUDED_STATUSES }, ...dateFilter },
    }),
    // Sold value excludes delivery charge: `total` is subtotal + delivery
    // charge − discount, so total − deliveryCharge is exactly the net product
    // money. Summed over the same orders as the revenue sum.
    prisma.orderDetails.aggregate({
      _sum: { deliveryCharge: true },
      where: { order: { ...dateFilter, orderStatus: { notIn: DASHBOARD_EXCLUDED_STATUSES } } },
    }),
  ]);
  const counts = {};
  for (const g of grouped) {
    counts[g.orderStatus] = g._count._all;
  }
  const sumTotal = Number(totals._sum.total ?? 0);
  const sumDelivery = Number(delivery._sum.deliveryCharge ?? 0);
  return serialize({
    todayOrders,
    statusCounts: counts,
    soldValue: Math.max(0, sumTotal - sumDelivery),
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
    case 'all':
      // Whole available window: the last 31 Bangladesh days.
      break;
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
  preset = 'all',
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

/**
 * Hard-deletes one order and all of its child rows in a single transaction.
 * `OrderDetails` / `OrderItem` reference the order with RESTRICT foreign keys
 * (same constraint `deleteIncompleteOrders` works around), so children must go
 * first. `CourierBooking` cascades automatically.
 *
 * Safety guard: `completed` orders are deletable once older than 31 Bangladesh
 * days; `in_courier` and `blocked` orders are the business record for sales
 * reports, courier tracking and fraud evidence, so they can never be deleted —
 * resolve them first instead.
 */
export async function deleteOrder(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderNo: true, orderStatus: true, createdAt: true },
  });
  if (!order) throw new Error('Order not found');
  if (order.orderStatus === 'in_courier' || order.orderStatus === 'blocked') {
    throw new Error('In-courier and blocked orders cannot be deleted.');
  }
  if (order.orderStatus === 'completed') {
    // Completed orders age out of the protection window after 31 Bangladesh
    // days — count whole BD days, not raw UTC hours, so a completed order
    // placed this morning is still protected at any hour.
    const cutoff = bdMidnightUtc(new Date()) - 31 * 24 * 60 * 60 * 1000;
    if (new Date(order.createdAt).getTime() >= cutoff) {
      throw new Error('Completed orders can only be deleted after 31 days.');
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.orderDetails.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });
  revalidatePath('/admin/orders');
  revalidatePath('/admin/incomplete-orders');
  return serialize(order);
}

export async function updateOrderStatus(id, data) {
  const order = await prisma.order.update({
    where: { id },
    data,
  });
  // Completing an order snapshots the customer for the Customers report —
  // regardless of which path (manual or courier webhook) did it.
  if (order.orderStatus === 'completed') {
    await captureCompletedCustomer(order.id).catch(() => {});
  }
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
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }
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
  // An order always keeps at least one item — remove the whole order instead.
  const itemCount = await prisma.orderItem.count({ where: { orderId: item.orderId } });
  if (itemCount <= 1) {
    throw new Error('An order must have at least one item. Delete the order instead.');
  }
  await prisma.orderItem.delete({ where: { id: itemId } });
  await recalculateOrderTotal(item.orderId);
  revalidatePath('/admin/orders');
  return serialize(item);
}

/**
 * Creates an order from the admin panel ("Create Order" modal). Every price is
 * re-derived from the product/variant rows — nothing the client sends is
 * trusted — mirroring the storefront checkout's pricing rules:
 * variant sale_price ?? variant unite_price ?? product sale_price ?? product
 * unite_price; the variant's own image when it has one, else the product's
 * first image. `orderNo` is a unique 6-digit number, `orderStatus` starts at
 * `pending`, and the delivery charge comes from the admin-configured zones.
 */
export async function createOrder(input) {
  const { items: requestedItems, customerName, phoneNumber, shippingArea, shippingAddress, orderNote } = input || {};

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error('Add at least one item to the order.');
  }
  const name = String(customerName || '').trim();
  const mobile = String(phoneNumber || '').trim();
  const address = String(shippingAddress || '').trim();
  if (!name) throw new Error('Customer name is required.');
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobile)) {
    throw new Error('Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.');
  }
  if (!address) throw new Error('Shipping address is required.');

  // Re-price each requested line from the database rows.
  const lines = [];
  for (const requested of requestedItems) {
    const quantity = Math.max(1, Math.floor(Number(requested?.quantity) || 1));
    const variantId = requested?.variantId && requested.variantId !== 'default' ? requested.variantId : null;
    const productId = requested?.productId;

    const variant = variantId
      ? await prisma.productVariant.findUnique({
          where: { id: variantId },
          include: {
            image: { select: { image_path: true } },
            product: { include: { images: { select: { image_path: true }, orderBy: { id: 'asc' } } } },
          },
        })
      : productId
        ? await prisma.product.findUnique({
            where: { id: productId },
            include: { images: { select: { image_path: true }, orderBy: { id: 'asc' } } },
          })
        : null;
    if (!variant) throw new Error('One of the selected products could not be found.');

    const isVariant = !!variantId;
    const product = isVariant ? variant.product : variant;
    const price = isVariant
      ? variant.sale_price ?? variant.unite_price ?? product.sale_price ?? product.unite_price
      : product.sale_price ?? product.unite_price;
    if (price === null || price === undefined) {
      throw new Error(`"${product.title}" has no price set.`);
    }

    // Merge repeated picks of the same variant/product into one line.
    const lineKey = isVariant ? `v:${variant.id}` : `p:${product.id}`;
    const existing = lines.find((l) => l.key === lineKey);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }
    lines.push({
      key: lineKey,
      productId: product.id,
      productTitle: product.title,
      sku: (isVariant ? variant.sku : product.sku) || product.sku || null,
      itemImagePath:
        (isVariant ? variant.image?.image_path : null) ||
        product.images?.[0]?.image_path ||
        '',
      purchasePrice: Number(price),
      quantity,
      variantName: isVariant ? variantLabel(variant.options) : null,
      variantId: isVariant ? variant.id : null,
    });
  }

  // Zones + charges are admin-configured; the charge is always derived
  // server-side (never trusted from the browser), like checkout does. Manual
  // orders follow the same free-delivery promo for multi-product carts.
  const areas = await getDeliveryAreas();
  const shippingAreaValue = resolveAreaName(areas, shippingArea);
  const freeDelivery = await getFreeDeliverySettings();
  const deliveryCharge = applyFreeDelivery(
    chargeForArea(areas, shippingAreaValue),
    lines,
    freeDelivery
  );
  const subtotal = lines.reduce((s, l) => s + l.purchasePrice * l.quantity, 0);
  const total = Math.max(0, subtotal + deliveryCharge);

  // 6-digit order number, retried on the (rare) collision.
  let orderNo;
  for (let attempt = 0; attempt < 5 && !orderNo; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    const taken = await prisma.order.findUnique({ where: { orderNo: candidate }, select: { id: true } });
    if (!taken) orderNo = candidate;
  }
  if (!orderNo) throw new Error('Could not allocate an order number. Try again.');

  await prisma.order.create({
    data: {
      orderNo,
      total,
      orderStatus: 'pending',
      details: {
        create: {
          customerName: name,
          phoneNumber: mobile,
          shippingArea: shippingAreaValue,
          shippingAddress: address,
          orderNote: String(orderNote || '').trim() || null,
          deliveryCharge,
        },
      },
      items: {
        create: lines.map((l) => ({
          productTitle: l.productTitle,
          sku: l.sku,
          itemImagePath: l.itemImagePath,
          purchasePrice: l.purchasePrice,
          quantity: l.quantity,
          variantName: l.variantName,
          variantId: l.variantId,
        })),
      },
    },
  });

  revalidatePath('/admin/orders');
  return serialize({ orderNo, total });
}

/** Human label for a variant, matching the storefront's cart naming. */
function variantLabel(options) {
  return Array.isArray(options)
    ? options.filter(Boolean).join(' / ') || 'Default'
    : 'Default';
}

/** Effective selling price of a variant: sale price when set, else unit price. */
function variantPrice(variant) {
  if (variant.sale_price !== null && variant.sale_price !== undefined) return Number(variant.sale_price);
  if (variant.unite_price !== null && variant.unite_price !== undefined) return Number(variant.unite_price);
  return null;
}

/**
 * Recovers the product behind an order item. `OrderItem` snapshots the variant
 * (id, name, SKU, price, image) but stores no `productId`, so the product is
 * resolved by:
 *   1. the stored variantId — when it's a real variant id (the cart writes the
 *      placeholder `'default'` for variant-less products, so ignore that),
 *   2. the stored SKU matched against `ProductVariant.sku`,
 *   3. the product title.
 * Returns null when nothing matches (e.g. the product was deleted).
 */
async function resolveProductIdForOrderItem(item) {
  if (item.variantId && item.variantId !== 'default') {
    const viaVariant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      select: { productId: true },
    });
    if (viaVariant) return viaVariant.productId;
  }
  if (item.sku) {
    const viaSku = await prisma.productVariant.findFirst({
      where: { sku: item.sku },
      select: { productId: true },
    });
    if (viaSku) return viaSku.productId;
  }
  const viaTitle = await prisma.product.findFirst({
    where: { title: item.productTitle },
    select: { id: true },
  });
  return viaTitle?.id || null;
}

/**
 * Variant choices for the admin "change variant" action on an order item:
 * every variant of the item's product, with the same name/price/image
 * derivation the storefront uses.
 */
export async function getOrderItemVariants(itemId) {
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error('Item not found');
  const productId = await resolveProductIdForOrderItem(item);
  if (!productId) return [];
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: { image: { select: { image_path: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return serialize(
    variants.map((v) => ({
      id: v.id,
      name: variantLabel(v.options),
      sku: v.sku,
      price: variantPrice(v),
      imagePath: v.image?.image_path || null,
    }))
  );
}

/**
 * Switches an order item to another variant of the same product: rewrites the
 * variant snapshot (name, SKU, price, image) and recalculates the order total.
 * Completed orders are final, mirroring `deleteOrderItem`'s guard.
 */
export async function updateOrderItemVariant(itemId, variantId) {
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { select: { orderStatus: true } } },
  });
  if (!item) throw new Error('Item not found');
  if (item.order.orderStatus === 'completed') {
    throw new Error('Cannot change variants on completed orders');
  }
  const productId = await resolveProductIdForOrderItem(item);
  const variant = productId
    ? await prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        include: { image: { select: { image_path: true } } },
      })
    : null;
  if (!variant) throw new Error('Variant not found for this product');
  const price = variantPrice(variant);
  if (price === null) throw new Error('The selected variant has no price set');

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      variantId: variant.id,
      variantName: variantLabel(variant.options),
      sku: variant.sku || null,
      purchasePrice: price,
      itemImagePath: variant.image?.image_path || item.itemImagePath,
    },
  });
  await recalculateOrderTotal(item.orderId);
  revalidatePath('/admin/orders');
  return serialize({ ok: true });
}

export async function updateOrderDetails(orderId, data) {
  const discountProvided = data.discount !== undefined;
  const chargeProvided = data.deliveryCharge !== undefined;
  let discount;

  if (discountProvided) {
    discount = Number(data.discount);
    if (!Number.isFinite(discount) || discount < 0) {
      throw new Error('Discount must be a positive amount');
    }
  }
  if (chargeProvided) {
    const charge = Number(data.deliveryCharge);
    if (!Number.isFinite(charge) || charge < 0) {
      throw new Error('Delivery charge must be a positive amount');
    }
  }

  if (discountProvided || chargeProvided) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, details: true },
    });
    if (!order) throw new Error('Order not found');
    const subtotal = order.items.reduce(
      (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
    );
    // The cap is measured against the *new* delivery charge, so a discount
    // entered earlier cannot outlive a delivery charge that was lowered.
    const deliveryCharge = chargeProvided
      ? Number(data.deliveryCharge)
      : Number(order.details?.deliveryCharge || 0);
    const maxDiscount = subtotal + deliveryCharge;
    const effective = discountProvided
      ? discount
      : Number(order.details?.discount || 0);
    const capped = Math.min(effective, maxDiscount);
    if (discountProvided) discount = capped;
    if (capped !== effective) data = { ...data, discount: capped };
  }

  const details = await prisma.orderDetails.update({
    where: { orderId },
    data,
  });

  if (chargeProvided || discountProvided) {
    await recalculateOrderTotal(orderId);
  }
  revalidatePath('/admin/orders');
  return serialize(details);
}

const COMPLETED_CUSTOMERS_PAGE_SIZE = 20;

/**
 * One page of the /admin/reports/customers table — snapshots written when an
 * order was completed (manually or by courier), searchable by name or phone,
 * newest order first.
 */
export async function getCompletedCustomers({ page = 1, search = '' } = {}) {
  const q = String(search || '').trim();
  const pageNo = Math.max(1, Number(page) || 1);
  const where = q
    ? {
        OR: [
          { customerName: { contains: q, mode: 'insensitive' } },
          { phoneNumber: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const total = await prisma.completedCustomer.count({ where });
  const rows = await prisma.completedCustomer.findMany({
    where,
    orderBy: { orderDate: 'desc' },
    skip: (pageNo - 1) * COMPLETED_CUSTOMERS_PAGE_SIZE,
    take: COMPLETED_CUSTOMERS_PAGE_SIZE,
  });

  return serialize({
    rows,
    page: pageNo,
    totalPages: Math.max(1, Math.ceil(total / COMPLETED_CUSTOMERS_PAGE_SIZE)),
    pageSize: COMPLETED_CUSTOMERS_PAGE_SIZE,
    total,
  });
}

/**
 * Remove one Customers-report snapshot row. This is report housekeeping only —
 * it deletes the `CompletedCustomer` row, never the order or its items.
 */
export async function deleteCompletedCustomer(rowId) {
  const row = await prisma.completedCustomer.findUnique({
    where: { id: rowId },
    select: { id: true, customerName: true },
  });
  if (!row) throw new Error('Customer record not found');
  await prisma.completedCustomer.delete({ where: { id: rowId } });
  revalidatePath('/admin/reports/customers');
  return serialize(row);
}
