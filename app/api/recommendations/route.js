import { NextResponse } from 'next/server';
import { getUpsellAddOns } from '../../../src/lib/recommendations';

export const dynamic = 'force-dynamic';

// Public, unauthenticated read: every field returned is already rendered on the
// storefront, and only `status: 'publish'` products are ever selected. The id
// cap and limit clamp are the abuse controls.

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/; // uuid (Product.id) or cuid (ProductUpsell.id)
const MAX_IDS = 20;
const MAX_LIMIT = 6;
const DEFAULT_LIMIT = 3;

/**
 * GET /api/recommendations?ids=<csv>&limit=3
 * → { products: [...], source: 'curated' | 'auto' | 'mixed' }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const seedIds = [
    ...new Set(
      (searchParams.get('ids') || '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => ID_PATTERN.test(id))
    ),
  ].slice(0, MAX_IDS);

  if (!seedIds.length) {
    return NextResponse.json({ products: [], source: 'auto' });
  }

  const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, parsedLimit))
    : DEFAULT_LIMIT;

  try {
    const { products, source } = await getUpsellAddOns({ seedIds, limit });
    return NextResponse.json({ products, source });
  } catch (error) {
    // Recommendations are never worth failing a page load over: the client
    // simply renders no bundle. Logged server-side so this stays diagnosable.
    console.error('[api/recommendations] failed', error);
    return NextResponse.json({ products: [], source: 'auto' });
  }
}
