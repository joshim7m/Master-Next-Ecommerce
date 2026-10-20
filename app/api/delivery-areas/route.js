import { NextResponse } from 'next/server';
import { getDeliveryAreas } from '../../../src/lib/getDeliveryAreas';

/**
 * Public read-only list of the admin-configured delivery zones, used by the
 * storefront checkout to show each area's charge. Only the name and charge are
 * exposed — the settings themselves stay behind the admin API.
 */
export async function GET() {
  const areas = await getDeliveryAreas();
  return NextResponse.json(
    { areas },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
