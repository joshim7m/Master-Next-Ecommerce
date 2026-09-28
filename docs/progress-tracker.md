# Project Progress Tracker

A living document tracking the status of all project tasks for the Eghuri ecommerce application.

**Last Updated:** 2026-09-26 (Session 6 — upsell bundles implemented)

## Project Phases

### Phase 1: MVP Foundation ✅ Complete
Core storefront and admin functionality with real seeded catalog data.

### Phase 2: Hardening & Growth
SEO, analytics, fraud prevention, WhatsApp ordering, DB tooling. Payment integration remains the major outstanding item.

### Phase 3: Storefront UI Redesign (Current)
Major visual overhaul of the storefront. Material Design 3–inspired palette, Playfair Display + Inter fonts, Material Symbols icons, redesigned Header, Footer, Homepage, and product pages.

### Phase 4: Payment Integration
Third-party payment gateway (bKash, Nagad, cards).

### Phase 5: Advanced Operations
Inventory sync, fulfillment workflows, customer accounts, reviews.

---

## Database & Schema

| Task | Status | Notes |
|------|--------|-------|
| Prisma schema (20 models) | ✅ Done | See `schema.prisma`; documented in `data-model.md` |
| Database migrations | ✅ Done | 2 migrations under `prisma/migrations/` — `init`, then `add_product_upsells` |
| ProductUpsell table | ✅ Done | Curated cross-sell links, `20260926071426_add_product_upsells`; both relations cascade |
| Seed pipeline (scraper-based) | ✅ Done | `seed.js` → `seedSettings` + `seedCatalog` + `seedBlog`; see `seeding.md` |
| Catalog scraper (`fetchCatalog.js`) | ✅ Done | Cheerio scraper for eghuri.com → `catalogData.json` |
| Bengali content processing | ✅ Done | `processCatalog.js` EN→BN tags/meta; Bengali blog posts in `seedBlog.js` |
| SiteSetting singleton | ✅ Done | Identity, contact, announcement, Telegram/GTM/WhatsApp config |
| BlockedDevice table | ✅ Done | Fraud blocklist keyed by FingerprintJS hash |

---

## Storefront Development

### Pages & Routes

| Page | Status | Notes |
|------|--------|-------|
| Home (`(home)/page.jsx`) | ✅ Done | Hero slider, filter sidebar, product grid, sort bar, mobile category chips |
| Products listing | ✅ Done | `/products` with sorting |
| Product detail | ✅ Done | Gallery, variants, tabs, related products, WhatsApp order, share, wishlist |
| Categories listing + detail | ✅ Done | Hierarchical browsing |
| Cart page | ✅ Done | localStorage cart, qty controls |
| Checkout | ✅ Done | BD phone validation, delivery charge, device-hash fraud checks |
| Thank You | ✅ Done | Order number display |
| Wishlist | ✅ Done | `/wishlist`, hydrated via `POST /api/wishlist` |
| Blog listing/categories/post | ✅ Done | Load-more pagination, ad injection, reading time, related posts |
| Static pages (about/contact/privacy/terms) | ✅ Done | |
| 404 page | ✅ Done | Custom `not-found.jsx` |
| Loading skeletons | ✅ Done | `loading.js` on home/products/categories routes |

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| Header | ✅ Done | Live search autocomplete, dark toggle, wishlist/cart icons — **redesign in progress** |
| Footer | ✅ Done | Social links, Bangladesh branding — **redesign in progress** |
| CartDrawer | ✅ Done | Slide-out mini cart synced via `cart-updated` event |
| AnnouncementBar | ⚠️ Built, disabled | Wired but commented out in Header — **being redesigned and enabled** |
| ProductGallery / ImageGallery | ✅ Done | In product partials |
| VariantSelector | ✅ Done | Inside `ProductInfo` |
| FilterSidebar / MobileFilter | ✅ Done | Desktop sidebar + mobile drawer/chips |
| GoogleTagManager + PageViewTracker | ✅ Done | SPA `page_view` events, Suspense-wrapped |
| FrequentlyBoughtTogether | ✅ Done | One component, two entry points (cart-driven default + `PdpBundle`), `comfortable`/`compact` densities |

### Features

| Feature | Status | Notes |
|---------|--------|-------|
| Cart state (localStorage) | ✅ Done | `src/lib/cartStorage.js` |
| Wishlist (localStorage) | ✅ Done | `src/lib/wishlistStorage.js` + hydration API |
| Variant pricing logic | ✅ Done | Variant override or base price, discount amount/% |
| Delivery charge selection | ✅ Done | Inside Dhaka ৳50 / Outside ৳120 |
| Dark mode (storefront) | ✅ Done | Class strategy, persisted, OS preference fallback |
| SEO (metadata, sitemap, robots, JSON-LD) | ✅ Done | Per-page metadata, dynamic sitemap, OG images via `/api/og` |
| GTM analytics | ✅ Done | Configurable via SiteSetting `gtmId` |
| WhatsApp ordering | ✅ Done | wa.me deep link with product/variant/price pre-fill |
| Device fingerprinting | ✅ Done | FingerprintJS visitorId cached and sent at checkout |
| Image optimization | ✅ Done | Next.js Image; uploads to `public/uploads/` |
| Related products (PDP) | ✅ Done | 6 cards from `getAutoRelated()` (same category, scored by shared tags + price band, backfilled featured/newest) |
| Upsell / cross-sell bundles | ✅ Done | "Frequently Bought Together" on PDP (2 add-ons), cart (3) and checkout order summary (3). Curated `ProductUpsell` rows first, automatic scoring as fallback. See `plan-upsell-bundles.md` |

---

## Admin Panel Development

| Task | Status | Notes |
|------|--------|-------|
| JWT authentication (login/logout/me) | ✅ Done | `jose` HS256, httpOnly cookie, 8h expiry |
| Route protection (`proxy.js`) | ✅ Done | Next 16 middleware equivalent guarding `/admin/:path*` |
| Dashboard (stats + recent orders) | ✅ Done | |
| Products CRUD with variants | ✅ Done | Variant generator, image diffing on update |
| Product description + specification rich text | ✅ Done | TipTap v3 editors in collapsible `RichEditorSection`s; HTML stored in `Product.description` / `Product.specification`, rendered on the storefront Description/Specifications tabs. See `product-description-specification.md` |
| Multi-image upload | ✅ Done | `/api/admin/upload`, type whitelist, 5MB max |
| Categories CRUD (hierarchical) | ✅ Done | Parent/child management |
| Orders list/detail/search | ✅ Done | Status updates, item qty editing, totals recompute |
| Device blocking/unblocking | ✅ Done | `BlockedDevice` + checkout rejection |
| Blog categories/posts/advertisements CRUD | ✅ Done | Tiptap editor, ad linking multiselect |
| Settings: site identity | ✅ Done | Name, logo, favicon, contact, announcement, about (EN/BN) |
| Settings: site-config integrations | ✅ Done | Telegram token/chat (+test), GTM ID, WhatsApp number |
| Settings: hero sliders CRUD | ✅ Done | |
| Settings: social links CRUD | ✅ Done | |
| Settings: DB backup/restore | ✅ Done | pg_dump download / .sql restore upload (**uncommitted**) |
| Admin dark mode | ✅ Done | ThemeProvider context + toggle |
| Role-based access (admin/editor separation) | ❌ Not Started | Single admin role enforced by proxy |

---

## API Routes

All endpoints implemented and documented in `docs/architecture.md`. Summary:

| Group | Status | Notes |
|-------|--------|-------|
| Public storefront APIs (search, categories, recent products, wishlist, checkout, check-blocked, og) | ✅ Done | Checkout includes fraud checks + Telegram alert |
| `GET /api/recommendations` | ✅ Done | Public, unauthenticated. `?ids=&limit=` → `{ products, source: curated\|auto\|mixed }`. Ids validated/capped, limit clamped, never throws |
| Admin auth APIs | ✅ Done | login/logout/me |
| Admin catalog APIs (products, categories) | ✅ Done | Full CRUD |
| Admin order APIs (list, detail, search, block/unblock) | ✅ Done | |
| Admin settings APIs (site, site-config+test, hero-sliders, social) | ✅ Done | |
| Admin upload API | ✅ Done | Multi-file → `public/uploads/` |
| Admin backup API | ✅ Done | **Uncommitted work** |

---

## Styling & Design

| Task | Status | Notes |
|------|--------|-------|
| Tailwind config (Material Design 3 palette, Playfair Display + Inter, typography plugin) | ✅ Done | `#ae2f34` primary, `#684fa6` secondary, full Material tokens |
| Responsive mobile-first design | ✅ Done | Grids, drawers, chips across breakpoints |
| Dark mode — storefront | ✅ Done | ThemeInit + Header toggle |
| Dark mode — admin | ✅ Done | ThemeProvider + AdminHeader toggle |
| Storefront redesign — Header + Footer + config | ✅ Done | Phase 3: Material icons, centered brand, editorial footer |
| Storefront redesign — Homepage sections | ✅ Done | Phase 3: Hero, categories, product grid, promo banner |
| Storefront redesign — Product detail page | ✅ Done | Phase 3: Image gallery, variant selector, tabs |
| Storefront redesign — Blog pages | ❌ Not Started | Phase 3: Blog listing, post detail |
| ShadCN UI | ❌ Dropped | Decided against; plain React + Tailwind everywhere |

---

## Testing & Quality Assurance

| Task | Status | Notes |
|------|--------|-------|
| Test framework setup | ❌ Not Started | No Jest/Vitest/Playwright configured |
| Unit/component tests | ❌ Not Started | Priority: pricing logic, storage helpers, blog-ads injection |
| Integration tests (API routes) | ❌ Not Started | Priority: `/api/checkout` |
| E2E tests | ❌ Not Started | Browse→checkout, admin flows |
| Accessibility audit | ❌ Not Started | axe-core + manual keyboard pass |
| Build verification | ✅ Done | `npm run build` passing pre-deploy |

---

## Deployment & DevOps

| Task | Status | Notes |
|------|--------|-------|
| Vercel deployment config | ✅ Done | Minimal `next.config.mjs`, `postinstall: prisma generate` |
| Production database | ✅ Done | External PostgreSQL via `DATABASE_URL` |
| Environment variables | ✅ Done | `.env` with DATABASE_URL (integration tokens live in DB) |
| SEO infrastructure | ✅ Done | Sitemap, robots, OG images, JSON-LD |
| CI/CD (GitHub Actions) | ❌ Not Started | Lint/build/test pipeline |
| Monitoring & error tracking | ❌ Not Started | GTM analytics only; no error tracking yet |
| Security review | ⏳ Partial | JWT guard + fraud checks done; formal review pending |

---

## Documentation

| Task | Status | Notes |
|------|--------|-------|
| All 10 docs refreshed to match codebase | ✅ Done | Session 2026-08-21: overview, architecture, data-model, frontend-architecture, admin-panel, seeding, ai-workflow-rules, ui-context, testing, progress-tracker |

---

## Key Blockers & Decisions

### Resolved Decisions
- **Auth:** Custom JWT via `jose` + `proxy.js` (Next 16 middleware replacement) — not NextAuth
- **Image storage:** Local uploads to `public/uploads/` + remote URLs for seeded data
- **Dark mode:** Implemented in both storefront and admin
- **UI library:** ShadCN dropped; plain React + Tailwind throughout
- **Product data:** Real scraped catalog from eghuri.com (not dummy data)

### Current Blockers
- None blocking development.

### Pending Decisions
- Payment gateway choice (bKash/Nagag/card) and timeline
- Customer accounts (registration/login) — currently guest-only checkout
- Bengali localization of UI chrome
- Error tracking service (Sentry or similar)
- ~~**`sale_price` vs `unite_price` (data bug)**~~ **RESOLVED.** Originally all 61 seeded products that had a `sale_price` had it *higher* than `unite_price` — the two were semantically swapped, so every product card rendered a strikethrough on a *lower* number than the price charged and no discount badge ever appeared. Root cause was `prisma/fetchCatalog.js` writing `salePrice = oldPrice` and `unitePrice = currentPrice`; that is fixed, and the catalogue has since been re-seeded. The DB now holds 30 products, 21 with a `sale_price`, and **0** with `sale_price > unite_price` — real discounts of 34–69%. Nothing further to decide. `TrendingCard` and `RelatedCard` never had the `displayPricing()` guard, and no longer need one.
- **Inside-Dhaka delivery charge (data/code mismatch):** ৳80 in `checkout/page.jsx` but ৳50 in `app/api/checkout/route.js:48`. The customer is quoted one amount and charged another. Docs say 50. Which is authoritative?

---

## Next Steps

1. Complete storefront redesign — Header, Footer, config (Phase 3, current)
2. Homepage section redesign — Hero, categories, product grid, promo banner (Phase 3)
3. Payment gateway integration (Phase 4)
4. Set up test framework + CI pipeline
5. Customer accounts & order history

---

## Legend

- ✅ **Done:** Task completed and verified
- ⏳ **In Progress / Partial:** Being worked on or incomplete
- ⚠️ **Built, disabled:** Implemented but turned off
- ❌ **Not Started:** Ready to begin

---

## Session Log

### Session 2026-09-26 (Storefront Page Gutter Tightened)
- **Mobile gutter 20px → 8px, tablet 24px → 16px, site-wide.** Asked for as a single `<section>` snippet from checkout, but `px-page-margin-mobile` turned out to be the site's gutter *token* — used in 15 files including `Header` and `Footer`. Changing checkout alone would have left its content wider than its own chrome, so this was raised as a scope question and answered "site-wide, via the token".
- `page-margin-mobile`: `1.25rem` → `0.5rem` in `tailwind.config.js`. One edit, 16 usages, pages and chrome move together.
- Seven wrappers predated the token and hardcoded `px-4`; set to `px-2` so mobile is actually uniform. All 21 remaining storefront gutters moved `sm:px-6` → `sm:px-4`.
- **The trap:** five wrappers (`Header`, `hot-sales`, `TrendingNow`, two `PromoBanner` sections) went straight from the mobile token to `md:px-page-margin-desktop` with no middle step. Shrinking the token alone would have made them jump 8px → 40px at 768px. Inserted `sm:px-4` into each.
- `AnnouncementBar` was missed on the first pass — it is chrome on every page. Caught by sweeping every `max-w-*` wrapper afterwards and fixed.
- Left alone on purpose: the four `sm:px-6` uses in the checkout `<aside>` (section dividers, not gutters), all of `app/admin/` (separate design system), and every `md:`/`lg:` value. `lg:px-8` on seven pages still differs from `lg:px-page-margin-desktop` — a pre-existing inconsistency, out of scope here.
- Applied via a one-off script (`/tmp/opencode/tighten-gutter.cjs`) driving an explicit file:line list, asserting each target was a width-constrained page gutter and contained the expected class before editing. 26 lines across 22 files, zero skipped. Using a script rather than a repo-wide `sed` is what kept `admin/` and the aside dividers intact.
- Verified: build clean; the token emits `padding-inline: .5rem`; every storefront page wrapper now resolves to 8px at mobile with no `px-4`/`px-6` remaining; `/`, `/products`, `/categories`, `/cart`, `/checkout`, `/blogs`, `/wishlist`, `/contact`, `/about`, `/new-arrivals`, `/hot-sales`, `/thankyou` all 200. Both component test suites still green.
- **Not browser-verified** — no browser attached, so the gutter change is verified as emitted CSS and markup, not observed at 375px. This touched every page on the storefront, so it is the change most worth eyeballing at a few widths.

### Session 2026-09-26 (Long Titles Wrap + Mobile Padding)
- **Fixed: long product titles were cut off in the bundle.** `CompactAddOnRow` used `truncate` (single-line ellipsis), and in a ~200px compact row almost every real catalogue title overflowed — so all three ad boxes were showing cut-off names. Now `line-clamp-2 leading-snug`, matching what `AddOnTile` and the seed-group subtitle already did.
- Clamped at two lines rather than left unlimited. An unclamped title in a 3-row compact box can run six lines tall, which trades a readability bug for a layout bug.
- The compact `SeedGroup` title had the identical truncation; fixed the same way.
- **Prices deliberately still truncate.** Wrapping `৳1,150` onto two lines is worse than an ellipsis, and that span's parent already has `min-w-0`. The compact price row instead gained `flex-wrap`, so an unusually wide price wraps cleanly rather than overflowing.
- **Mobile padding: the ad box is now `px-2` with `sm:px-4` above.** Vertical padding is unchanged at `py-4`. The compact rows are the tightest thing on the storefront at mobile width, so the reclaimed 16px goes straight to the wrapped titles. This applies to all three surfaces, since they share `SURFACE`.
- Verified: 57 render assertions pass. New test [8] drives a 95-character title through the compact row and asserts it is emitted in full with `line-clamp-2` and no `truncate`, plus a source-level check that **no** title element in the file uses `truncate` and that the only remaining one is a price span. New test [9] pins the responsive padding. Four older assertions that keyed off `p-4` were repointed at the new padding. Build clean; all four pages 200.
- Three test bugs of my own, corrected rather than worked around: `AddOnTile` is internal and not exported (so the comfortable-tile case is now covered by a source check), `&` in a fixture title is HTML-escaped by React so the "rendered in full" check had to avoid it, and I had asserted the comfortable tile's price class against the compact row.
- **Still not browser-verified** — no browser attached. The wrap and the `sm` breakpoint in particular are only verified as emitted classes, not as observed layout at 375px.

### Session 2026-09-26 (Cart + Checkout Upsell → Ad Box)
- **All three bundle surfaces now render the same small dismissible ad box.** The cart went first, then the checkout. Both were still on divergent presentations — the cart on full-width `comfortable` (3 large `aspect-square` tiles, no close control), the checkout on compact but with no card of its own, just a `border-t` separator bleeding into the form card.
- **Added `surface` to the default export** and passed it through to `BundleView`. The product page had been setting it directly on `BundleView`, which meant a cart- or checkout-driven bundle had no way to own its own container.
- **Removed `className` from the default export.** It was added in the previous session solely so the checkout's `border-t` separator would render *inside* the component and could not outlive the bundle. With `surface` supplying the chrome there is no separator, and no call site passed it, so it was deleted rather than left as dead API.
- **Call sites are now:** cart `density="compact" surface dismissible limit={3}`; checkout `density="compact" surface limit={3} dismissible hideWhenInCart`; product page `surface density="compact" count={2} showSeedGroup={false} ctaIncludesSeed={!mainInCart}`.
- **The cart's quoted figure changed from ৳3,650 to ৳1,650** ("Bundle total" → "Bundle adds"), because `totalIncludesSeed` is `ctaIncludesSeed || !compact`. This is the **correct** number: the cart is listed immediately above the box and the Subtotal immediately below, so quoting the combined bundle would double-count what the customer already has. Comfortable density simply had no way to express a delta.
- Dismissal is component state and the component returns `null`, so the box leaves no border or spacer behind — covered by the existing emptiness guard.
- Layout: both boxes are children of a `space-y-4` wrapper, and `space-y-4`'s `> :not([hidden]) ~ :not([hidden])` selector (specificity 0,3,0) overrides `SURFACE`'s `mt-5` (0,1,0). They land on 16px, matching the surrounding cards rather than the product page's 20px. An override, but the right outcome, so left alone.
- Accepted a box-in-box on checkout: the bundle is a bordered white card inside the form's bordered white card. Same white-on-white the cart already uses, distinguished by border + `shadow-ambient`, and the alternative (no chrome) is what the request was correcting.
- Verified: 43 render assertions pass, with test [2] rewritten to pin the checkout presentation (ad-box chrome at the root with no outer wrapper, no `aspect-square`/`sm:grid-cols-3`, seed row, compact rows, delta-only quote, one dismiss button, one CTA). Build clean; `/checkout`, `/cart`, `/products/309` all 200. **Still not browser-verified** — no browser attached, so the close-button clicks are unit-asserted and reasoned, not observed.
- Not changed, flagged for a decision: the cart bundle does **not** hide when its add-ons are already in the cart (`hideWhenInCart` stays checkout-only). After "Add all" the box stays put showing "Added" ticks while the add-ons also appear in the line items above. That was the documented cart behaviour and only the close button was asked for — say the word if you want it to vanish there too.

### Session 2026-09-26 (Bundle Cart-Write Fix)
- **Fixed: adding from the upsell produced quantity 2, and re-added the product on screen.** Reported on `/products/309` ("Auto Door Closer", no variants, 2 curated add-ons — slugs 308 and 171).
- **Root cause:** `PdpBundle.commit` prepended the product on screen to *every* write, so clicking a single add-on's "+" also re-added that product. `addToCart` **merges** on `(productSlug, variantId)` rather than appending, so a product already in the cart went silently to quantity 2 instead of gaining a second line. Both symptoms were the same defect.
- **Fix 1 — `withoutAlreadyInCart(items, cart = loadCart())` in `cartStorage.js`.** Filters candidates against the cart using the *same* merge key `addToCart` uses, and lives next to `addToCart` so the key cannot drift. Every bundle write path now filters through it, so a product is never quietly used as a quantity bump. Variant identity is respected — a different variant is a different line and is still added.
- **Fix 2 — a single "+" adds only that add-on.** `commit` now takes `{ includeMain }`, defaulting to `false`; only the "Add all" CTA sets it. This matches what the cart and checkout rails always did, and stops "+" from dragging the product on screen into the cart as a side effect.
- **Fix 3 — the quoted total follows.** `PdpBundle` now tracks the cart (a `cart-updated` listener, deliberately *not* suppressed around its own writes, since after "Add all" the product genuinely *is* in the cart) and derives `mainInCart`. `ctaIncludesSeed={!mainInCart}`: when the product is already in the cart, "Add all" will not re-add it, so the box quotes the add-on delta and labels it "Bundle adds" rather than overstating the charge.
- Verified with a new test that drives the **real** `cartStorage` code against a fake `localStorage` (22 checks, all passing): the reported scenario (product at qty 1, then "+" on an add-on) leaves it at 1; "Add all" with the product present writes only the add-ons; "Add all" twice is idempotent; "+" then "Add all" does not bump the first add-on; a different variant is still added. Existing render test (34 checks) still green, build clean, all four pages 200.
- **Not browser-verified** — no browser attached, so this was reproduced and fixed at the `cartStorage`/write-path level rather than by clicking through. The logic is directly asserted, but the click path itself is unobserved.

### Session 2026-09-26 (Checkout Upsell Reposition)
- **Moved the checkout bundle out of the sticky Order Summary and under the trust stats** — it is now the last child of the form card, a sibling of the desktop trust-stats row. This takes it out of the 420px sticky rail and gives it the full `1fr` column, where the `comfortable` grid tiles have room to breathe. The `<aside>`'s `lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto` bound is deliberately **kept**: the bundle was why it was added, but a long cart can still outgrow the viewport.
- **Added a close (X) control.** `BundleView` gained `dismissible`/`onDismiss`; the button sits right-aligned in the heading row. Dismissal is component state — it survives cart changes but resets on reload. Persisting it to `sessionStorage` was not done; say the word if a reload during checkout should keep it dismissed.
- **Added "hide it if it's already in the cart."** The recommender already excludes cart contents on both the curated and auto paths (`getUpsellAddOns` seeds `excluded`), so an add-on can only become redundant through the bundle's own `commit` — which is what `addedIds` already records. So `hideWhenInCart` filters on `addedIds` and renders nothing once none are left. Filtering on a fresh cart read was rejected: it would change `seedIds` and trigger a refetch, i.e. exactly the item-swap `settledRef` exists to prevent. Both new props are opt-in and default off, so the cart page's documented "rail does not swap its own items after Add all" behaviour is unchanged.
- **Guarded the separator.** The `border-t`/`pt-4` divider is passed as `className` and rendered *inside* the component, so it cannot outlive the bundle — the same class of bug as the empty-bordered-box issue in the earlier session. The `hideWhenInCart` emptiness check also covers the loading state explicitly, so the box never flashes empty between the fetch resolving and the filter applying.
- **Safety check worth recording:** the bundle now lives inside the checkout `<form>`, where a `<button>` without `type="button"` would submit the order. All bundle buttons already were; the dismiss button is too, and the render test now asserts that *every* button the component emits is `type="button"` in both densities.
- Verified: 34 render assertions pass (`/tmp/opencode/render-fbt.cjs`, sucrase + `react-dom/server`); build compiles clean; `/checkout`, `/cart`, `/products/171` all 200; static check confirms the bundle is under the trust stats and outside the `<aside>`. **The interactive transitions — clicking X, and the box disappearing after "Add all" — were not exercised in a browser** (none attached to this session), so those two paths are reasoned + unit-asserted rather than observed.

### Session 2026-09-26 (PDP Ad Box + Catalog Scraper)
- **PDP bundle redesigned into a small ad-slot box.** It previously rendered at `density="comfortable"` as a full-width section between `<ProductTabs />` and `<RelatedProducts />` — a large bordered card with a seed row and 3-up product tiles, which read as a second product grid competing with Related Products. It now renders at `density="compact"` in the right column of the `lg:grid-cols-[1.35fr_0.85fr]` grid, directly under the buy box and **outside** the `lg:sticky lg:top-28` wrapper (so it neither inherits the pinned position nor lengthens the box the buy box must fit in; the buy box's sticky range is now bounded by the whole column, which is longer as a side effect). The seed row is dropped — the product on screen is already the headline above the box.
- **Added `ctaIncludesSeed` to `BundleView`.** Compact mode reports only the add-on delta, because the checkout summary already lists the cart subtotal. On the PDP the button genuinely adds the product on screen too, so the quoted figure has to be the whole bundle — otherwise the box would advertise ৳1,650 and charge ৳3,150. Checkout and cart behaviour is unchanged (both defaults preserve it).
- **Added `count` to `BundleView`** so the loading skeleton draws exactly as many rows as will arrive (2 on the PDP, 3 on cart/checkout) instead of a hardcoded 3, which caused a one-row height jump on the PDP.
- `SURFACE` padding shrank from `p-5 sm:p-8` to `p-4` and `mt-10` to `mt-5` to match the smaller box.
- **Verified by rendering the component for real** (sucrase + `react-dom/server`, no browser needed): 27 assertions across the PDP promo box, the checkout compact rail, the cart comfortable grid, the empty/loading guards, and discounted pricing. All pass. Build clean; `/products/171`, `/cart`, `/checkout` all 200. **The visual result was not eyeballed in a browser** — no browser is attached to this session.
- **Fixed `prisma/fetchCatalog.js`, which was completely broken.** `BASE` was the malformed `https:khanexpressbd.com` (missing `//`), so every request failed; `catalogData.json` was sitting empty. Every category selector was 2inshop-specific and matched **nothing** on khanexpressbd.com, so the scraper produced 0 categories and 0 products even with a valid URL. Rewritten against the real markup: categories come from `div.shop-submenu`, with a navbar-dropdown fallback.
- **Empty categories are skipped before they are fetched.** The site publishes each category's product count in its own menu label (`গ্যাজেট (5)`, `Mango (0)`); those counts were verified exact against 7 real pages (including the zero cases) before being relied on. 23 empty branches are now skipped without a request, and any branch that still comes back empty is dropped from the emitted `categories`.
- **Fixed the root cause of the `sale_price` bug (Pending Decisions, item 1).** The old code set `salePrice = oldPrice` and `unitePrice = currentPrice`, so `sale_price` was always the *higher* number — that is what produced all 61 swapped rows. `normalizePrices()` now only records a discount when `old > current`, with `unite_price` as the original. New fetch: 36 products, 9 categories, 21 genuine discounts, 0 inverted.
- **Also fixed a latent follow-on in the scraper:** list and detail prices were merged field-by-field, so a listing discount could pair with a different detail price and re-create the inversion. The pair is now taken together. It does not fire on the current dataset (0/36 disagreements) — purely defensive.
- Removed stale `2inshop` branding, and the listing loop no longer spends a request on a phantom page 2 (the site has no pagination). `relatedSubs` was scraped via a dead selector and always `[]`; it now carries the product's real sibling subcategories (still an unused field).
- **Noted, not fixed:** only 1 of 19 subcategories has products, and that product is also in its parent's listing, so nothing is ever attributed to a sub and the seeded subcategory taxonomy comes out empty. Separately `seedCatalog.js:90-93` looks `breadcrumbSubName` up in a *name*→slug map while the field holds a *slug*, so the sub path is dead regardless. All 36 products land correctly on their 9 parent categories, 0 unassigned.
- **Noted, not fixed:** `npm run seed` no longer runs `seedCatalog.js` — it is commented out in `prisma/seed.js` (the owner's change, to stop the seed wiping curated product data). `npm run seed-catalog` still runs it directly. `catalogData.json` is gitignored.

### Session 2026-09-26 (Upsell Bundle Implementation)
- Implemented `plan-upsell-bundles.md` in full. Migration `20260926071426_add_product_upsells` adds the `ProductUpsell` model plus two back-relations on `Product` (both cascade, so a deleted product never orphans a link); Prisma client regenerated.
- New `src/lib/recommendations.js`: `getUpsellAddOns()` (curated `sortOrder` first, auto-scoring backfill, reports `source: curated|auto|mixed`) and `getAutoRelated()` (`3×sharedCategories + 2×sharedTags + 1 if price within ±30% + 0.5 if featured`, ties newest-first, then featured/newest backfill). Always excludes seeds, filters out-of-stock, and only returns `status: 'publish'`.
- New public `GET /api/recommendations?ids=&limit=` — ids validated and capped at 20, limit clamped to 1–6, every failure returns an empty list (logged server-side) so it can never break a page render. The project has **no** `error.js` / `global-error.js` boundaries anywhere, so this is a hard constraint.
- Refactored the PDP's inline related-products query onto `getAutoRelated()`; still renders exactly 6 cards with the seed excluded (verified).
- New `src/components/storefront/FrequentlyBoughtTogether.jsx`: default export is cart-driven, named `PdpBundle` export is PDP-driven, `BundleView` is shared. 2 add-ons on PDP, 3 on cart/checkout; one "Add all to cart" CTA that adds only the add-ons; `comfortable` grid and `compact` row densities.
- Added `productToCartItem()` to `src/lib/cartStorage.js` as the single definition of the cart payload, preferring the `isDefault` variant; refactored `TrendingCard` onto it (this also fixes it adding a non-default variant when a product has several).
- **Bug found and fixed during implementation:** the cart and checkout pages read the cart only on mount, so anything added from the bundle would have appeared nowhere and — at checkout — never reached the submitted order. Both now listen for `cart-updated`.
- **Bug found and fixed:** `PdpBundle` wrapped `BundleView` in a card while `BundleView` returns `null` when empty, leaving an empty bordered box on the PDP. The card chrome moved inside the emptiness check via a `surface` prop.
- Bounded the sticky checkout `<aside>` with `lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`; a 3-item bundle plus the summary could otherwise exceed the viewport and push Place Order out of reach.
- Part C shipped too: `upsellIds` through `createProduct`/`updateProduct`, `syncUpsells()` (sanitises self-references, duplicates and unknown ids), `getPublishedProductsLite()`, and the `UpsellPicker` on the admin edit page. Admin is deliberately last so the storefront works with an empty curated table.
- Verified: `npm run build` clean; API exercised over HTTP for auto, curated, mixed, cart-exclusion, self-reference, limit clamping, junk/empty ids and draft exclusion; `syncUpsells` exercised against the live DB for ordering, idempotency, duplicates, self-reference, unknown ids, empty and `undefined`.
- **Third pre-existing bug found:** all 61 seeded products that have a `sale_price` have it *higher* than `unite_price` — the columns are semantically swapped, so the whole storefront renders a strikethrough on a lower price than the one charged. Not fixed (data fix, business call), but new code guards against it via `displayPricing()`. See Pending Decisions.

### Session 2026-09-26 (Upsell Bundle Design)
- Designed cross-sell merchandising for the three highest-intent surfaces (product detail, cart, checkout); **no code written this session**
- Audited the codebase for existing upsell/cross-sell/recommendation logic — confirmed none exists; the PDP's 6-card related grid is the only merchandising surface today
- Wrote `plan-upsell-bundles.md`: Prisma `ProductUpsell` join table, shared `src/lib/recommendations.js` (curated-first, automatic category/tag/price scoring fallback), public `GET /api/recommendations`, and one `FrequentlyBoughtTogether` component serving all three pages
- Refactor target identified: the inline related-products query at `products/[slug]/page.jsx:83-111` and the `{ images, variants }` include copy-pasted across ≥4 files
- Flagged two pre-existing bugs, deliberately **not** fixed here: `ProductInfo.jsx:280` sends `salePrice` identical to `price`; Inside-Dhaka delivery is 80 in `checkout/page.jsx` but 50 in `app/api/checkout/route.js:48`
- Also noted for a separate docs pass: `ai-workflow-rules.md` §5 and the delivery row above both state Inside Dhaka ৳50, which no longer matches `checkout/page.jsx` (see the flagged bug)
- Next: implement Part A (migration + lib + API) and Part B (UI); Part C (admin picker) can follow without storefront changes

### Session 2026-08-21 (Documentation Refresh)
- Audited entire codebase against docs; found docs 7+ weeks stale (still "Cabinet Closet" planning phase)
- Rewrote all 10 docs to reflect actual implementation:
  - `overview.md`: Eghuri identity, current feature set, regional scope
  - `architecture.md`: real folder structure, full route map (~30 API routes), JWT auth flow via `proxy.js`
  - `data-model.md`: all 17 Prisma models verified against schema, migration summary
  - `frontend-architecture.md`: actual components/hooks, localStorage sync events, GTM, SEO implementation
  - `admin-panel.md`: complete admin surface incl. blog CMS, settings pages, device blocking, DB backup
  - `seeding.md`: scraper pipeline (fetchCatalog → processCatalog → seedCatalog) + settings/blog seeds
  - `ai-workflow-rules.md`: corrected conventions (no ShadCN, proxy.js auth, server actions/API split)
  - `ui-context.md`: real brand tokens (#2f0f6b/#435165), Inter font, dark mode strategy
  - `testing.md`: honest current state (no tests) + prioritized recommendations
  - `progress-tracker.md`: statuses updated to reality, decisions log, this entry
- Identified uncommitted Backup DB feature as next commit candidate

### Session 2026-08-26 (Storefront Redesign Kickoff)
- Rewrote `ui-context.md` with new Material Design 3 color palette, Playfair Display + Inter fonts, Material Symbols icons, updated component descriptions
- Updated `progress-tracker.md` with Phase 3 (Storefront UI Redesign), new styling tasks
- Updated `frontend-architecture.md` and `architecture.md` with new font/color references
- Began Phase 3 implementation: tailwind.config.js, globals.css, layout.jsx, AnnouncementBar, Header, Footer

### Session 2026-07-03 (Initial)
- Reviewed and rewrote 3 documentation files: `ai-workflow-rules.md`, `ui-context.md`, `progress-tracker.md`

### Session 2026-07-03 (Development)
- Verified migrations and seed script; reorganized to `(storefront)` route group
- Created Header/Footer components; set up `@` path alias; built home page foundation

### Session 2026-07-03 (Bug Fixes & Feature Completion)
- Fixed duplicate admin routes and broken storefront links
- Built categories, product detail, cart, checkout, thankyou pages
- Created all admin API routes and admin CRUD pages

### Session 2026-07-03 (Storefront Redesign)
- Brand colors (#2f0f6b/#435165) + Inter font applied across storefront and admin
- Redesigned header (hotline bar, search), home, category, product, cart, checkout, footer

### Session 2026-07-03 (Catalog & Seed Update)
- Extracted real catalog (27 products, 5 categories) from reference site
- Added live search API + header search overlay; ran seed successfully

*(Sessions between 2026-07-03 and 2026-08-21 were tracked in git only; see `git log` for storefront v1.0.0, variants, dark mode, mobile-first redesign, SEO, GTM tracking, and WhatsApp ordering milestones.)*
