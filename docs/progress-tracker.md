# Project Progress Tracker

A living document tracking the status of all project tasks for the Eghuri ecommerce application.

**Last Updated:** 2026-08-26 (Session 5 — storefront redesign kickoff)

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
| Prisma schema (17 models) | ✅ Done | See `schema.prisma`; documented in `data-model.md` |
| Database migrations | ✅ Done | 14 migrations under `prisma/migrations/` |
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

---

## Admin Panel Development

| Task | Status | Notes |
|------|--------|-------|
| JWT authentication (login/logout/me) | ✅ Done | `jose` HS256, httpOnly cookie, 8h expiry |
| Route protection (`proxy.js`) | ✅ Done | Next 16 middleware equivalent guarding `/admin/:path*` |
| Dashboard (stats + recent orders) | ✅ Done | |
| Products CRUD with variants | ✅ Done | Variant generator, image diffing on update |
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
