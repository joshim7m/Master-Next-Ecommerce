# GTM & Meta Pixel Tracking — Implementation Notes

Date: 2026-11-04. Companion to `docs/GTM-Review.md`.

## Architecture

- **Single GTM container** loaded once by `src/components/storefront/GoogleTagManager.jsx`
  (mounted in `app/(storefront)/layout.jsx`). Idempotent: guards against StrictMode
  double-mounts and duplicate scripts.
- **All events** flow through `src/lib/gtm.js`:
  - `pushDataLayer(event, data)` — raw push (never resets the data layer).
  - `pushEcommerce(event, { items, value, currency, ...extra })` — shopping events.
  - `buildEcommerce(...)` — payload builder (also used for the stored purchase).
  - `toEcommerceItem(item)` — accepts GA4 keys (`item_id`…) or app keys (`sku`, `title`,
    `variantName`, `category`) and emits a GA4 item.
- **No direct Meta Pixel (`fbq`) code exists anywhere.** The Pixel must live inside GTM.

## What every ecommerce payload contains now

Derived automatically from `items` (plus any explicit overrides):

| Field | Meaning |
|---|---|
| `currency` | `"BDT"` (default) |
| `value` | Σ price×quantity, or the explicit `value` (checkout/purchase include shipping) |
| `items` | GA4 item array (`item_id` = **SKU**, `item_name`, `price`, `item_variant`, `item_category`, `quantity`) |
| `content_type` | `"product"` (Meta) |
| `content_ids` | array of SKUs (Meta) |
| `contents` | `[{ id, quantity, item_price }]` (Meta) |
| `num_items` | total units (Meta) |

## Event map (code → GTM custom event trigger → Meta standard event)

| Code event (dataLayer) | Fired from | Meta standard event |
|---|---|---|
| `gtm.js` (Container Loaded) | `GoogleTagManager.jsx` bootstrap | — |
| `page_view` | `usePageView` (initial load + every client navigation, deduped) | PageView |
| `view_item` | `ProductInfo.jsx` (product page mount) | ViewContent |
| `search` | `Header.jsx` search overlay, once per distinct term per session | Search (`search_term` → search_string) |
| `add_to_cart` | `ProductInfo`, `TrendingCard`, `FrequentlyBoughtTogether` | AddToCart |
| `remove_from_cart` | `cart/page.jsx`, `CartDrawer.jsx` (remove / qty→0) | *(no Meta standard — optional custom)* |
| `view_cart` | `cart/page.jsx` | *(no direct Meta standard; optional)* |
| `begin_checkout` | `checkout/page.jsx` mount, once per visit | InitiateCheckout |
| `add_payment_info` | `checkout/page.jsx` after form validation on submit, `payment_type: "Cash on Delivery"` | AddPaymentInfo |
| `purchase` | `ThankYouContent.jsx` reading the `gtm_purchase` sessionStorage entry | Purchase |

### Event naming note

The codebase uses **GA4 names** (`page_view`, `view_item`, `add_to_cart`,
`begin_checkout`, `purchase`). They were preserved. In GTM, either create
Custom Event triggers per name and map to the Meta tag's standard event, or use
GTM's "Meta Pixel" tag which lets you pick the standard event per trigger.

## Purchase duplication safety

- Checkout writes `gtm_purchase` to **sessionStorage only after** `/api/checkout`
  responds with an `orderNo`, then navigates to `/thankyou`.
- `ThankYouContent` pushes `purchase` **once**, then deletes the key.
  - StrictMode double-effect → second run finds nothing.
  - Refreshing /thankyou → nothing stored → no repeat purchase.
  - Direct visits to /thankyou without an order → no event.
- `ecommerce.transaction_id` and `ecommerce.event_id` = order number. Map
  `ecommerce.event_id` to the Meta tag's **Event ID** field so Events Manager can
  deduplicate browser vs. Conversions API events.

## Remaining GTM dashboard configuration (cannot be fixed in code)

1. Create Custom Event triggers for: `page_view`, `view_item`, `search`,
   `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`,
   `add_payment_info`, `purchase`.
2. Attach the **Meta Pixel** tag (template) to those triggers with the matching
   standard events; map variables:
   - `currency` ← `ecommerce.currency`
   - `value` ← `ecommerce.value`
   - `content_ids` ← `ecommerce.content_ids` (array), `content_type` ← `ecommerce.content_type`
   - `contents` ← `ecommerce.contents`, `num_items` ← `ecommerce.num_items`
   - `search_string` ← `search_term`
   - `transaction_id` / Event ID ← `ecommerce.transaction_id` / `ecommerce.event_id`
3. Make sure the Pixel tag fires on the **Initialization** or the custom triggers —
   not on the deprecated/missing `gtm.load` only.
4. **Do not** also fire GA4's built-in "Page View" from `gtm.js` Container Loaded —
   that would double-count pageviews against the dataLayer `page_view` event.
   Use one method only.
5. Verify one Pixel (and one container) in GTM → the `dataLayer` is shared.

## Testing with GTM Preview

1. In GTM: **Preview** → enter `http://localhost:3000` (or the deployed domain).
2. Tag Assistant connects; each step of the summary shows the dataLayer state.
3. Walk the funnel and assert exactly one event per action:
   - Load home → `gtm.js`, `page_view` (once).
   - Open a product → `view_item` with `currency: "BDT"`, `value`, `content_ids`.
   - Search "efero" → `search` with `search_term` (once per term).
   - Add to cart (PDP and a trending card) → `add_to_cart` ×1 each.
   - Remove from the cart drawer → `remove_from_cart`.
   - Proceed to checkout → `begin_checkout` (once even after client-side back/forward).
   - Submit the order form → `add_payment_info`.
   - After redirect → `purchase` with `transaction_id` = order number.
   - Reload /thankyou → **no** second `purchase`.
4. Confirm only **one** `gtm.js` Container Loaded per full page load.

## Testing with Meta Events Manager → Test Events

1. Events Manager → your Pixel → **Test Events** tab.
2. In GTM Preview, or via the published container, trigger the same funnel.
3. Expect: PageView on load, ViewContent on product, Search, AddToCart,
   AddPaymentInfo (as AddPaymentInfo), Purchase — each with `currency: BDT`,
   `value`, and `content_ids` = SKUs.
4. If a Meta event fires twice, check for two Pixel IDs configured (two tags) or
   a leftover hard-coded `fbq` snippet — there is none in this codebase.
