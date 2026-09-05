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
- `BlogCard`, `AdCard`, `LoadMorePosts` — blog listing pieces
- `MobileFilter` — mobile filter drawer

### Product page partials (`src/components/storefront/partials/`)
- `ProductInfo` — variant selection, quantity, pricing/discount display, add-to-cart, buy-now, **WhatsApp order button** (wa.me deep link with product/variant/price pre-filled), share, wishlist toggle
- `ImageGallery` — product image gallery
- `ProductTabs` — description/additional info tabs
- `RelatedProducts` — same-category suggestions

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
- `CategoryMultiSelect`, `AdvertisementMultiSelect`

## State Management
- **Cart:** localStorage via `src/lib/cartStorage.js` (key `cabinet-closet-cart`). Add/update/remove/clear operations dispatch a `cart-updated` window event so Header/CartDrawer stay in sync. No server-side cart.
- **Wishlist:** localStorage via `src/lib/wishlistStorage.js` (key `cabinet-closet-wishlist`) with `wishlist-updated` event. The wishlist page hydrates stored IDs through `POST /api/wishlist`.
- **Product page state:** selected variant, quantity, dynamic pricing — localized to `ProductDetailClient`.
- **Checkout state:** customer name, mobile, address, shipping area, delivery charge selection.
- **Device fingerprint:** `useDeviceFingerprint` hook caches FingerprintJS visitorId in localStorage (`device-hash`) and sends it with checkout.
- No global state library; React Context only for admin theming.

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
- Mobile-first responsive design throughout.

## Images
- Product/admin uploads stored under `public/uploads/<folder>/` (via `/api/admin/upload`); seeded content uses remote URLs.
- Variant-specific images supported via `ProductVariant.imageId`.

## SEO Implementation
- Per-page `generateMetadata` on home, category, product detail, blog listing/detail/category pages.
- Open Graph images generated at runtime by edge route `/api/og` (1200×630, brand-styled).
- JSON-LD: Organization + WebSite (SearchAction) in storefront layout; BlogPosting + BreadcrumbList on posts.
- Dynamic `app/sitemap.js` (static pages + published products/categories/blog content) and `app/robots.js` (disallow `/admin/`, `/api/`).
