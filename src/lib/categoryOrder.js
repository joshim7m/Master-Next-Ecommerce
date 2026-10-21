/**
 * The one sort key every category listing uses.
 *
 * The owner's number first, the name second: the name breaks ties between two
 * categories that share a number, and it keeps the old alphabetical order for
 * rows nobody has numbered yet.
 *
 * Imported everywhere categories are listed — the admin table, the API routes,
 * the mega-menu and the storefront grids — so they can never disagree about
 * the order customers see.
 */
export const CATEGORY_ORDER_BY = [{ sortOrder: 'asc' }, { name: 'asc' }];
