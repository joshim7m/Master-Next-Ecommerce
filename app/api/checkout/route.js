import { NextResponse } from 'next/server';
import prisma from '../../../src/lib/prisma';
import { sendOrderAlert } from '../../../src/lib/telegram';
import { deleteIncompleteOrders } from '../../../src/lib/incompleteCheckout';
import { getDeliveryAreas } from '../../../src/lib/getDeliveryAreas';
import { resolveAreaName, chargeForArea } from '../../../src/lib/deliveryAreas';

// Latin + Bangla letters only, plus space/apostrophe/hyphen/full-stop.
const NAME_REGEX = /^[\p{Script=Latin}\p{Script=Bengali}\p{Zs} '.-]+$/u;

// Bangla names use combining marks (matra ো/ী, hasant ্, ...) that render as a
// single glyph but count as extra code units. Strip them before measuring length.
const BENGALI_COMBINING_MARKS = /[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7]/g;

function visibleLength(value) {
  return Array.from(value.replace(BENGALI_COMBINING_MARKS, '')).length;
}

export async function POST(request) {
  const body = await request.json();
  const { name, mobile, address, shippingArea, items, deviceHash, draftOrderNo } = body;

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null;

  if (!name || !mobile || !address || !shippingArea || !items?.length) {
    return NextResponse.json({ error: 'অনুগ্রহ করে সব তথ্য পূরণ করুন।' }, { status: 400 });
  }

  // Mirrors the client-side rules so a Bangla name is accepted and a bad one is
  // rejected with the same message instead of an opaque server error.
  const trimmedName = String(name).trim();
  if (!trimmedName || !NAME_REGEX.test(trimmedName)) {
    return NextResponse.json({ error: 'নাম সঠিকভাবে লিখুন (ইংরেজি বা বাংলা অক্ষর)।' }, { status: 400 });
  }
  if (visibleLength(trimmedName) > 20) {
    return NextResponse.json({ error: 'নাম ২০ অক্ষরের মধ্যে হতে হবে।' }, { status: 400 });
  }

  if (deviceHash) {
    const blockedDevice = await prisma.blockedDevice.findUnique({
      where: { deviceHash },
    });

    if (blockedDevice) {
      return NextResponse.json(
        { error: 'আপনাকে অর্ডার করা থেকে বন্ধ করা হয়েছে।' },
        { status: 403 }
      );
    }

    const pendingOrder = await prisma.orderDetails.findFirst({
      where: {
        deviceHash,
        order: { orderStatus: 'pending' },
      },
      select: { order: { select: { orderNo: true } } },
    });

    if (pendingOrder) {
      return NextResponse.json(
        { error: `আপনার একটি অর্ডার #${pendingOrder.order.orderNo} ইতোমধ্যে অপেক্ষমাণ আছে। অনুগ্রহ করে প্রক্রিয়া হওয়া পর্যন্ত অপেক্ষা করুন।` },
        { status: 403 }
      );
    }
  }

  // Zones + charges are admin-configured (Settings → Site Config); the price is
  // always recalculated here so the browser can't dictate it. Unknown or legacy
  // area names fall back to the matching default zone.
  const areas = await getDeliveryAreas();
  const shippingAreaValue = resolveAreaName(areas, shippingArea);
  const deliveryCharge = chargeForArea(areas, shippingAreaValue);
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.salePrice ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    return sum + price * quantity;
  }, 0);
  const total = subtotal + deliveryCharge;
  const orderNo = String(Math.floor(100000 + Math.random() * 900000));

  const order = await prisma.order.create({
    data: {
      orderNo,
      total,
      orderStatus: 'pending',
      details: {
        create: {
          customerName: trimmedName,
          shippingAddress: address,
          phoneNumber: mobile,
          shippingArea: shippingAreaValue,
          deliveryCharge,
          ipAddress,
          deviceHash: deviceHash || null,
        },
      },
      items: {
        create: items.map((item) => ({
          productTitle: item.title || item.productSlug,
          sku: item.sku || null,
          itemImagePath: item.image || '',
          purchasePrice: Number(item.salePrice ?? item.price ?? 0),
          quantity: Number(item.quantity ?? 0),
          variantName: item.variantName || null,
          variantId: item.variantId || null,
        })),
      },
    },
  });

  const cleanupWhere = {
    OR: [
      ...(draftOrderNo ? [{ orderNo: String(draftOrderNo) }] : []),
      ...(deviceHash ? [{ details: { deviceHash, phoneNumber: mobile?.trim() } }] : []),
    ],
  };
  deleteIncompleteOrders(prisma, cleanupWhere).catch((err) =>
    console.error('[checkout] draft cleanup error:', err)
  );

  sendOrderAlert({
    orderNo: order.orderNo,
    total: order.total.toString(),
    name: trimmedName,
    mobile,
    address,
    shippingArea,
    itemCount: items.length,
  }).catch((err) => console.error('[telegram] unhandled alert error:', err));

  return NextResponse.json({ orderNo: order.orderNo, total: order.total.toString() });
}