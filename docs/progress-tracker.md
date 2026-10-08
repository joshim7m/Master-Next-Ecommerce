# Project Progress Tracker

A living document tracking the status of all project tasks for the Eghuri ecommerce application.

**Last Updated:** 2026-10-07 (courier booking: Steadfast booking modal + status sync)

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
| Prisma schema (22 models) | ✅ Done | See `schema.prisma`; documented in `data-model.md` |
| Database migrations | ✅ Done | 4 migrations under `prisma/migrations/` — `20261004123354_init` (consolidated baseline), `20261005122155_add_order_discount`, `20261007051530_add_page_model` (CMS `Page` table), `20261007144130_add_courier_booking` (courier bookings). Earlier `20260924100811_init` / `20260926071426_add_product_upsells` were replaced by the consolidated baseline (**uncommitted**) |
| CourierBooking table | ✅ Done | One booking per order (`orderId @unique`), `provider` + `consignmentId` compound-unique, raw `courierStatus` + `lastSyncedAt` + `lastEventKey` (webhook idempotency); migration `20261007144130_add_courier_booking` |
| ProductUpsell table | ✅ Done | Curated cross-sell links, `20260926071426_add_product_upsells`; both relations cascade |
| Seed pipeline (scraper-based) | ✅ Done | `seed.js` → `seedSettings` + `seedCatalog` + `seedBlog`; see `seeding.md` |
| Catalog scraper (`fetchCatalog.js`) | ✅ Done | Cheerio scraper for eghuri.com → `catalogData.json` |
| Bengali content processing | ✅ Done | `processCatalog.js` EN→BN tags/meta; Bengali blog posts in `seedBlog.js` |
| SiteSetting singleton | ✅ Done | Identity, contact, announcement, Telegram/GTM/WhatsApp config |
| BlockedDevice table | ✅ Done | Fraud blocklist keyed by FingerprintJS hash |

---

## Plans

| Plan | Status | Summary |
|------|--------|---------|
| `plan-dashboard-analytics.md` | Implemented | `/admin/dashboard`: "Orders by Day & Hour" floating-bar heat map (X = Sat…Fri current week, Y = clock time), Product of the Month, four linked stat cards |
| `plan-sales-report.md` | Implemented | Date-filtered order report + courier XLSX export |
| `plan-upsell-bundles.md` | Implemented | "Frequently Bought Together" cross-sell blocks |
| `plan-site-settings-dynamic.md` | Implemented | Site settings driving layouts/SEO/footer |
| `plan-invoice-download.md` | Implemented | Per-order Bangla invoice: browser-print (vector, zero-dep) + `html2canvas`/`jspdf` one-click download; Hind Siliguri; logo/company info from Site Setting |
| `product-description-specification.md` | Implemented | Tiptap rich-text product descriptions |
| `catalog-import-export.md` | Implemented | Five-CSV slug-keyed catalog archive round-trip |
| `plan-courier-booking.md` | Implemented | Multi-courier booking: "Courier Booking" button + modal on `/admin/orders/[orderNo]` with a **Select Courier** dropdown (Steadfast · Pathao · REDX; Steadfast implemented first, others disabled pending credentials), `CourierBooking` table with `provider`, provider-routed webhooks + manual status sync mapped two-way onto `orderStatus` |

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
| Static pages (about/contact/privacy/terms) | ✅ Done | Hardcoded prose pages |
| CMS pages (`/pages/[slug]`) | ✅ Done | Editable from admin; only published pages render (drafts 404), metadata/OG/canonical generated |
| 404 page | ✅ Done | Custom `not-found.jsx` |
| Loading skeletons | ✅ Done | `loading.js` on home/products/categories routes |

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| Header | ✅ Done | Live search autocomplete, dark toggle, wishlist/cart icons, **Collections mega-menu** — **redesign in progress** |
| Footer | ✅ Done | Social links, company links from admin-managed Pages, Bangladesh branding — **redesign in progress** |
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
| Category mega-menu | ✅ Done | `CategoryMegaMenu.jsx` on the Collections nav trigger — one column per parent category with its subcategories. Tree built server-side by `buildCategoryTreeForMenu()` (`src/lib/categoryTree.js`). Desktop only (`lg+`); mobile uses the drawer |
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
| Dashboard (stats + chart) | ✅ Done | 4 linked stat cards, Orders by Day & Hour (floating-bar heat map, X = weekday / Y = clock time, BD time), Product of the Month |
| Products CRUD with variants | ✅ Done | Variant generator, image diffing on update |
| Product description + specification rich text | ✅ Done | TipTap v3 editors in collapsible `RichEditorSection`s; HTML stored in `Product.description` / `Product.specification`, rendered on the storefront Description/Specifications tabs. See `product-description-specification.md` |
| Multi-image upload | ✅ Done | `/api/admin/upload`, type whitelist, 5MB max |
| Categories CRUD (hierarchical) | ✅ Done | Parent/child management |
| Orders list/detail/search | ✅ Done | Status updates, item qty editing, totals recompute |
| Order discount (flat ৳ amount) | ✅ Done | `OrderDetails.discount`; editable on the detail page while not completed/cancelled; capped at `subtotal + delivery` |
| Order invoice download (Bangla PDF) | ✅ Done | `/admin/orders/[orderNo]/invoice` — bare A4 sheet from `InvoiceDocument`, Hind Siliguri, logo/company from Site Setting. Two output paths: **Print** (vector, selectable text) and **Download PDF** (`html2canvas`→`jspdf` raster, dynamic imports only) |
| Courier booking + status sync | ✅ Done | "Courier Booking" button + modal on `/admin/orders/[orderNo]`: Select Courier dropdown (Steadfast · Pathao · REDX, latter two disabled pending credentials), prefilled booking form, booking info panel, Sync button, tracking timeline. Webhook `POST /api/webhooks/courier/[provider]` (HMAC-SHA256 + Bearer, fail-closed, idempotent). Two-way status map with guards in `src/lib/courierStatus.js`. See `plan-courier-booking.md` |
| Device blocking/unblocking | ✅ Done | `BlockedDevice` + checkout rejection |
| Blog categories/posts/advertisements CRUD | ✅ Done | Tiptap editor, ad linking multiselect |
| Settings: site identity | ✅ Done | Name, logo, favicon, contact, announcement, about (EN/BN) |
| Settings: site-config integrations | ✅ Done | Telegram token/chat (+test), GTM ID, WhatsApp number |
| Settings: hero sliders CRUD | ✅ Done | |
| Settings: pages CRUD (CMS) | ✅ Done | Name, slug (unique), Tiptap content, meta description, publish/draft; storefront `/pages/[slug]` renders published pages |
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
| `POST /api/webhooks/courier/[provider]` | ✅ Done | Public, signature-verified (Steadfast: `Authorization: Bearer` + `X-Signature` HMAC-SHA256 over raw body, fail-closed without a stored webhook token); `pathao`/`redx` acknowledged-but-unimplemented; applies the §6.1 status map through the same guarded code path as the manual Sync button |

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
| Environment variables | ✅ Done | `.env` holds only DATABASE_URL/JWT_SECRET — courier credentials live in the DB (Settings → Courier Services), removed from `.env` permanently |
| SEO infrastructure | ✅ Done | Sitemap, robots, OG images, JSON-LD |
| CI/CD (GitHub Actions) | ❌ Not Started | Lint/build/test pipeline |
| Monitoring & error tracking | ❌ Not Started | GTM analytics only; no error tracking yet |
| Security review | ⏳ Partial | JWT guard + fraud checks done; formal review pending |

---

## Documentation

| Task | Status | Notes |
|------|--------|-------|
| All 10 docs refreshed to match codebase | ✅ Done | Session 2026-08-21: overview, architecture, data-model, frontend-architecture, admin-panel, seeding, ai-workflow-rules, ui-context, testing, progress-tracker |
| Order invoice plan documented before implementation | ✅ Done | `plan-invoice-download.md` (2026-10-05) — records *why* pure-JS PDF libraries cannot render Bangla, so the constraint is not re-litigated later |

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

1. **Add an auth guard to `/api/admin/*`** — the proxy matcher only covers `/admin/:path*`, so every admin API route is currently self-unguarded (flagged in `plan-invoice-download.md` §7)
2. **Investigate order 958970's stored `total`** — 2050, but `subtotal + delivery` derives to 2080. Predates the discount work; some earlier path wrote `total` without recalculating
3. Point `SiteSetting.logo` at a file that exists — it resolves to `/uploads/settings/eghuri-logo.png`, which 404s (the invoice falls back to the site name, but so does the storefront header and admin sidebar)
4. Apply `font-bangla` to Bangla content outside the invoice, so storefront/admin Bangla stops relying on OS fallback fonts
5. Complete storefront redesign — Header, Footer, config (Phase 3, current)
6. Homepage section redesign — Hero, categories, product grid, promo banner (Phase 3)
7. Payment gateway integration (Phase 4)
8. Set up test framework + CI pipeline
9. Customer accounts & order history

---

## Legend

- ✅ **Done:** Task completed and verified
- ⏳ **In Progress / Partial:** Being worked on or incomplete
- ⚠️ **Built, disabled:** Implemented but turned off
- ❌ **Not Started:** Ready to begin

---

## Session Log

### 2026-10-07 — Courier Booking (Steadfast first, Pathao/REDX stubs) + Status Sync
- **Implemented `plan-courier-booking.md` in full.** Admin opens `/admin/orders/[orderNo]` → **Courier Booking** button → modal with a **Select Courier** dropdown (Steadfast · Pathao Courier · REDX Delivery; Pathao/REDX disabled with "credentials pending"), a booking form prefilled from `order.details` (name/phone/address/COD/items summary), and — once booked — a booking info panel (consignment, tracking code/link, badges, last synced), **Sync status** button and tracking timeline. The order page also gains a **Courier** summary card when a booking exists.
- **Provider abstraction:** `src/lib/couriers/{index,errors,steadfast,pathao,redx}.js` — registry (`COURIERS`, availability from the stored CourierService rows) + 4-method adapter interface (`createOrder`, `statusByConsignment`, `trackings`, `healthCheck`). Enabling Pathao/REDX later = their adapter + their status-map row + their webhook signature branch + their credentials saved in Settings; UI needs no change. Steadfast adapter verified live (`get_balance` → ৳0, 401/no-retry, host-down, bogus-id paths all tested).
- **Schema:** `CourierBooking` model (one per order via `orderId @unique`; `@@unique([provider, consignmentId])`; raw `courierStatus`, `lastSyncedAt`, `lastEventKey`) + `Order.courierBooking` back-relation; migration `20261007144130_add_courier_booking` created & applied.
- **Status sync is guarded both ways** (`src/lib/courierStatus.js`, shared by webhook + manual Sync via `src/lib/courierSync.js#applyCourierStatus`): `incomplete` never touched; into an admin-set terminal state only `completed`/`return` may move it (a stray courier `pending` can't resurrect a cancelled order, a `cancelled` can't overwrite a completed one); `processing` is admin-owned (couriers may only complete/cancel/return it); approval-pending tiers update the badge only; unknown provider/status → no change + `unrecognized` flag.
- **Webhook** `app/api/webhooks/courier/[provider]/route.js`: raw-body HMAC-SHA256 `X-Signature` + `Bearer` token, **fail-closed** when no webhook token is stored, `Idempotency-Key` replay protection stored on the booking (checked against the DB, not a possibly-stale object — a test caught exactly that), 2xx for anything merely unknown (4xx would stop Steadfast's retries), 5xx only for genuine handler failures (worth a retry).
- **Secrets:** courier keys are DB-only — saved from Settings → Courier Services, never in `.env` or the client bundle (grepped `.next/static`: no key, no secret, not even `portal.packzy.com`).
- **Credential source change (2026-10-08):** removed `.env` credentials entirely — `src/lib/couriers/credentials.js` now resolves from the `CourierService` row only; `.env` holds just DATABASE_URL/JWT_SECRET. Admin UI (create/edit) is the single place to manage keys.
- **Verified:** 43 unit/integration tests (mapping guards, registry enablement, adapter error paths, full `applyCourierStatus` lifecycle on real DB rows) + 10 signed-webhook end-to-end tests against `next start` (delivered→completed, idempotent replay, tampered/missing/wrong-token signature→401, guard on `cancelled` after `delivered`, `tracking_update`, unknown consignment/event/JSON) — all pass, temp rows purged. `npm run build` clean; test scaffolding kept outside the repo in `/tmp/opencode/courier-test/`.
- **Owner still needs to (plan §10):** complete Steadfast KYC/ownership (booking currently 403s), register the webhook at `steadfast.com.bd/user/webhook/add` with the Webhook Token saved in Settings → Courier Services (localhost can't receive webhooks — Sync button covers dev), and click through the modal UI checklist in plan §9.

### 2026-10-07 — SEO "Unentered Content" Sweep (no hardcoded marketing in render output)
- **Complaint:** view-source showed `<title>Chahida Ghor — Shop Lingerie, Bras, Panties & Nightwear Online in Bangladesh</title>`, a long "Discover Chahida Ghor — Bangladesh's favourite online destination…" description, and `<meta name="keywords" content="ELectoric Items"/>` — none of which was entered in the admin. Confirmed the DB is a **general store** (fridge locks, repellent, baby care…) and is **not** a lingerie store, so the copy was both unentered and factually wrong.
- **Root causes:** homepage `app/(storefront)/(home)/page.jsx` hardcoded the title/description/OG; both layouts fell back to "…Online Lingerie & Women's Intimates Store in Bangladesh" + a 12-keyword default array; `SiteSetting.metaKeywords` contained seeded junk `"ELectoric Items"`; the OG route's fallback subtitle and bottom bar had marketing copy; JSON-LD (Organization, ItemList, CollectionPage, Blog) had hardcoded "lingerie/intimates" descriptions.
- **Policy applied (aligned with `docs/seo.md` "no hardcoded brand in render output"):** titles compose `{page} | {siteName}` from admin values only; descriptions and keywords are emitted **only when the admin entered them** (new `seoDescription`/`seoKeywords` helpers in `src/lib/siteSettings.js`); everything else omitted or siteName-derived.
- **Files changed:** `src/lib/siteSettings.js` (helpers) · `app/layout.jsx` · `app/(storefront)/layout.jsx` (also stripped hardcoded Organization description) · `app/(storefront)/(home)/page.jsx` (metadata + ItemList name + PromoBanner trust chips/copy) · categories listing + detail · blogs listing + category + categories · about (metadata + neutral fallback text) · products + products/[slug] (dropped hardcoded keyword array + invented description) · new-arrivals/hot-sales (dropped marketing descriptions) · `app/api/og/route.js` (neutral subtitle + bottom-bar tagline) · admin SEO/promo/tags placeholders · `docs/seo.md` (policy + templates).
- **DB:** cleared `metaKeywords` (`"ELectoric Items"` → `""`); deleted 2 seeded hero slides + 3 `@eghuri` social links; blanked `aboutCompany`/`aboutCompanyBn`, `copyrightText`, `email`, `mobile`, `announcementText`. Homepage hero now falls back to real product images; footer renders `© {currentYear} Chahida Ghor` (already supported fallback) and hides empty contact/social rows.
- **Verified over HTTP:** all storefront routes have **0** marketing-copy matches (`lingerie|intimat|eghuri|picsum|ELectoric|discreet|…`); homepage head = `<title>Chahida Ghor</title>` with description/keywords/og:description absent (nothing admin-entered, nothing invented); remaining pages `{page} | Chahida Ghor`. OG route returns 200 image/png.
- **Still to review (awaiting user):** `siteUrl` is null + `NEXT_PUBLIC_SITE_URL` unset → canonical/og:url still point at placeholder `https://radiantpicks.com` — needs the real domain (Admin → Site Config or .env); `address: "Dhaka, Bangladesh"` kept (generic/true).
- **Not browser-verified** (no desktop browser attached).

### 2026-10-07 — Storefront Page (`/pages/[slug]`) Redesigned to Site Container
- **The CMS page detail was the odd one out.** `/pages/[slug]` was written against the pre-redesign slate palette (`text-slate-900`, `px-2 … lg:px-8`, inline SVG chevrons) — the same stale shell as the hardcoded `/privacy` `/terms` — while the rest of the storefront is on the Material-3 token system. Requested: mobile-first, and the same container box the other pages use.
- **Canonical container adopted:** the site's standard card — `rounded-2xl border border-border bg-white shadow-ambient dark:border-dark-border dark:bg-dark-card` — inside the `max-w-4xl px-page-margin-mobile sm:px-4` shell (8px mobile gutter token first, so the layout is mobile-first by construction).
- **Structure follows feedback:** originally the blog-style breadcrumb bar + a header zone with a "Last updated" line were included; on request both were removed. The page is now just the container card: `font-display text-headline-md sm:text-headline-lg` title in a divided header zone, then the prose body using the blog's exact prose classes (`prose-headings:text-on-surface prose-a:text-primary … dark:prose-invert dark:prose-headings:text-dark-text`).
- **Verified over HTTP** (`/pages/privacy-policy` → 200): container card, `dark:bg-dark-card`, token headline, and prose classes all present; **0** breadcrumb/`chevron_right` markers and **0** "Last updated"/`update`-icon markers; no stale slate classes (`text-slate-900` / `text-slate-500` / `px-2 py-12`); real page content (`<h2>`s) renders inside the box. **Not browser-verified** — no desktop browser attached.

### 2026-10-07 — Storefront Footer: Company Links Driven by Admin Pages
- **The footer's Company column was four hardcoded links** — `About Us` `/about`, `Contact Us` `/contact`, `Privacy Policy` `/privacy`, `Terms of Service` `/terms`. Requested: remove them and link the admin-managed Pages instead.
- **`Footer` is a client component fed by the server layout**, so the layout (`app/(storefront)/layout.jsx`) now fetches published pages in its existing `Promise.all` (`prisma.page.findMany({ where: { status: 'publish' }, select: { id, name, slug }, orderBy: { name: 'asc' } })`, `.catch(() => [])`) and passes `pages` to `<Footer>`. The Company column renders one `<Link href={/pages/${page.slug}}>` per page; drafts are excluded, and nothing renders when there are no published pages.
- **Verified over HTTP against the live DB**: seeded one published + one draft page — the homepage footer rendered `Privacy Policy → /pages/privacy-policy` (a page created from the admin since the CMS work) plus the published fixture, the draft was absent, and zero `/about | /contact | /privacy | /terms` anchors remained. Fixtures deleted; only the real Privacy Policy row remains. Homepage 200 (layout + footer compiled). **Not browser-verified** — no desktop browser attached.
- **Follow-up flagged**: the hardcoded `/about`, `/contact`, `/privacy`, `/terms` routes and the sitemap entries for them still exist — removing them (and pointing customers at `/pages/…`) is a separate call. Until matching CMS pages are created, the footer Company column only lists what exists, so on a fresh DB it is empty by design.

### 2026-10-07 — Admin Settings: Editable Pages (CMS)
- **The sidebar's "Pages" entry was a dead link.** `AdminSidebar` already listed `{ label: 'Pages', href: '/admin/settings/pages', icon: 'pages' }`, but no route existed and `pages` was missing from both `ICON_PATHS` and `iconColors` — so the nav item rendered with a **null icon**. The requested feature: create pages like **Privacy Policy** with a name, a slug, and rich-text content.
- **New `Page` model** (`prisma/schema.prisma`) — `name`, `slug @unique`, `content` (Tiptap HTML), `metaDescription?` (SEO), `status` default `"publish"`, timestamps. Migration `20261007051530_add_page_model` created and applied; Client regenerated. Default status is `publish` (not the blog's `draft`), because these are mostly legal pages an admin creates once and leaves live — a new page that silently 404s on the storefront would be the trap.
- **Server actions** (`src/actions/pages.js`, `'use server'`, mirrors `blog.js`): `getPages`, `getPageBySlug`, `createPage`, `updatePage`, `deletePage`. Slug is trimmed + lowercased; mutations `revalidatePath` the admin list and `/pages/[slug]` (plus the old slug path when it changes). Duplicate-slug `P2002` is surfaced to the form as a readable inline error instead of the blog pattern's silent `catch {}` — with page counts this small, a slug collision is the most likely failure and should not fail invisibly.
- **Admin UI at `/admin/settings/pages`** (`page.jsx` list, `create/page.jsx`, `edit/[slug]/page.jsx`) following the blog CRUD pattern: searchable/filterable table with Status badge, updated date, and view/edit/delete actions; create/edit forms use the shared `TipTapEditor`. Added header titles for the three routes in `app/admin/layout.jsx`. Added the `pages` icon (document glyph) + a yellow colour chip to the sidebar so the previously icon-less entry renders properly.
- **Storefront rendering at `/pages/[slug]`** — new server component (cached `getPublishedPage`): only `status: 'publish'` pages render, drafts and unknown slugs `notFound()`; `generateMetadata` emits absolute title, description (from `metaDescription` or stripped content), canonical, and OG tags. Content is rendered in the same `prose` wrapper the hardcoded privacy/terms pages use. The existing hardcoded `/privacy`, `/terms`, `/about` routes are untouched.
- **Verified against live Postgres** (real `@prisma/client`, `node --env-file`): create → storefront-lookup → draft-hidden → update → unique-slug-enforced → delete, all 7 checks pass; fixture rows cleaned up. `npm run build` clean (dev server stopped for the build and restarted after). **Not browser-verified** — no desktop browser attached to this session, so the admin forms and `/pages/[slug]` rendering were not clicked through on screen; the Tiptap editor remains verified only at the API/DB level (same caveat as prior sessions).
- Docs updated: `data-model.md` (Page model + missing `PromoBanner` documented so the 21-model count is honest; migration history), `admin-panel.md` (routes table + Content Pages section), `progress-tracker.md` (this entry, migrations row, admin + storefront rows).
- Follow-ups left alone: footer/sitemap still point at the hardcoded `/privacy` `/terms` (a page uploaded as `privacy-policy` is only reachable at `/pages/privacy-policy`); the `/pages` index route does not exist, so the breadcrumb links Home → page name only.

### 2026-10-07 — Dashboard Chart: Saturday-first Week
- **Requested: "the chart's date should start from Sat, Sun, Mon".** The x axis used to follow the trailing window `[today − 6d, now]`, so on a Wednesday it read `Thu, Fri, Sat, Sun, Mon, Tue, Wed`. The product owner wants the Bangladesh week layout — Monday-to-Friday work week with Saturday-Friday weekend — so the seven columns are now **always Sat → Fri**.
- **Asked the owner how to keep both "start at Sat" and "today on screen", because they cannot both be true on every weekday.** With a trailing 7-day window the starts rotate with today's weekday; with a fixed Sat-start week, days after today are necessarily future. The owner chose the **current Sat→Fri calendar week containing today**: `start = 00:00 BD on the most recent Saturday on-or-before today`, `end = 00:00 BD next Saturday`, so today is always present (partial after 12 AM) and the remaining days of the week show as empty columns until they arrive. On a non-Friday the window no longer coincides with a rolling 7-day span, so the caption changed from "last 7 days" to "this week" / the badge from "{n} last 7 days" to "{n} this week" — anything else would be a lie about what the columns are.
- **Weekday order became a by-product of the window instead of a label mapping.** `daysSinceSaturday = (bdParts(now).weekday + 1) % 7` (Sun=0…Sat=6 → Sat=0…Fri=6) walks from this week's Saturday, and the label-array builder walks the same start date, so Sat…Fri falls out of the geometry with no re-sorting on the client. All timezone arithmetic stayed in the existing `bdParts`/`bdMidnightUtc` BD-offset helpers; the query now bounds `createdAt` by the whole week (`gte start, lt end`) rather than `lte now`, which keeps the query's meaning identical to the columns shown.
- **Verified against the live DB.** `getOrdersByHourLast7Days` (real module, `next/cache` stubbed, sucrase): returns `Sat 10-03, Sun 04, Mon 05, Tue 06, Wed 07, Thu 08, Fri 09` — Sat-first, contains today, 7 × 16 = 112 buckets still present (8…23), `total` unchanged (7 orders: Mon 2, Tue 5). And component-level through sucrase + `react-dom/server` with `react-chartjs-2` captured: labels `Sat..Fri`, 112 floating blocks `[hour, hour+1]`, y min/max 8/24 with 17 ticks `8 AM…12 AM`, both tooltip callbacks, plus a real Chart.js instance over a stub 2d context (animation off, fixed size): y pixels shrink with later hours, the Mon 4 PM block (`y:[16,17]`) maps exactly to the 16→17 pixel interval, and all three Mon blocks share one column centre. 20/20 checks pass.
- `npm run build` clean. **Not browser-verified** — no desktop browser attached to this session (same caveat as the initial chart work).
- Docs updated: `plan-dashboard-analytics.md` (§1, §9, §11, §18, §28, status), `progress-tracker.md` (this entry + Plans row).

### 2026-10-06 — Dashboard Analytics ("Orders by Day & Hour")
- **The chart was measuring the wrong thing, and a second bug meant it may never have drawn at all.** Two separate defects, found by inspection before any edit, exactly as `plan-dashboard-analytics.md` §26 requires.
- **Defect 1 — the axes were swapped in meaning.** The old `HourlyOrdersChart` used `indexAxis: 'x'`, put the seven weekday names on the x axis (correct), but then made **order count the vertical scale** and encoded the *hour* only as one of **sixteen separate datasets** told apart by a sixteen-entry colour legend. So the left axis read 0/1/2/3 orders, and "what time was this order placed" required matching a colour. Rewritten as a single dataset of **floating bars**: `{x: 'Mon', y: [15, 16], count: n}` — X = weekday category, Y = clock time on a linear axis fixed to `min: 8, max: 24`, `stepSize: 1`, not reversed. All 16 blocks of a day share one category label, so Chart.js gives them one x centre and they stack down the hour range, which is what makes a day read as a single column. `BarController.parseObjectData` + `isFloatBar` in `chart.js` handle `[start, end]` y values; verified in the installed 4.5.1 source before relying on it.
- **Defect 2 — `BarController` was never registered**, so `new Chart(..., {type: 'bar'})` threw `"bar" is not a registered controller` and the card rendered blank. `react-chartjs-2` registers nothing for you and chart.js is imported from its tree-shaken ESM build, so nothing was auto-registered either. Found by loading the real component headlessly and constructing the chart over a stub 2d context — reading the code had not surfaced it. One-line fix.
- **Volume is now colour only, never geometry.** Bar height is always exactly one hour, so a 1-order 3 PM block and a 5-order 3 PM block occupy the same 15→16 slot; only alpha changes (`0` → faint grid slot, `>0` → `0.3 + 0.7 × count/maxCount` on the existing `#2f0f6b`/`#a78bfa` admin accent). A tool or a dataset plugin was not added; the repo has no test framework and no charting convention beyond Chart.js.
- **The seven-day window now includes today.** It previously ran `[today-7d, today-midnight)`, i.e. seven *complete* days, so everything ordered today was silently absent from a live dashboard — on the day this was checked, 2 of the 4 orders in the database (both placed that morning) were invisible. Now `[today-6d at 00:00 BD, now]`. The caption stays "last 7 days (Bangladesh time)", which is accurate; the last column is partial after 12 AM and that is intentional.
- **All timezone and label work stayed server-side.** Added `bdDateKey()` beside the existing `bdParts`/`bdMidnightUtc`, and the action now also returns `weekday`, `dateLabel` and a **17-entry `hourLabels` boundary array** (`8 AM`…`12 AM`). The client formats nothing: the y-axis tick callback and the tooltip range both read that one array, which is why the tooltip says "3 PM – 4 PM" and not the plan's illustrative "3:00 PM – 4:00 PM" — §8's axis format is the mandatory one and a second formatter is the duplication §13 warns about. Buckets are `{hour, count}` objects (plan §3), 7 × 16 = 112 of them, pre-filled with zeros; the total excludes orders outside 08:00–23:59 rather than folding them into a neighbour.
- **No schema change, no migration, no new dependencies** — Chart.js 4.5.1 and react-chartjs-2 5.3.1 were already installed. `/admin/orders?status=pending` already worked (the page reads the param and validates it against `orderStatuses`), so `app/admin/orders/page.jsx` was left alone, as were the stat cards and Product of the Month, which already matched §20–§22.
- **Verified by driving the real code, not by reading it.** (1) The actual `getOrdersByHourLast7Days` against live Postgres, with throwaway orders at 15:20/15:45/15:59, 16:00, 23:59, 07:30, 02:00, an `incomplete`, a `cancelled`, one 8 days old, and one placed today: 3 orders in the 3 PM bucket, the 16:00 boundary in 4 PM, 07:30 and 02:00 absent (and *not* folded into 8 AM), incomplete excluded, cancelled counted, and `total` equal to an independent DB count. (2) The real component loaded through sucrase, its `options`/`data` handed to a genuine Chart.js instance over a stub context, then asserted on pixel geometry: y min 8 / max 24, 17 ticks `8 AM`…`12 AM`, 7 weekday ticks, every block's pixels round-tripping to its own hour interval, all 16 blocks of a day sharing one x centre, later hours drawn higher, and alpha monotonic in count — in both themes and at 360×460. All fixtures deleted; the table is back to its exact 4 orders.
- **Not browser-verified** — no desktop browser is attached to this session. Hover, the tooltip's on-screen placement, and the mobile layout are asserted at the geometry and config level, not observed on screen. No lint script exists in this repo; `npm run build` is clean.
- Docs updated: `progress-tracker.md` (this entry, Plans row, Dashboard row). `plan-dashboard-analytics.md` left as the written plan, since it documents the requirement rather than the result.

### 2026-10-05 — Order Discount (Flat ৳ Amount)
- **Added a per-order discount to the admin order detail page: a flat Taka amount, not a percentage.** Requested as "enter 10 taka, not 10%". Stored as `OrderDetails.discount` (Decimal, default `0`) — beside `deliveryCharge`, since that is the other admin-editable money field on the same record. Migration `20261005122155_add_order_discount`, created **and applied** with `prisma migrate dev`; `prisma migrate status` reports the DB in sync and the Client was regenerated. Existing orders get `discount = 0` and their stored `total` was left untouched.
- **`Order.total` is derived, so it had to be derived in exactly one place.** Three separate call sites each recomputed `subtotal + deliveryCharge` inline, and a discount silently would have been dropped by two of them the next time an admin edited a quantity. Replaced with `recalculateOrderTotal(orderId)` in `src/actions/orders.js`, called from `updateOrderItemQuantity`, `deleteOrderItem`, and `updateOrderDetails`. A side benefit: `deleteOrderItem` used to compute the remaining subtotal from its pre-delete `include` and `updateOrderItemQuantity` re-read the whole order graph — both now just refetch what they need.
- **The total can never go negative.** A discount is validated as a finite, non-negative number and then **capped server-side at `subtotal + deliveryCharge`** — the clamp is in the action, not only in the UI, because server actions are callable directly. The UI warns before saving when the entered amount exceeds that ceiling, and re-reads the saved value afterwards so a capped save shows what was actually stored rather than what was typed.
- **Verified against the live DB** by driving the real action module with `next/cache` stubbed: discount `10` applied, total recalculated to `subtotal + delivery − 10`; a subsequent quantity bump kept the discount and moved the total correctly (the bug that motivated the shared helper); an over-limit request stored the capped value, not the raw one. Order 958970 was restored to `discount = 0` afterwards. `npm run build` clean.
- **Not browser-verified** — no desktop browser is attached to this session, so the new field was not clicked through on screen. The action-level test above is the substitute, not a replacement.
- No new dependencies. Docs updated: `data-model.md` (new field + an explicit "Order total is derived" section), `progress-tracker.md` (this entry, migration list corrected — it still named two migrations that no longer exist on disk).

### 2026-10-05 — Invoice Download (Design + Plan)
- **Designed the Bangla invoice and wrote `plan-invoice-download.md` before writing any code**, because the obvious approach cannot work and finding that out after building would have wasted the work.
- **Bengali cannot be rendered by any pure-JS PDF writer.** It needs real text shaping — conjuncts (ক্ষ, র্ম, ণ্ড), reph, and pre-base `ে`/`ৈ` reordering. `jspdf`, `pdf-lib`/`@react-pdf`, and `pdfmake` all embed a TTF and then emit glyphs in logical order with no shaping, so the output is visibly broken. Only the browser (print engine / canvas) or headless Chrome shapes it correctly. That single constraint rules out the most obvious "just add jsPDF" design.
- **No PDF infrastructure existed to reuse** — no PDF library in `package.json`, no `window.print()`, and **zero** `@media print` in the repo. The `src/lib/xlsx.js` hand-rolled-writer precedent set the house style for file generation.
- **Chose to ship both output paths** rather than pick one: a print route (zero deps, vector text, selectable, tiny file) and a `html2canvas` + `jspdf` one-click download (raster, ~150 DPI, not selectable). The second is the only place new dependencies appear (2 packages), and its quality ceiling is documented rather than glossed over.
- **Verified the font facts instead of assuming them:** fetched the Google Fonts CSS API and confirmed Hind Siliguri ships its Bengali subset as a single 66 KB variable woff2 covering all four weights, with a `unicode-range` that leaves Latin falling through to Inter. The owner named "Bangla Sans" or Hind Siliguri — "Bangla Sans" is not a Google Fonts family, so Hind Siliguri is the nearest real match (`Baloo Da 2` was the runner-up and is too rounded for an invoice).
- **Auth note that shaped the route choice:** the proxy matcher is `/admin/:path*` only, so `/api/admin/*` is **self-unguarded** — and invoices carry customer name, phone and address. Putting the invoice under `/admin/orders/[orderNo]/invoice` gets it guarded by the existing matcher for free. The unguarded `app/api/admin/settings/site/route.js` is flagged in the plan as a separate fix.
- Docs updated: `plan-invoice-download.md` (new), `progress-tracker.md` (this entry + a Not Started row under Admin Panel Development).

### 2026-10-05 — Invoice Download (Implementation)
- **Shipped the plan as written.** `src/components/admin/InvoiceDocument.jsx` (server, presentational A4 sheet), `app/admin/orders/[orderNo]/invoice/page.jsx` (server route), `InvoiceActions.jsx` (toolbar), `src/lib/invoicePdf.js` (raster capture). Added `Hind Siliguri` to the root font link and a `bangla` token in `tailwind.config.js` — deliberately *not* folded into `sans`, so the existing storefront stacks cannot shift.
- **Two output paths, because they trade off differently.** Print gives vector, selectable text. Download PDF gives a file. The raster cost is stated in the UI itself ("The downloaded PDF is an image of this page") and in `invoicePdf.js`'s header comment rather than left for someone to discover.
- **The invoice renders bare — no sidebar, no header.** Added an `isBare` branch to `app/admin/layout.jsx` (folding in the existing `isLogin` case) instead of hiding chrome with print CSS. Hiding it would still have left the chrome in the captured raster, bloating the PDF with the admin UI.
- **`html2canvas`/`jspdf` are dynamically imported inside the handler.** Confirmed by grepping the built output: neither the order detail page nor the storefront references the invoice chunk, and the PDF libraries do not appear in any eager chunk. The dependency cost is confined to the one page that needs it.
- **The print CSS is scoped to invoice classes** (`.invoice-sheet`, `.invoice-row`, `.invoice-table`, `.no-print`) rather than using bare element selectors — the repo had zero `@media print` rules, and unscoped ones would silently change behaviour anywhere they were added later.
- **The stored logo is dead, and that mattered more than expected.** `SiteSetting.logo` points at `/uploads/settings/eghuri-logo.png`, which 404s — nothing by that name is on disk. Harmless on screen, but a broken-image box on a printed document handed to a customer is not. The route now `stat`s the file and drops the logo when it is missing, falling back to the site name; absolute URLs are passed through unverified. Same stale value also breaks the storefront header and admin sidebar — flagged in Next Steps rather than silently fixed, since which of the 12 uploaded files is the real logo is the owner's call.
- **Verified by rendering real pages, not by reading code.** Seeded three throwaway orders (cancelled-with-discount, 46-item long order for multi-page, zero-discount free-delivery), fetched each invoice over HTTP as an authenticated admin, and asserted on the server-rendered HTML: Bangla labels intact, watermark present only when cancelled, discount row present only when `discount > 0`, 46/46 rows, no `jwtSecret`/`telegramBotToken`/`telegramChatId` in any response, no stale logo. Scratch orders and the temporary QA user were deleted afterwards; orders 958970 and 572979 confirmed back at their exact prior state.
- **Confirmed the auth path holds.** Unauthenticated request to `/admin/orders/958970/invoice` 307s to the login page — the proxy matcher covers it because the route lives under `/admin`, not `/api/admin`. Unknown order number 404s via `notFound()`.
- **Two bugs found and fixed during the build.** First, `isInvoice` was referenced before its `const` declaration in `app/admin/layout.jsx` — a TDZ error that only surfaced as `ReferenceError: Cannot access 'l' before initialization` during prerender. Second, the `Suspense` boundary that `useSearchParams` requires was wrapping the whole page with `fallback={null}`, which would have left the sheet out of the server-rendered HTML; it is now scoped to the toolbar alone.
- **Three of my own test assertions were wrong, not the code.** React splits adjacent text nodes with `<!-- -->` comments, so `−৳250` is `−<!-- -->৳250` in the markup — the checks were matching the wrong thing until I normalised the comment markers. Worth recording because the same trap will catch the next person writing HTML assertions against a React-rendered page.
- `npm run build` clean. **Still not browser-verified** — no desktop browser is attached to this session, so the printed output and the generated PDF have not been seen on screen. HTML, CSS, and HTTP behaviour are verified; visual fidelity is not.

### Session 2026-10-04 (Wishlist Count Badge Fixed)
- **The header's heart badge reported 13 while `/wishlist` rendered 4.** The two surfaces read different sources: the badge counted `loadWishlist().length` (raw stored IDs), while the page counted `products.length` from `POST /api/wishlist`, which filters `id IN (…) AND status = 'publish'`. Nine stored IDs pointed at products that no longer exist, so they were counted but could never render. Duplicates were ruled out — `toggleWishlist` uses `indexOf`/`splice`, and `wishlistStorage.js` is the only writer of the key.
- **Fixed at the source, not patched at the badge.** `POST /api/wishlist` now returns `missingIds` alongside `products`, and a new `pruneWishlist()` in `wishlistStorage.js` drops them and notifies. The stored list therefore **self-heals**: the badge counts what the page renders because both derive from the same resolved set, and dead IDs are removed rather than accumulating forever. Both the Header and the wishlist page prune, so the list is healed whether or not the page is visited.
- **`pruneWishlist` only writes when something was actually dropped.** It is called on every hydrate, and the second pass has nothing to remove — notifying unconditionally would make each listener re-fetch for no reason. Verified idempotent (repeat prune fires 0 events) and that `prune([])` / `prune(undefined)` are silent no-ops.
- **The wishlist page no longer paginates.** `ProductGrid` defaulted to `pageSize = 10`, so a saved list longer than 10 would hide items behind "Load More" while the badge counted all of them — the same class of disagreement, one step removed. A saved list is small and personal, so it now renders in full. Also removed a dead `productIds` state that was written and never read.
- **The badge resolves asynchronously, so it is 0 until the fetch lands.** That is honest — the alternative was a wrong number. On a failed request it falls back to the stored length rather than collapsing to zero, so a network blip cannot make saved items look unsaved.
- Verified against the live DB: `POST /api/wishlist` with 13 ids (4 live, 9 dead) returns 4 products and 9 `missingIds`, and the two always sum to the input length — that identity is what guarantees the badge and the page agree. Empty, all-dead and all-live inputs all behave. `pruneWishlist` exercised directly under a stubbed `localStorage`/`window`: 13 → 4 survivors, correct single notify, idempotent re-prune, toggle and clear still correct afterwards. `npm run build` clean; `/`, `/wishlist`, `/products` all 200. **Not browser-verified** — no browser attached, so the badge's on-screen value was not confirmed visually.
- Docs updated: `frontend-architecture.md`, `architecture.md` (API response shape), `progress-tracker.md`.

### Session 2026-10-04 (Category Filter Sidebar Navigation Fixed)
- **Category clicks in `FilterSidebar` did nothing on `/categories/[slug]`, and "All" could throw the user onto the homepage.** The sidebar was written for `/products`, where `?category=<slug>` is read and filtered. `/categories/[slug]` resolves its category from the path and reads only `?maxPrice`, so a click pushed `?category=…` that the page ignored — URL changed, grid unchanged. Root cause was a shared component with two incompatible contracts.
- **Secondary bug in the same helper:** `buildHref()` returned `'/'` whenever the resulting query string was empty, so on a page with no other params "All" pushed `router.push('/')` — the homepage — instead of staying put.
- **Fix — categories are now pages, not a query-param filter.** Every category row is a `<Link href="/categories/<slug>">`, which also makes them middle-clickable and prefetchable. "All" goes to `/products`, the honest "every product" target. This matches the convention already used by `FeaturedCategories`, `CategoryMegaMenu` and the product card.
- **`activeSlug` prop added** so the sidebar knows the current category from the path; it still falls back to `?category=`, keeping deep links like `/products?category=2` working and highlighted. `aria-current="page"` marks the active row.
- **The active branch auto-expands.** Arriving on a sub-category (`/categories/melanie-lee`) used to leave it hidden behind a collapsed parent; the containing parent now opens automatically, with the chevron's `aria-expanded`/`aria-controls` reflecting real state.
- **The price slider was effectively unusable — fixed alongside, since it is the same "the filter doesn't work" complaint.** `max` was hardcoded to `100000` while the entire catalogue spans ৳290–৳2,000, compressing all real prices into the first 2% of the track. Both call sites now pass a `priceCeiling` from a `product.aggregate`, scoped to the page's own products and **deliberately excluding the `maxPrice` filter** — otherwise applying a filter would shrink the ceiling to the filtered maximum and the slider could never be widened again. Verified: `?maxPrice=800` on face-care leaves `max="1600"` while the value syncs to 800.
- **Behaviour change, flagged for review:** navigating between categories drops `maxPrice`, so each category page starts from a clean filter rather than inheriting a stale price. This is the conventional choice and is called out here because it is a judgement call, not a bug fix.
- **Verified against the live DB:** all 8 category slugs resolve (HTTP 200) with product counts matching `category.findMany` exactly (30 total); `/products?category=2|face-care|6` → 5/11/7 and `?maxPrice=800` → 8, all matching direct Prisma counts; `/categories/face-care` 11 → 1 under ৳800; `aria-current` correct on both `/products` (All) and `/products?category=2`. `npm run build` clean. **Not browser-verified** — no browser attached, so this is markup/HTTP-level confirmation only.
- **Two things found and deliberately left alone:** `src/components/storefront/MobileFilter.jsx` has the identical `?category=` bug but is referenced nowhere in the codebase (dead code — removing it is a separate call). `ProductGrid.jsx` carries an uncommitted `lg:grid-cols-5`→`4` change not made in this session; flagged rather than reverted.
- No Prisma migration, no new dependencies, no schema change. `font-label-caps` left as-is — still a project-wide no-op (`label-caps` lives under `fontSize`, so the real class is `text-label-caps`).

### Session 2026-10-04 (Catalog Import / Export Round-Trip Fixed)
- **Categories did not round-trip at all, and product exports shipped no images and no variants.** Six confirmed defects in `src/lib/catalog/`, all now fixed. `docs/catalog-import-export.md` was rewritten **first** so the code was written against an agreed contract rather than patched into the old one.
- **The format is now five CSVs, not one:** `products.csv`, `categories.csv`, `options.csv`, `variants.csv`, `upsells.csv`, joined by **slug**. This deliberately reverses the old doc's one-file/Shopify-style design. Categories carry a parent and an image; variants carry their own price/SKU/stock/image. Neither fits a product row without denormalising or nesting.
- **Slug, not name and not UUID, is the join key.** Slugs are unique and stable across installs; UUIDs are unique within one database and meaningless on the machine the archive is imported into, so archive filenames switched from `{uuid}-…` to `{slug}-{index}-…`.
- **Bug 1 — no `categories.csv` existed.** `CATEGORY_COLUMNS` was declared in `constants.js` and referenced nowhere. Category image, parent and description could never leave or re-enter the system. Added, with `Parent Slug` rather than a parent *name*.
- **Bug 2 — parents resolved by slugified name,** ignoring the parent row's own `Slug` column, so a category with a custom slug forked a duplicate orphan node. Now the parent is referenced by slug. This is a code-level flaw only: every current category happens to satisfy `slugify(name) === stored slug`, so live data was never actually corrupt. An early repro of mine appeared to show parent corruption and was wrong.
- **Bug 3 — the duplicate-skip check was dead code.** `uniqueSlug()` ran *before* `if (seenSlugs.has(slug))`, and since `uniqueSlug()` loops until the value is absent, the skip branch could never fire — re-importing grew `name-2`, `name-3`. Now the existence check decides upsert-vs-create and `uniqueSlug()` only guards collisions *within* one file. I reintroduced this exact bug in my own first draft and only caught it by re-importing the archive and diffing the tree.
- **Bug 4 — every product image was silently dropped from exports (44 of 44).** `runExport.js` resolved `public/<image_path>`, but uploads live in `data/uploads/` and `image_path` stores a *URL* (`/api/files/products/…`). The `catch` swallowed the miss. New `resolveStoredImage()` in `images.js` maps `/api/files/<folder>/<name>` and legacy `/uploads/<folder>/<name>` through `getUploadPath()`, with remote URLs downloaded. Export went from a 2.9 KB ZIP to 3.4 MB.
  - Sub-bug found while testing the fix: `/api/files/<folder>/<name>` has **three** fixed segments, not two. The first draft folded them like the `/uploads/` form and still resolved every image to `data/uploads/files/products/…`. Only caught because `X-Missing-Images` was wired up and reported 44.
- **Bug 5 — a blank `SKU` aborted the entire import with a 500.** `sku: sku || null` violates `Product.sku String @unique` (non-nullable). Now a row-level error; the rest of the file still imports.
- **Bug 6 — `PRODUCT_COLUMNS` dropped `specification`, `featured`, `videoUrl`, `ProductImage.altText`, and every option/variant/upsell.** All columns now export and import.
- **Import policy is deliberately asymmetric.** Categories **upsert by slug** (so a wrong parent or missing image is repairable by re-import); products skip by SKU; variants skip on a matching SKU *or* options array; upsells skip on the schema's own `(productId, upsellId)` pair. Two consequences flagged and accepted: the Import card's "existing data is never overwritten" promise is now false for categories, and its "categories are matched by name" line was simply wrong — both corrected in the UI rather than left standing.
- **Import order is load-bearing:** categories → products (+images) → options → variants → upsells, so a variant's `imageId` can reference a `ProductImage` created moments earlier.
- **Category parenting runs as a second pass.** Writing `parentId` inline makes the result depend on row order; a child listed before its parent could not resolve. Verified with a child-first fixture. Self-parent and cycles are reported as row errors and never persisted.
- **`variants.csv` stores the options JSON array verbatim**, matching the `Json` column, so import never reasons about positional alignment against `options.csv`. A variant's `Image` names one of its parent's files rather than duplicating the bytes — the archive holds one copy of each image.
- **Report is now per-entity** (`byType`), because "30 imported" is not actionable when 4 of them were variants. The admin page renders a breakdown table; top-level totals are kept for compatibility.
- **Two further bugs found by testing, not by reading:**
  - The name→category fallback slugified names blindly, so a category with a custom slug was **duplicated on every import** (`Root Parent`/`custom-parent-slug` grew a phantom `root-parent`). An already-linked category is now matched by name before anything is created.
  - Variant dedupe keyed on SKU *or* options rather than both, so two rows of the same size/colour combination were both created. The empty-options case is excluded from the options check, or products with no options would collapse to one variant.
  - Also: row numbers were reported one line too high; a standalone `variants.csv` was misdetected as a product file and every row came back as "Title is required"; and `image: { connect: … }` is rejected by this Prisma client, so variant images had **never** been attachable (`imageId` is required).
- **All five file types now work standalone.** They resolve products by slug against the DB, so classification checks `product_slug` signatures *before* `sku`.
- Verified against live Postgres (30 products / 44 images / 4 variants / 8 categories), exporting and re-importing for real: **re-import is a byte-identical no-op** — zero new rows, zero duplicates, hierarchy and images intact. Corrupted a category's `parentId` and cleared another's image, then re-imported: **both repaired**. Row-error fixtures confirm blank SKU, missing title, missing price, invalid status, missing image, self-parent, missing parent and unknown-product-slug are each reported per row without aborting the run. `৳ 1,250.00` parses to `1250`. All QA data removed; DB returned to its exact starting state (30/8/44/2/4/0). Build clean.
- **Not browser-verified** — no browser attached. The new breakdown table and corrected copy are verified by code and API response shape only. Also unverifiable here: import into a genuinely **empty** database, since clearing production-adjacent data was not acceptable. The round-trip was proven by re-import into the same DB plus targeted fixtures.
- Docs updated: `catalog-import-export.md` (rewritten — format, module layout, export/import logic, QA checklist, FAQ), `progress-tracker.md`. No Prisma migration — the schema did not change.

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
