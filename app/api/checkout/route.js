import { NextResponse } from 'next/server';
import prisma from '../../../src/lib/prisma';
import { sendOrderAlert } from '../../../src/lib/telegram';

export async function POST(request) {
  const body = await request.json();
  const { name, mobile, address, shippingArea, items, deviceHash } = body;

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null;

  if (!name || !mobile || !address || !shippingArea || !items?.length) {
    return NextResponse.json({ error: 'Missing required checkout fields.' }, { status: 400 });
  }

  if (deviceHash) {
    const blockedDevice = await prisma.blockedDevice.findUnique({
      where: { deviceHash },
    });

    if (blockedDevice) {
      return NextResponse.json(
        { error: 'You have been blocked from placing orders.' },
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
        { error: `You already have a pending order #${pendingOrder.order.orderNo}. Please wait for it to be processed.` },
        { status: 403 }
      );
    }
  }

  const deliveryCharge = shippingArea === 'Outside Dhaka' ? 120 : 50;
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
          customerName: name,
          shippingAddress: address,
          phoneNumber: mobile,
          shippingArea,
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

  sendOrderAlert({
    orderNo: order.orderNo,
    total: order.total.toString(),
    name,
    mobile,
    address,
    shippingArea,
    itemCount: items.length,
  }).catch((err) => console.error('[telegram] unhandled alert error:', err));

  return NextResponse.json({ orderNo: order.orderNo, total: order.total.toString() });
}