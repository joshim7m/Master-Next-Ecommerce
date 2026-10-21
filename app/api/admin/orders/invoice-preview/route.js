import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';
import { verifyToken, getTokenFromCookies } from '../../../../../src/lib/auth-edge';
import { getInvoiceBrand } from '../../../../../src/lib/invoiceBrand';

// The preview shows live numbers, so it must never be cached.
export const dynamic = 'force-dynamic';

/**
 * Invoice data for the orders-list preview modal.
 *
 * `GET /api/admin/orders/invoice-preview?orderNo=820394`
 *
 * Returns exactly what InvoiceDocument renders, and nothing else:
 *
 * - `order` — the fields on the sheet, plus the item rows. `OrderDetails` is
 *   selected field by field so the internal-only `orderNote` and `deviceHash`
 *   never leave the server.
 * - `settings` — the whitelisted brand fields only (see getInvoiceBrand). The
 *   SiteSetting row also carries jwtSecret, telegramBotToken and telegramChatId.
 *
 * The route lives beside `orders/search` rather than under a dynamic segment
 * because `orders/[id]` already owns that path with a different slug name.
 *
 * Auth is checked here rather than by the proxy: the proxy matcher only covers
 * /admin/*, so an /api/admin/* route has to guard itself.
 */
export async function GET(request) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !['super-admin', 'admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderNo = (searchParams.get('orderNo') || '').trim();
    if (!orderNo) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        id: true,
        orderNo: true,
        orderStatus: true,
        total: true,
        createdAt: true,
        details: {
          select: {
            customerName: true,
            phoneNumber: true,
            shippingAddress: true,
            shippingArea: true,
            deliveryCharge: true,
            discount: true,
          },
        },
        items: {
          select: {
            id: true,
            productTitle: true,
            variantName: true,
            sku: true,
            purchasePrice: true,
            quantity: true,
            itemImagePath: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const siteSettings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    const settings = await getInvoiceBrand(siteSettings || {});

    return NextResponse.json({
      order: JSON.parse(JSON.stringify(order)),
      settings,
    });
  } catch (error) {
    console.error('Error building invoice preview:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
