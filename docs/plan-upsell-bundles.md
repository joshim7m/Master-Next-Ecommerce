# Plan — "Frequently Bought Together" Upsell (PDP, Cart, Checkout)

> Status: **Implemented** · Updated: 2026-09-26
> Adds cross-sell merchandising to the three highest-intent surfaces: product detail, cart and checkout. Curated (admin-picked) upsells take precedence, with automatic category/tag/price scoring as the fallback. This document is the design it was built from; it is kept as the reference for the scoring rules and edge-case reasoning. **Deviations from the plan, found during implementation, are noted in §11.**

---

## 1. Requirements

1. **Product detail page** — show 2 related add-on products alongside the product being viewed.
2. **Cart page** — show 2–3 add-on products derived from everything already in the cart.
3. **Checkout page** — show the same add-ons next to the order summary.
4. **One low-friction action** — a single "Add all to cart" CTA, not N separate add buttons.
5. **Merchandiser control** — admins pick upsell products per product; anything not curated still gets automatic recommendations.
6. **No new dependencies.** JSX + Tailwind only, consistent with `ai-workflow-rules.md`.

### Decisions (confirmed by owner)

| Question | Decision |
|---|---|
| Recommendation source | **Hybrid — curated first, automatic fallback.** A merchandiser picking a product beats an algorithm every time, but coverage must never depend on admin effort. |
| Format | **"Frequently Bought Together" bundle** — the highest-AOV pattern of the common cross-sell layouts, and one CTA instead of N. |
| Bundle composition | **Whole cart as the seed group + 2–3 add-ons.** The cart is already the strongest available signal; a per-item bundle would render N competing sections. |
| "Add all" behaviour | Adds **only the add-ons.** Seed items are already in the cart, so re-adding them would inflate quantities. |
| Cart placement | **Below the line items, above the Subtotal card.** Visible after review, before commitment. |
| Checkout placement | **Inside the sticky Order Summary `<aside>`**, after the line items and above the totals. Stays in view while the form is filled, adjacent to the number it increases. |
| Product detail page | **Add the bundle, keep the existing 6-card Related Products grid.** The two surfaces serve different intents — "buy these together" vs "browse more". |
| Data path for cart/checkout | **New public route `GET /api/recommendations`.** Both pages are `'use client'` components whose carts live in `localStorage`, so they cannot use the server-component data path the PDP uses. |
| Add-on count | **3** on cart and checkout, **2** on the product page. Enough to be a bundle, few enough not to become a second product grid. |
| Promo banner / offer strip | **Out of scope.** The existing `PromoBanner` model is untouched. |

---

## 2. Current State

| Surface | File | Merchandising today |
|---|---|---|
| Product detail | `app/(storefront)/products/[slug]/page.jsx:83-111` | Inline same-category query → 6 products, backfilled by `createdAt desc`. No shared helper. |
| Product detail | `src/components/storefront/partials/RelatedProducts.jsx` | Presentational grid, `grid-cols-2 sm:3 md:4 lg:6`. Returns `null` when empty. |
| Cart | `app/(storefront)/cart/page.jsx` | **None.** |
| Checkout | `app/(storefront)/checkout/page.jsx` | **None.** |
| Cart drawer | `src/components/storefront/CartDrawer.jsx` | **None** (explicitly out of scope). |

A codebase-wide search for `upsell`, `cross-sell`, `crossSell`, `recommend`, `frequentlyBought`, `bundle`, `youMayAlsoLike` returns no product-merchandising code. The only bundle-adjacent field is `relatedSubs` in the scraper `prisma/fetchCatalog.js`.

### Constraints this feature inherits

From `docs/ai-workflow-rules.md`:

- JSX only, no TypeScript anywhere in the project.
- Storefront components live in `src/components/storefront/` (+ `partials/`).
- Server components for data fetching/SEO; client components for interactivity.
- Cart/wishlist persist via `src/lib/cartStorage.js` / `wishlistStorage.js`, synced by the `cart-updated` / `wishlist-updated` window events.
- **Do not rename** the `cabinet-closet-cart` / `cabinet-closet-wishlist` localStorage keys.
- Do not duplicate code — reuse existing components and lib helpers.
- Schema changes only via `npx prisma migrate dev`.
- BDT (`৳`) is the sole currency; delivery charges must not change.
- Update `docs/` after each working session.

### Conventions the new code must match

| Concern | Existing convention |
|---|---|
| Product include | `{ images: true, variants: true }` — currently copy-pasted in ≥4 places (`src/actions/products.js:10`, `products/[slug]/page.jsx:11`, `app/api/wishlist/route.js:16`, …). This plan introduces the shared constant. |
| Pricing | `Number(product.sale_price \|\| product.unite_price)`; discount `((original - price) / original) * 100` |
| Cart item payload | `{ productId, productSlug, sku, title, image, variantId, variantName, price, salePrice, quantity }` (see `TrendingCard.jsx:42-53`) |
| Card shell | `rounded-2xl border border-border bg-white … shadow-ambient` |
| Page shell | `mx-auto max-w-[1440px] px-page-margin-mobile md:px-page-margin-desktop` |
| Loading | `.skeleton-shimmer` (defined in `app/globals.css`) — the current convention, per `TrendingNow.jsx` |
| Empty state | Centred icon + message in a bordered card, or `return null` for optional rails |
| Icons | Material Symbols (`<span className="material-symbols-outlined">`) dominant; `lucide-react` in `TrendingCard` |
| Dark mode | Every colour class gets a `dark:` twin — mandatory house style |
| Analytics | `pushDataLayer()` from `src/lib/gtm.js` |
| Decimal handling | `serialize()` = `JSON.parse(JSON.stringify(...))` before crossing the RSC boundary; `NextResponse.json` stringifies `Decimal` |

> **Note:** the project has **no `error.js` / `global-error.js` boundaries at all.** Any uncaught error bubbles to the Next.js default error screen. This is the single most important constraint for a component being added to checkout — see §6.

---

## 3. Architecture

```
                    ┌────────────────────────────────────────────┐
                    │  src/lib/recommendations.js   (server)    │
                    │  getUpsellAddOns()  curated → auto         │
                    │  getAutoRelated()   scoring + backfill     │
                    │  RECOMMEND_INCLUDE  shared const           │
                    └──────────────────┬─────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
 app/(storefront)/products/     app/api/recommendations/      src/actions/products.js
 [slug]/page.jsx  (server)      route.js  (public GET)        updateProduct(upsellIds)
        │                              │                              │
 RelatedProducts grid           GET ?ids=&limit=              admin upsell picker
 (existing, 6 cards)                    │
                             ┌────────┴─────────┐
                             │                  │
               FrequentlyBoughtTogether      PdpBundle
                (cart / checkout)             (PDP)
                             │                  │
             FrequentlyBoughtTogether.jsx  ('use client')
                reads localStorage cart → fetch → BundleView
```

---

## 4. Implementation

### Part A — Data + recommendation engine

> Ships first. Invisible to customers, and the entire brain of the feature.

#### A1. Prisma model — `prisma/schema.prisma`

One new model plus two back-relations on `Product`:

```prisma
model ProductUpsell {
  id        String   @id @default(cuid())
  productId String
  upsellId  String
  sortOrder Int      @default(0)
  product   Product  @relation("ProductUpsells", fields: [productId], references: [id], onDelete: Cascade)
  upsell    Product  @relation("UpsellProducts", fields: [upsellId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([productId, upsellId])
  @@index([upsellId])
}
```

```prisma
// on model Product
upsells    ProductUpsell[] @relation("ProductUpsells")
upselledBy ProductUpsell[] @relation("UpsellProducts")
```

- `@@unique([productId, upsellId])` prevents a merchandiser picking the same product twice.
- `sortOrder` preserves the chosen sequence — the first pick shows first in the bundle.
- Both relations `onDelete: Cascade`, so `deleteProduct` (`src/actions/products.js:163`) needs no explicit cleanup — consistent with how it already hand-cleans images/variants/options, but here the DB does it.
- Migration: `npx prisma migrate dev --name add_product_upsells`

#### A2. Shared lib — `src/lib/recommendations.js` (new, server-only)

Single source of truth for merchandising. Imports `src/lib/prisma.js`; serialises `Decimal` the same way `src/actions/products.js` does.

**`RECOMMEND_INCLUDE`** — `{ images: true, variants: true }`. Replaces the copy-pasted include object; other call sites can adopt it opportunistically.

**`isInStock(product)`** — a product with variants is in stock if any variant has `quantity > 0`; otherwise `(product.quantity ?? 1) > 0`. Nullable `quantity` is treated as unknown → in stock, matching the current PDP behaviour (which renders an "Out of Stock" chip only when `quantity ?? 0 <= 0`).

**`getAutoRelated({ seedIds, excludeIds = [], limit })`**

1. Load seeds: `id`, `tags`, `unite_price`, `sale_price`, category ids.
2. Build the union of seed category ids and the seed tag set (`tags` is a comma-separated string column).
3. Candidate pool: `status: 'publish'`, `id notIn [...seeds, ...excludeIds]`, in one of the seed categories, `take: 40`, `createdAt desc`.
4. Score each candidate:

   ```
   score = 3 × |sharedCategories|
         + 2 × |sharedTags|
         + 1   if price is within ±30% of any seed's effective price
         + 0.5 if featured
   ```

5. Sort by score desc, tiebreak `createdAt desc`, take what is still missing.
6. Backfill with `featured: true` published products, then newest — so the rail never renders short while stock exists.

*Why these weights:* category overlap is the strongest relevance signal available; tags are the merchandiser's own keyword layer; the price band stops the bundle from suggesting a ৳200 item next to a ৳20,000 one; `featured` is the existing manual "promote this" flag, used only as a tiebreak.

**`getUpsellAddOns({ seedIds, excludeIds = [], limit })`**

1. `productUpsell.findMany({ where: { productId: { in: seedIds } }, include: { upsell: { include: RECOMMEND_INCLUDE } }, orderBy: { sortOrder: 'asc' } })`
2. Flatten, drop `excludeIds`, drop out-of-stock and non-published products.
3. If `limit` is satisfied → `{ products, source: 'curated' }`.
4. Otherwise top up from `getAutoRelated` → `source: 'auto'` if nothing was curated, `'mixed'` if partially.

`source` is returned so merchandising effectiveness can be measured through the existing GTM plumbing.

#### A3. Public route — `app/api/recommendations/route.js` (new)

```
GET /api/recommendations?ids=<csv>&limit=3
→ 200 { products: [...], source: 'curated' | 'auto' | 'mixed' }
```

- `ids`: trim, regex-filter, cap at **20** entries.
- `limit`: clamp **1–6**, default 3.
- `excludeIds` is the caller's own id list, so a product already in the cart is never recommended back.
- Product shape is exactly what `TrendingCard` already consumes: `{ id, slug, sku, title, unite_price, sale_price, quantity, images, variants }`.
- `export const dynamic = 'force-dynamic'`.
- Only ever selects `status: 'publish'`. Every field returned is already public on the storefront, so no new data is exposed; the id cap and limit clamp are the only abuse controls required. This matches the existing public read routes (`/api/products/recent`, `/api/products/more`, `/api/search`).

#### A4. Refactor the PDP onto the shared lib

Replace `app/(storefront)/products/[slug]/page.jsx:83-111` with:

```js
const related = await getAutoRelated({ seedIds: [product.id], limit: 6 });
```

Same six cards, same category-first-then-newest ordering, no duplicated logic. Satisfies the "do not duplicate code" rule and keeps the PDP's existing `RelatedProducts` grid untouched.

### Part B — Storefront UI

#### B1. `src/components/storefront/FrequentlyBoughtTogether.jsx` (new)

`'use client'`. One file, three exports so cart, checkout and the PDP share all logic and markup:

| Export | Used by |
|---|---|
| `BundleView({ title, addOns, onAddAll, added, loading, density })` | presentational, internal |
| **default** `FrequentlyBoughtTogether({ density })` | cart page + checkout summary — self-loads the cart |
| `PdpBundle({ product, selectedVariant })` | product detail page — fetches `limit=2` |

Behaviour:

- Reads `loadCart()` in an effect; derives `seedIds` from `item.productId`.
- Renders `null` when the cart is empty, before hydration, when the response has no add-ons, **and on any error** — matching `RelatedProducts.jsx:76`.
- Fetch wrapped in `try/catch` with an `AbortController`. **Checkout must never be blocked by merchandising.**
- Combined total = cart subtotal + add-on total; the CTA reads `Add all to cart · +৳Y` so the incremental cost is explicit.
- **Add all** iterates `addToCart()` over the add-ons only, then sets `added`, swaps the button to a ✓ `Added` state, and fires `pushDataLayer('add_to_cart', { ecommerce: { items: [...] } })` per the existing `TrendingCard.jsx:57-67` convention. No new event taxonomy.
- Each add-on also carries its own quick `+` button.
- **Re-fetch guard** — the cart-driven version must *not* refetch after its own "Add all". A ref flag set around the component's own `addToCart` calls suppresses the `cart-updated` handler; genuine external cart changes still refresh it. Without this, adding to the cart makes the rail swap its own items out from under the customer.
- Loading: three `.skeleton-shimmer` tiles.
- `density="compact"` for the checkout summary: 64px tiles, `text-xs` heading, delta only — the summary card already shows totals, so the bundle must not repeat them.
- Heading `Frequently Bought Together` in English, consistent with `Related Products` / `Out of Stock` copy. Bangla alternative: `সবগুলো যোগ করুন`.

#### B2. `src/lib/cartStorage.js` — one added pure helper

```js
export function productToCartItem(product, quantity = 1)
```

Builds the cart payload from `images[0].image_path` and `variants[0]`, producing exactly the shape `TrendingCard.jsx:42-53` already sends. Reused by the bundle and by `TrendingCard`, so the payload is defined once. Pure function — safe in a module that otherwise touches `window`.

#### B3. Insertion points

| File | Where |
|---|---|
| `app/(storefront)/cart/page.jsx` | Between the `cart.map(...)` block and the Subtotal card (before line 113), inside the existing `max-w-3xl` container. |
| `app/(storefront)/checkout/page.jsx` | Inside the `<aside>`, after the line-items `div` ending at line 398 and before the totals `div` at line 399, with a `border-t` separator. |
| `src/components/storefront/ProductDetailClient.jsx` | A new `<PdpBundle />` between `<ProductTabs />` (line 35) and `<RelatedProducts />` (line 38) — **changed during implementation to a compact ad box in the right column under the buy box, see §11.10.** This component already owns `selectedVariant` (line 12), so "Add bundle to cart" adds the **currently selected variant** — no wrong-variant risk. |

### Part C — Admin curation

> The half that makes this "curated". Ships last: Part A's automatic fallback already works with zero curated rows.

#### C1. `src/actions/products.js`

- `productInclude` gains `upsells: { include: { upsell: { select: { id, title, slug } } }, orderBy: { sortOrder: 'asc' } }`. A light `select` matters here — this include is used by *every* product read.
- `updateProduct` and `createProduct` accept `upsellIds`: `deleteMany({ where: { productId: id } })` then `createMany` with `sortOrder` from the array index. Self-references and unknown ids are dropped silently.
- New `getPublishedProductsLite()` → `{ id, title, sku, image }` for the picker. Deliberately **not** `getProducts()`, which loads every variant and image for the whole catalogue.

#### C2. `app/admin/products/edit/partials/upsell-picker.jsx` (new)

Searchable checkbox list of published products, modelled on the existing `src/components/admin/CategoryMultiSelect.jsx`. Excludes the product being edited, caps selection at 4, treats selection order as `sortOrder`.

#### C3. `app/admin/products/edit/page.jsx`

- New `upsellIds` state, populated from the existing `Promise.all` at line 45.
- Picker rendered after the variants section (after line 404).
- `upsellIds` added to the `updateProduct` payload at line 254.

The create page is intentionally out of scope — upsells can be attached immediately after the product exists.

---

## 5. Files Touched

| # | File | Change | Part |
|---|---|---|---|
| 1 | `prisma/schema.prisma` | `ProductUpsell` model + 2 back-relations on `Product` | A1 |
| 2 | `prisma/migrations/…_add_product_upsells/` | Generated migration | A1 |
| 3 | `src/lib/recommendations.js` | **New** — `getUpsellAddOns`, `getAutoRelated`, `isInStock`, `RECOMMEND_INCLUDE` | A2 |
| 4 | `app/api/recommendations/route.js` | **New** — public `GET ?ids=&limit=` | A3 |
| 5 | `app/(storefront)/products/[slug]/page.jsx` | Replace inline related query (lines 83-111) with `getAutoRelated` | A4 |
| 6 | `src/components/storefront/FrequentlyBoughtTogether.jsx` | **New** — `BundleView` + default + `PdpBundle` | B1 |
| 7 | `src/lib/cartStorage.js` | Add pure `productToCartItem()` | B2 |
| 8 | `app/(storefront)/cart/page.jsx` | Render the bundle above the Subtotal card | B3 |
| 9 | `app/(storefront)/checkout/page.jsx` | Render the bundle inside the Order Summary `<aside>` | B3 |
| 10 | `src/components/storefront/ProductDetailClient.jsx` | Render `<PdpBundle />` above `RelatedProducts` — **later moved into the right column as a compact ad box, see §11.10** | B3 |
| 11 | `src/actions/products.js` | `upsellIds` in create/update; `upsells` in `productInclude`; `getPublishedProductsLite()` | C1 |
| 12 | `app/admin/products/edit/partials/upsell-picker.jsx` | **New** — curated upsell multi-select | C2 |
| 13 | `app/admin/products/edit/page.jsx` | `upsellIds` state + picker + save payload | C3 |

No changes to `package.json`, `tailwind.config.js`, `next.config.mjs`, `proxy.js`, or any existing localStorage key.

### Delivery order

| Part | Ships | Customer-visible value |
|---|---|---|
| A | Migration + lib + API route + PDP refactor | None — engine only |
| B | Bundle component + cart + checkout + PDP | **The entire feature**, working on automatic recommendations alone |
| C | Admin upsell picker | Quality upgrade; no storefront code changes |

**A + B together are a complete, shippable feature.** C only improves recommendation quality.

---

## 6. Edge Cases & Risks

| Case | Handling |
|---|---|
| Cart is empty | Rail renders `null` on both pages. The cart page already branches on `cart.length === 0`; checkout returns early at `checkout/page.jsx:245`. |
| Recommendation API fails / times out | `try/catch` + `AbortController` → render nothing. The bundle must never throw: there are no `error.js` boundaries in this project, so an uncaught error would take down the entire checkout page. |
| Duplicate quantities in the cart | "Add all" adds only the add-ons; server-side `excludeIds` guarantees add-ons are never items already in the cart. |
| Bundle items swap after adding | `cart-updated` handler suppressed around the component's own writes (§4 B1). |
| Out-of-stock / draft add-ons | Filtered server-side by `isInStock()` + `status: 'publish'`, and re-checked client-side before rendering. |
| Cart has 10+ distinct products | `seedIds` is capped at 20 server-side; scoring unions categories and tags so the result stays stable regardless of cart size. |
| Product has variants but no base `quantity` | `isInStock()` checks variant quantities first; null base `quantity` is treated as unknown/in-stock. |
| `Decimal` fields reaching the client | `NextResponse.json` stringifies them; consumers already do `Number(...)` (same as `/api/products/recent`). |
| Dark mode | Every colour class paired with a `dark:` twin, per house style. |
| Regression to existing merchandising | The PDP keeps its 6-card Related Products grid; only the query behind it moves into the shared lib. |
| Schema drift | Migration is created in Part A before any code references the table. |
| Bundle duplicated across cart + checkout | Two separate page loads, no shared client cache. Acceptable; `force-dynamic` keeps it simple. |

---

## 7. Testing Checklist

1. `npx prisma migrate dev --name add_product_upsells` applies cleanly; `npx prisma generate` succeeds.
2. PDP still renders 6 related products, category-first ordering preserved after the A4 refactor.
3. Cart with 1 item → bundle shows 3 add-ons, none of which are the item already in the cart.
4. Cart with 5+ distinct items → still 3 add-ons, all in stock and published.
5. "Add all to cart" adds exactly the add-ons, each at quantity 1; cart quantities of existing items are unchanged; header badge and cart drawer update via `cart-updated`.
6. After "Add all", the bundle does **not** refetch or swap its own items away; button shows ✓ Added.
7. Checkout: bundle renders inside the Order Summary card, totals update live, and the Place Order flow is unaffected.
8. Checkout with the API forced to fail → checkout still completes normally, bundle simply absent.
9. PDP bundle "Add bundle to cart" adds the **currently selected variant**, not variant[0].
10. Admin: pick 2 upsells → they appear first in the bundle, in the chosen order; clearing them reverts to automatic recommendations.
11. Curated upsell pointing at a draft or out-of-stock product → silently skipped, automatic fallback fills the gap.
12. GTM: `add_to_cart` fires once with all add-on items; no duplicate events.
13. Dark mode visual pass on cart, checkout summary and PDP.
14. Mobile pass: bundle tiles and CTA do not overflow at 375px.
15. `npm run build` passes (project has no linter or test runner configured).

---

## 8. Out of Scope

- The promo/discount banner ad slot — the existing `PromoBanner` model is untouched.
- A free-delivery-threshold offer strip.
- A per-line-item bundle, or a bundle inside the cart drawer.
- Cross-sell inside the product tabs.
- Caching / CDN configuration for the new route.
- Renaming or restructuring the existing `TrendingCard` / `RelatedCard` duplication.

---

## 9. Pre-existing Issues Found (Not Part of This Feature)

Found while surveying the code. None are fixed by this plan; each deserves its own change.

1. **Wrong `salePrice` in the cart payload.** `ProductInfo.jsx:280` sends `salePrice: activePrice` — identical to `price` — so a discounted product's original price is lost the moment it is added to the cart. `TrendingCard.jsx:51` gets this right. Fixing it means changing the cart item shape, which risks order creation, so it needs separate verification.
2. **Delivery charge mismatch (live, charged amount).** Inside-Dhaka delivery is `80` in `checkout/page.jsx:154`, `:209` and `:285`, but `50` in `app/api/checkout/route.js:48`, while `docs/ai-workflow-rules.md` §5 and `docs/progress-tracker.md` both state 50. This is a real discrepancy in a charged amount and should be resolved as a bug fix with its own testing — not a drive-by edit inside a merchandising PR.
3. **`sale_price` / `unite_price` are swapped across the whole seeded catalogue** (found during implementation). *Since resolved — see below.* All 61 products that had a `sale_price` had it *higher* than `unite_price` — e.g. `unite_price 650`, `sale_price 990` — because `prisma/fetchCatalog.js` wrote `salePrice = oldPrice` and `unitePrice = currentPrice`. Every product card therefore rendered a strikethrough on a *lower* number than the price being charged, and no `-N%` badge ever showed. The scraper's `normalizePrices()` now only records a discount when `old > current`, and the catalogue has been re-seeded: 30 products, 21 with a `sale_price`, 0 inverted, real discounts of 34–69%.

---

## 10. Documentation Updates Required on Implementation

Per `ai-workflow-rules.md` §10:

| File | Update |
|---|---|
| `docs/data-model.md` | The `ProductUpsell` model and its two relations. |
| `docs/frontend-architecture.md` | `FrequentlyBoughtTogether.jsx` and `app/api/recommendations/route.js`. |
| `docs/progress-tracker.md` | Per-session entry; flip the upsell row from planned to done. |
| `docs/seo.md` *(if relevant)* | Confirm the bundle's product links do not disturb the existing `Product` / `BreadcrumbList` JSON-LD emitted at `products/[slug]/page.jsx:116-171`. |

**Done.** All four updated. The JSON-LD check passed: the PDP still emits 4 valid blocks (Organization, WebSite, Product, BreadcrumbList) and the bundle renders only in the page body, never inside a `ld+json` script. Its `<Link href="/products/…">` elements add crawlable internal links rather than competing with them.

---

## 11. Deviations From the Plan (found during implementation)

1. **Cart and checkout now listen for `cart-updated`.** The plan assumed adding from the bundle would refresh the page's own state. It does not: both `cart/page.jsx` and `checkout/page.jsx` read the cart *only* on mount. Without the listener, an add-on added at checkout would have appeared in the summary, updated no totals, and — critically — **never reached the submitted order**, because `handleSubmit` posts the `cart` state. This was the most serious issue found.
2. **The bundle suppresses its own `cart-updated` events.** The plan called for a re-fetch guard but did not specify the mechanism. Two refs do it: one set around the synchronous `addToCart` calls, and one set permanently once the customer has added, so the rail never swaps its own add-ons out from under them afterwards.
3. **Card chrome moved inside the emptiness check** via a `surface` prop on `BundleView`. As first written, `PdpBundle` wrapped `BundleView` in a card while `BundleView` returns `null` when there are no recommendations — leaving an empty bordered box on the PDP.
4. **The sticky checkout `<aside>` is height-bounded** (`lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`). A 3-item bundle plus the summary can exceed the viewport, and a sticky element taller than the viewport makes its bottom — the Place Order button — unreachable.
5. **Compact mode shows the delta, not a repeated total.** The summary already displays the cart subtotal, so the checkout bundle reports only what the add-ons cost.
6. **`productToCartItem()` is now the single cart-payload definition**, and `TrendingCard` was refactored onto it. It prefers the `isDefault` variant rather than array order — which incidentally fixes `TrendingCard` adding a non-default variant when a product has several.
7. **The backfill orders `featured` first, then newest**, per §4 Part A step 6, rather than newest-only as the old inline PDP query did. This matches the `hot-sales` page's existing convention and only affects the case where a rail would otherwise render short.
8. **`syncUpsells()` sanitises the payload** (self-references, duplicates, unknown ids) inside the server action rather than trusting the picker. The picker already prevents these, but `@@unique([productId, upsellId])` would turn a malformed payload into a failed product save.
9. **The API route logs server-side on failure** while still returning an empty list to the client. An earlier version swallowed errors entirely, which hid a real bug during testing.
10. **The PDP bundle is a small ad-slot box in the right column, not a full-width section.** Per §4 B3 it originally sat between `<ProductTabs />` and `<RelatedProducts />` at `density="comfortable"`, which rendered a large bordered card with a seed row and 3-up product tiles — a second product grid, visually competing with Related Products. It now renders at `density="compact"` directly under the buy box, inside the right column of the `lg:grid-cols-[1.35fr_0.85fr]` grid, and drops the seed row (the product on screen is already the headline above it). Two consequences:
    - The quoted total is the **whole bundle**, not the add-on delta. Compact mode normally reports only the add-ons because the checkout summary already lists the cart subtotal (§11.5); on the PDP the button genuinely adds the product on screen too, so `BundleView` gained `ctaIncludesSeed` to keep the quoted figure equal to what is charged.
    - It sits **outside** the `lg:sticky lg:top-28` wrapper, so it neither inherits the pinned position nor lengthens the box the buy box has to fit in. Sticky is now bounded by the whole right column, which gives the buy box a longer sticky range as a side effect.
    - `SURFACE` padding shrank from `p-5 sm:p-8` to `p-4` and `mt-10` to `mt-5`, since the box is no longer full-width.
11. **The checkout bundle moved out of the Order Summary and under the trust stats.** §4 B3 put it inside the sticky `<aside>`, between the line items and the totals. It now renders as the last child of the form card, directly under the desktop trust-stats row, which takes it out of the 420px sticky rail and gives it the full `1fr` column. The `lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto` bound on the `<aside>` is **kept** — the bundle was the reason it was added, but a long cart can still outgrow the viewport.
    - Two new opt-in props on the default export, both off by default so the cart page is untouched:
      - **`dismissible`** — renders an `X` in the heading row; `BundleView` gained `dismissible`/`onDismiss`. Dismissal is component state, so it lasts for the page's lifetime but resets on reload.
      - **`hideWhenInCart`** — an add-on the customer has added from this bundle is dropped from the rail, and the bundle renders nothing once none are left. This is the requested "don't show it if it's already in the cart". The recommender already excludes cart contents (`getUpsellAddOns` seeds `excluded`), so the only way an add-on becomes redundant is via this component's own `commit` — which is exactly what `addedIds` records. Filtering on `addedIds` rather than re-reading the cart is deliberate: a cart read would change `seedIds` and trigger a refetch, which is the item-swap that `settledRef` exists to prevent.
    - `className` was added to the default export so the caller's `border-t`/`pt-4` separator is rendered **inside** the component. A wrapper at the call site would outlive the bundle and leave a stray divider — the same class of bug as §11.3.
    - The bundle now sits inside the checkout `<form>`, so every button it renders must be `type="button"`. They already were; the new dismiss button is too, and this is now asserted in the render test.
12. **`count` was added to `BundleView`** so the loading skeleton draws exactly as many rows as will arrive (2 on the PDP, 3 on cart/checkout) rather than a hardcoded 3, which caused a one-row height jump on the PDP.
13. **The bundle no longer re-adds anything the cart already holds** (found in use, not in testing). `PdpBundle.commit` prepended the product on screen to *every* write, so clicking a single add-on's "+" also re-added that product. Since `addToCart` **merges** on `(productSlug, variantId)` rather than appending, a product already in the cart silently went to quantity 2. Two changes:
    - `withoutAlreadyInCart(items, cart = loadCart())` in `cartStorage.js` filters candidates against the cart using the same merge key `addToCart` uses — placed there so the key cannot drift. Every bundle write path now filters through it, so a product is never quietly used as a quantity bump. Variant identity is respected: a different variant is a different line and *is* still added.
    - A single row's "+" now adds only that add-on (`includeMain` defaults to `false`). Only the "Add all" CTA carries the product on screen, which is the "buy these together" contract. Previously "+" added the product on screen too, which is what the cart and checkout rails never did.
    - `PdpBundle` now tracks the cart (`cart-updated` listener, deliberately *not* suppressed around its own writes) to derive `mainInCart`, and `ctaIncludesSeed={!mainInCart}`. When the product is already in the cart, "Add all" will not re-add it, so the box quotes only the add-on delta and says "Bundle adds" — quoting the combined bundle there would overstate what is charged.
14. **All three surfaces converged on the same small dismissible ad box** (requested, in two steps). The cart went first, then the checkout summary. Both were still on divergent presentations — the cart on full-width `comfortable` (3 large `aspect-square` tiles, no close control), the checkout on compact but with no card of its own, just a `border-t` separator bleeding into the form card.
    - `surface` was added to the default export and passed through to `BundleView`. The product page set it directly on `BundleView`, so no cart- or checkout-driven bundle could own its own container.
    - Final call sites: cart `density="compact" surface dismissible limit={3}`; checkout `density="compact" surface limit={3} dismissible hideWhenInCart`; product page `surface density="compact" count={2} showSeedGroup={false} ctaIncludesSeed={!mainInCart}`. Checkout is the cart config plus `hideWhenInCart`; the product page differs only where it has its own add-to-cart and hides the seed row.
    - **A consequence worth recording:** `totalIncludesSeed` is `ctaIncludesSeed || !compact`, so the cart quoted figure changed from the combined bundle (৳3,650) to the **add-on delta** (৳1,650), relabelled "Bundle adds". That is the correct number — the cart is listed immediately above the box and the Subtotal immediately below, so quoting the combined bundle would double-count what the customer already has. Comfortable density had no way to express "delta only", which is part of why it always read as a total.
    - Dismissal is component state and the component returns `null`, so nothing — no border, no spacer — is left behind.
    - Both boxes are children of a `space-y-4` wrapper, whose `> :not([hidden]) ~ :not([hidden])` selector (specificity 0,3,0) beats `SURFACE`s `mt-5` (0,1,0). They therefore land on 16px — matching the surrounding cards rather than the product page 20px. The override is real but the outcome is what we want, so nothing was changed.
    - **`className` was removed from the default export.** It had been added in step 11 purely so the checkout `border-t` separator would be rendered *inside* the component and could not outlive the bundle. With `surface` supplying the chrome there is no separator and no call site passed it, so it was deleted rather than left as dead API.
    - Accepting the box-in-box: the checkout bundle is a bordered white card inside the form bordered white card. It is the same white-on-white the cart already uses, distinguished by its border and `shadow-ambient`, and the alternative — no chrome at all — is exactly what the request was correcting.
15. **Long titles wrap instead of truncating, and the ad box is tighter on mobile** (requested).
    - `CompactAddOnRow` truncated the product title to a single line with an ellipsis. In a ~200px compact row almost every real catalogue title overflows, so the box was showing cut-off names. The title is now `line-clamp-2 leading-snug` — it wraps to two lines, the same convention `AddOnTile` and the seed-group subtitle already used. Two lines rather than unlimited: an unclamped title in a 3-row compact box can run six lines tall, which is a different kind of broken.
    - The compact `SeedGroup` title had the same truncation and was fixed the same way.
    - The price deliberately **keeps** `truncate` in the comfortable tile. Wrapping `৳1,150` onto two lines would be worse than an ellipsis, and its parent already has `min-w-0`. The compact row's price row gained `flex-wrap` instead, so an unusually wide price wraps cleanly instead of overflowing.
    - `SURFACE` horizontal padding is now `px-2`, with `sm:px-4` restoring the original from the `sm` breakpoint up; vertical padding is unchanged at `py-4`. The compact rows are the tightest thing on the storefront at mobile width, so the reclaimed 16px goes to the wrapped titles.
16. **The storefront page gutter was tightened site-wide** (requested, as `px-2 sm:px-4 lg:px-page-margin-desktop`). The snippet came from the checkout page, but `px-page-margin-mobile` is not page-specific — it is the site's gutter token, used in 15 files including `Header` and `Footer`. Changing checkout alone would have left its content wider than its own chrome, so this was raised as a scope question and answered "site-wide, via the token".
    - `page-margin-mobile` went from `1.25rem` (20px) to `0.5rem` (8px) in `tailwind.config.js` — one edit covering all 16 usages, pages and chrome together.
    - Seven page wrappers did not use the token; they hardcoded `px-4` (16px). Set to `px-2` so mobile is genuinely uniform, and their `sm:px-6` set to `sm:px-4`.
    - All 21 remaining storefront page gutters moved `sm:px-6` → `sm:px-4`.
    - **A trap worth recording:** five wrappers (`Header`, `hot-sales`, `TrendingNow`, two `PromoBanner` sections) went straight from the mobile token to `md:px-page-margin-desktop` with no intermediate step. Shrinking the token alone would have made them jump 8px → 40px at 768px, which looks broken. A `sm:px-4` step was inserted into each.
    - Deliberately **not** changed: the four `sm:px-6` uses in the checkout `<aside>` (section dividers, not gutters), all of `app/admin/` (separate design system), and every `md:`/`lg:` desktop value. `lg:px-8` on seven pages still differs from `lg:px-page-margin-desktop` — a pre-existing inconsistency left alone, as desktop was out of scope.
    - Verified by sweeping every `max-w-*` wrapper in `app/(storefront)` and `src/components/storefront`: 8 use `px-2` and 16 use the token, and all 16 now resolve to 8px. No `px-4`/`px-6` mobile gutter remains on any wrapper. `AnnouncementBar` was caught by that sweep — it is chrome on every page and had been missed initially.

---

*Related: `ai-workflow-rules.md` (conventions), `frontend-architecture.md` (component + localStorage sync), `data-model.md` (Prisma models), `progress-tracker.md` (project status).*
