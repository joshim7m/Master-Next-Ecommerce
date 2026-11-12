import { NextResponse } from 'next/server';
import { getDeliveryAreas } from '../../../src/lib/getDeliveryAreas';
import { getFreeDeliverySettings } from '../../../src/lib/getFreeDeliverySettings';

/**
 * Public read-only list of the admin-configured delivery zones, used by the
 * storefront checkout to show each area's charge. Only the name and charge are
 * exposed — the settings themselves stay behind the admin API. The free-delivery
 * promo settings are also returned so the storefront can show "Free" badges and
 * a "add one more product" nudge; the server still re-verifies eligibility on
 * order creation, so the browser can't fake a free charge.
 */
export async function GET() {
  const [areas, freeDelivery] = await Promise.all([
    getDeliveryAreas(),
    getFreeDeliverySettings(),
  ]);
  return NextResponse.json(
    { areas, freeDelivery },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
