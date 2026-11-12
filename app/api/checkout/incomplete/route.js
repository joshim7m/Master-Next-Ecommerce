import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';
import { deleteIncompleteOrders } from '../../../../src/lib/incompleteCheckout';
import { getDeliveryAreas } from '../../../../src/lib/getDeliveryAreas';
import { getFreeDeliverySettings } from '../../../../src/lib/getFreeDeliverySettings';
import { applyFreeDelivery } from '../../../../src/lib/freeDelivery';
import { resolveAreaName, chargeForArea } from '../../../../src/lib/deliveryAreas';
import { LIVE_ORDER_STATUSES } from '../../../../src/lib/checkoutGuards';

const MOBILE_REGEX = /^(013|014|015|016|017|018|019)\d{8}$/;

function extractIpAddress(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

function buildItemsData(items) {
  return items.map((item) => ({
    productTitle: item.title || item.productSlug || 'Unknown product',
    sku: item.sku || null,
    itemImagePath: item.image || '',
    purchasePrice: Number(item.salePrice ?? item.price ?? 0),
    quantity: Number(item.quantity ?? 0),
    variantName: item.variantName || null,
    variantId: item.variantId || null,
  }));
}

export async function POST(request) {
  const body = await request.json();
  const { orderNo, name, mobile, address, shippingArea, items, deviceHash, orderNote } = body;
  const trimmedOrderNote = String(orderNote || '').trim().slice(0, 200) || null;

  const normalizedMobile = typeof mobile === 'string' ? mobile.trim() : '';
  if (!normalizedMobile || !MOBILE_REGEX.test(normalizedMobile)) {
    return NextResponse.json(
      { error: 'অসম্পূর্ণ অর্ডার সংরক্ষণ করতে সঠিক মোবাইল নম্বর দিন।' },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'আপনার কার্ট খালি।' }, { status: 400 });
  }

  // No drafts for devices that are blocked or already have a live order —
  // same rejection shape as `/api/checkout`.
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

    const liveOrder = await prisma.orderDetails.findFirst({
      where: {
        deviceHash,
        order: { orderStatus: { in: LIVE_ORDER_STATUSES } },
      },
      select: { order: { select: { orderNo: true } } },
    });
    if (liveOrder) {
      return NextResponse.json(
        { error: `আপনার একটি অর্ডার #${liveOrder.order.orderNo} ইতোমধ্যে অপেক্ষমাণ আছে। অনুগ্রহ করে প্রক্রিয়া হওয়া পর্যন্ত অপেক্ষা করুন।` },
        { status: 403 }
      );
    }
  }

  // Drafts use the same admin-configured zones as the real checkout, including
  // the free-delivery promo for multi-product carts.
  const areas = await getDeliveryAreas();
  const shippingAreaValue = resolveAreaName(areas, shippingArea);
  const freeDelivery = await getFreeDeliverySettings();
  const deliveryCharge = applyFreeDelivery(
    chargeForArea(areas, shippingAreaValue),
    items,
    freeDelivery
  );
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.salePrice ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    return sum + price * quantity;
  }, 0);
  const total = subtotal + deliveryCharge;
  const itemsData = buildItemsData(items);

  const draftOrderNo = await prisma.$transaction(async (tx) => {
    let draft = null;
    if (orderNo) {
      draft = await tx.order.findFirst({
        where: { orderNo: String(orderNo), orderStatus: 'incomplete' },
      });
    }

    // One draft per device: even without the session's orderNo (new session,
    // cleared sessionStorage), reuse the device's dangling draft instead of
    // letting drafts accumulate. Blocked/live-order devices never reach here
    // thanks to the guard above.
    if (!draft && deviceHash) {
      draft = await tx.order.findFirst({
        where: { orderStatus: 'incomplete', details: { deviceHash } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (draft) {
      await tx.order.update({
        where: { id: draft.id },
        data: { total },
      });
      await tx.orderDetails.upsert({
        where: { orderId: draft.id },
        update: {
          customerName: name?.trim() || null,
          shippingAddress: address?.trim() || '',
          phoneNumber: normalizedMobile,
          shippingArea: shippingAreaValue,
          deliveryCharge,
          deviceHash: deviceHash || null,
          orderNote: trimmedOrderNote,
        },
        create: {
          orderId: draft.id,
          customerName: name?.trim() || null,
          shippingAddress: address?.trim() || '',
          phoneNumber: normalizedMobile,
          shippingArea: shippingAreaValue,
          deliveryCharge,
          deviceHash: deviceHash || null,
          orderNote: trimmedOrderNote,
        },
      });
      await tx.orderItem.deleteMany({ where: { orderId: draft.id } });
      await tx.orderItem.createMany({
        data: itemsData.map((item) => ({ ...item, orderId: draft.id })),
      });
      return draft.orderNo;
    }

    // New session draft: remove stale drafts from the same device + mobile
    if (deviceHash) {
      await deleteIncompleteOrders(tx, {
        details: { deviceHash, phoneNumber: normalizedMobile },
      });
    }

    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      try {
        created = await tx.order.create({
          data: {
            orderNo: candidate,
            total,
            orderStatus: 'incomplete',
            details: {
              create: {
                customerName: name?.trim() || null,
                shippingAddress: address?.trim() || '',
                phoneNumber: normalizedMobile,
                shippingArea: shippingAreaValue,
                deliveryCharge,
                ipAddress: extractIpAddress(request),
                deviceHash: deviceHash || null,
                orderNote: trimmedOrderNote,
              },
            },
            items: { create: itemsData },
          },
        });
      } catch (err) {
        if (err?.code !== 'P2002') throw err;
      }
    }

    if (!created) throw new Error('Could not generate a unique order number.');
    return created.orderNo;
  });

  return NextResponse.json({ orderNo: draftOrderNo });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const orderNo = searchParams.get('orderNo');

  if (!orderNo) {
    return NextResponse.json({ error: 'orderNo is required.' }, { status: 400 });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    return deleteIncompleteOrders(tx, { orderNo: String(orderNo) });
  });

  return NextResponse.json({ deleted });
}
