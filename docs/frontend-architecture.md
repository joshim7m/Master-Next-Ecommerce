# Frontend Architecture

## Routing & Layout
- Next.js 16 App Router, all JSX. Route groups: `(storefront)` for public pages; admin lives at the real path `app/admin/` (no route group).
- Root layout (`app/layout.jsx`) provides DB-driven metadata (site name/favicon from SiteSetting), Playfair Display + Inter fonts, Material Symbols Outlined icons, and mounts `ThemeInit`.
- Storefront layout wraps pages with Header, Footer, GTM script, PageViewTracker (in `<Suspense>`), JSON-LD, and rich shared metadata.
- Loading states via `loading.js` on home, products, categories routes; custom `not-found.jsx`.

## Components

### Storefront (`src/components/storefront/`)
- `Header` — Sticky header with backdrop-blur, centered brand name (Playfair Display), desktop nav links (hidden on mobile), Material Symbols icons (search, person, favorite, shopping_bag), live search autocomplete (debounced `/api/search`, keyboard navigation), dark-mode toggle, mobile hamburger menu, wishlist/cart icons with counts
- `Footer` — `bg-editorial-ink` dark background, 4-column responsive grid, newsletter form, social SVG icons, dynamic links from DB, Bangladesh-focused branding
- `CartDrawer` — slide-out mini cart synced to localStorage
- `AnnouncementBar` — Full-width dark strip (`bg-editorial-ink`), centered uppercase text, configurable via DB `announcementText`, enabled by default in Header
- `GoogleTagManager` + `PageViewTracker` — GTM injection and SPA `page_view` events
- `ProductDetailClient` — orchestrates product page interactivity
- `FrequentlyBoughtTogether` — "Frequently Bought Together" cross-sell bundle. One implementation, two entry points: the default export is cart-driven (cart page, checkout summary) and reads `localStorage` + the `cart-updated` event; the named `PdpBundle` export is driven by the product on screen. Recommends 3 add-ons on cart/checkout and 2 on the PDP, renders a single "Add all to cart" CTA, and exposes a `density` of `comfortable` (grid tiles, cart page) or `compact` (rows, for the sticky checkout summary **and** the PDP ad box). `BundleView` is the shared presentational layer.
  - On the **PDP** it renders as a small ad-slot box at `density="compact"`, in the right column directly under the buy box and outside the `lg:sticky` wrapper, with `showSeedGroup={false}` (the viewed product is already the headline above it) and `ctaIncludesSeed` — that last one makes the quoted total the **whole bundle** rather than the add-on delta, because the button also adds the product on screen. The checkout summary keeps the delta, since it already lists the cart subtotal.
  - `count` sets how many skeleton rows draw while loading, so the box does not change height when the add-ons arrive.
  - `dismissible` adds an `X` to the heading; `hideWhenInCart` drops add-ons the customer has already added from this bundle and renders nothing once none remain. Both are **opt-in and default off** — the cart page relies on the rail staying put after an add, which is what `settledRef` guarantees. `hideWhenInCart` filters on the component's own `addedIds` rather than re-reading the cart, because a cart read would change `seedIds` and trigger the refetch that would swap the remaining items.
  - `surface` gives the bundle its own card chrome (`SURFACE`). The product page set this on `BundleView` directly; it is now also reachable from the default export, so the cart and checkout can own their containers. `SURFACE` is `px-2 py-4 sm:px-4` — tighter horizontal padding below `sm`, where the compact rows have the least room.

  Product titles **wrap**, they do not truncate. `CompactAddOnRow` and the compact `SeedGroup` both use `line-clamp-2 leading-snug`; the clamp is what stops a long title from running six lines tall in a 3-row box. Prices are the deliberate exception and keep `truncate`, because wrapping a number is worse than ellipsising it.

  All three storefront surfaces render the same compact ad-box form — `density="compact" surface` everywhere, `dismissible` on the cart and checkout, plus `hideWhenInCart` on the checkout only. The product page differs only where it has its own add-to-cart: 2 add-ons instead of 3, no seed row (the product is already the headline above), and `ctaIncludesSeed={!mainInCart}`. Comfortable density is still available but unused: it is the one presentation that cannot express "add-on delta", since `totalIncludesSeed` is `ctaIncludesSeed || !compact`, so it always quotes the combined bundle. That is right on a standalone merchandising block and wrong next to a subtotal that already counts the cart.
  - **No bundle write path re-adds a line the cart already holds.** `addToCart` merges on `(productSlug, variantId)`, so re-adding silently raises that line's quantity instead of adding anything — the bundle is an "add these" affordance, never a quantity bump. `withoutAlreadyInCart()` in `cartStorage.js` does the filtering with the same merge key, so the two cannot drift. On the PDP only the "Add all" CTA includes the product on screen; a single row's "+" adds just that add-on, matching the cart and checkout rails. `PdpBundle` tracks the cart to quote the add-on delta instead of the combined bundle when the product on screen is already in it.
- `BlogCard`, `AdCard`, `LoadMorePosts` — blog listing pieces
- `MobileFilter` — mobile filter drawer

### Product page partials (`src/components/storefront/partials/`)
- `ProductInfo` — variant selection, quantity, pricing/discount display, add-to-cart, buy-now, **WhatsApp order button** (wa.me deep link with product/variant/price pre-filled), share, wishlist toggle
- `ImageGallery` — product image gallery
- `ProductTabs` — description/additional info tabs
- `RelatedProducts` — same-category suggestions (6 cards), now served by `getAutoRelated()` instead of an inline query

### Homepage partials (`app/(storefront)/(home)/_partials/`)
- `Hero` — DB-driven hero slider
- `FilterSidebar` (desktop) / `MobileCategoryChips` (mobile) — category navigation
- `ProductGrid` + `SortBar` — product grid with sorting

### Shared
- `ThemeInit` — applies saved theme or OS preference before paint
- `ConfirmDialog` — reusable confirmation modal

### Admin components (`src/components/admin/`)
- `ThemeProvider` — context-based dark mode (`admin-theme` key)
- `TipTapEditor` — StarterKit + Underline + Link + Image extensions with toolbar
- `RichEditorSection` — collapsible wrapper for a rich-text field (collapsed by default, open state in `localStorage` under `productEditor:<field>`, plain-text preview when collapsed, children lazily mounted). Used for product `description` + `specification` — see `product-description-specification.md`
- `CategoryMultiSelect`, `AdvertisementMultiSelect`

## API Routes
- `GET /api/recommendations?ids=<csv>&limit=3` — public, unauthenticated. Returns `{ products, source }` where `source` is `curated | auto | mixed`. Ids are validated against `/^[A-Za-z0-9_-]{1,64}$/`, capped at 20, and `limit` is clamped to 1–6. Every failure returns `{ products: [], source: 'auto' }` with a `console.error` server-side, so a bad request can never break a page render.

## State Management
- **Cart:** localStorage via `src/lib/cartStorage.js` (key `cabinet-closet-cart`). Add/update/remove/clear operations dispatch a `cart-updated` window event so Header/CartDrawer stay in sync. No server-side cart. `productToCartItem(product, quantity, variant)` is the single definition of the cart payload shape — `variantId` must keep matching the `productSlug` + `variantId` merge key or the same product lands in the cart twice.
- **Wishlist:** localStorage via `src/lib/wishlistStorage.js` (key `cabinet-closet-wishlist`) with `wishlist-updated` event. The wishlist page hydrates stored IDs through `POST /api/wishlist`.
- **Product page state:** selected variant, quantity, dynamic pricing — localized to `ProductDetailClient`.
- **Checkout state:** customer name, mobile, address, shipping area, delivery charge selection.
- **Device fingerprint:** `useDeviceFingerprint` hook caches FingerprintJS visitorId in localStorage (`device-hash`) and sends it with checkout.
- No global state library; React Context only for admin theming.

### Cart-derived recommendation state
- The cart and checkout pages read the cart **only** on mount, so both listen for `cart-updated` — otherwise items added from the upsell bundle would never reach the line items, the totals, or the submitted order.
- The bundle itself must not react to its own writes. It sets a ref around its `addToCart` calls to swallow the synchronous `cart-updated` events they fire, and stops listening entirely once the customer has added from it — otherwise the rail swaps its own add-ons out from under them right after "Add all".
- The sticky checkout `<aside>` is bounded with `lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`, since a 3-item bundle plus the summary can otherwise grow taller than the viewport and push the Place Order button out of reach.

## Analytics & Tracking
- `src/lib/gtm.js` exposes `pushDataLayer(event, data)`.
- `usePageView` hook pushes `page_view` (`page_path`, `page_location`, `page_title`) on every route/searchParams change.
- PageViewTracker is wrapped in `<Suspense>` because `useSearchParams` opts pages out of static rendering.

## Regional Requirements
- Bangladeshi Taka (BDT) is the only currency, displayed with ৳ symbol.
- Delivery charges: inside Dhaka = 50 taka, outside Dhaka = 120 taka.
- BD phone number validation at checkout.

## Styling
- Tailwind CSS 3.4 with `darkMode: 'class'`; Material Design 3 color palette in `tailwind.config.js` (`primary: #ae2f34`, `secondary: #684fa6`, `editorial-ink: #1A0A3E`, `warm-sand: #F9F7F2`); Playfair Display (headings) + Inter (body) font families via Google Fonts; Material Symbols Outlined for icons; `@tailwindcss/typography` plugin for blog prose.

### Page gutter

The storefront gutter is **8px at mobile, 16px from `sm`, 40px at desktop**. Two mechanisms produce it, and they must agree:

- `page-margin-mobile` (`0.5rem`) in `tailwind.config.js` — the token, used by the pages and by `Header`, `Footer` and `AnnouncementBar`. Changing this one value moves page content and site chrome together; changing a page's classes alone desynchronises them.
- Hardcoded `px-2` / `sm:px-4` on the handful of wrappers that predate the token.

Every page wrapper needs a `sm` step. A wrapper that goes straight from the mobile token to `md:px-page-margin-desktop` will jump 8px → 40px at 768px, which reads as a layout bug. `app/admin/` has its own gutter (`px-4 sm:px-6`) and is deliberately not part of this system.
- Mobile-first responsive design throughout.

## Images
- Product/admin uploads stored under `public/uploads/<folder>/` (via `/api/admin/upload`); seeded content uses remote URLs.
- Variant-specific images supported via `ProductVariant.imageId`.

## SEO Implementation
- Per-page `generateMetadata` on home, category, product detail, blog listing/detail/category pages.
- Open Graph images generated at runtime by edge route `/api/og` (1200×630, brand-styled).
- JSON-LD: Organization + WebSite (SearchAction) in storefront layout; BlogPosting + BreadcrumbList on posts.
- Dynamic `app/sitemap.js` (static pages + published products/categories/blog content) and `app/robots.js` (disallow `/admin/`, `/api/`).
