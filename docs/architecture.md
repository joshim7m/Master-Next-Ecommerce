# Architecture

## High-Level Architecture

- **Framework:** Single Next.js 16 App Router project (React 19), all JSX. Server Components for data fetching/SEO, Client Components for interactivity.
- **Database:** PostgreSQL accessed via Prisma ORM (`src/lib/prisma.js` singleton client).
- **Authentication:** Custom JWT auth — `jose` (HS256, 8h expiry) in an httpOnly cookie `admin_session`, passwords hashed with `bcryptjs`. Route protection lives in `proxy.js` (Next.js 16's replacement for `middleware.ts`).
- **Image Storage:** Uploaded files stored under `public/uploads/<folder>/` via `/api/admin/upload`; seeded images use remote URLs.
- **Notifications:** Telegram Bot API order alerts (`src/lib/telegram.js`), configured via SiteSetting.
- **Analytics:** Google Tag Manager injected when `gtmId` is set; SPA `page_view` events pushed to `window.dataLayer`.
- **Fraud prevention:** FingerprintJS device hash sent with checkout; blocked devices and duplicate pending orders are rejected.

## Folder Structure (actual)

```
app/
├── layout.jsx               # Root layout: DB-driven metadata, Playfair Display + Inter + Material Symbols fonts, ThemeInit
├── sitemap.js / robots.js   # SEO generators
├── (storefront)/            # Customer-facing pages (route group)
│   ├── (home)/              # Homepage + _partials (Hero, FilterSidebar, ProductGrid, SortBar)
│   ├── products/            # Listing + [slug] detail
│   ├── categories/          # Listing + [slug]
│   ├── cart/ checkout/ thankyou/
│   ├── wishlist/
│   ├── blogs/               # Listing, categories, category/[slug], [slug] post detail
│   ├── about/ contact/ privacy/ terms/
│   └── not-found.jsx
├── admin/                   # Admin panel (no route group — real path /admin/*)
│   ├── login/ dashboard/
│   ├── products/ (list, create, edit + partials)
│   ├── categories/ orders/ (+ [orderNo])
│   ├── blog/ (categories, posts CRUD, advertisements)
│   ├── settings/ (site, site-config, home, hero-sliders, social, backup-db)
│   └── partials/ (AdminSidebar, AdminHeader)
└── api/                     # ~30 route handlers (see below)

src/
├── lib/                     # prisma, auth, auth-edge, telegram, gtm, blog-ads,
│                            # cartStorage, wishlistStorage
├── actions/                 # Server actions: products, categories, orders, blog
├── components/
│   ├── storefront/          # Header, Footer, CartDrawer, AnnouncementBar,
│   │                        # GoogleTagManager, PageViewTracker, ProductDetailClient,
│   │                        # BlogCard, AdCard, LoadMorePosts, MobileFilter...
│   │   └── partials/        # ProductInfo, ImageGallery, ProductTabs, RelatedProducts
│   ├── admin/               # ThemeProvider, TipTapEditor, CategoryMultiSelect,
│   │                        # AdvertisementMultiSelect
│   ├── ThemeInit.jsx        # Storefront dark-mode bootstrapper
│   └── ConfirmDialog.jsx
└── hooks/                   # usePageView, useDeviceFingerprint

prisma/                      # schema.prisma (17 models), migrations/, seed pipeline
proxy.js                     # JWT guard for /admin/:path* (Next 16 middleware equivalent)
docs/                        # Project documentation
```

## Route Structure

### Storefront (`app/(storefront)/`)
- `/` — homepage (hero slider, filter sidebar, product grid)
- `/products` — product listing; `/products/[slug]` — product detail
- `/categories` — category listing; `/categories/[slug]` — category products
- `/cart`, `/checkout`, `/thankyou` — purchase flow
- `/wishlist` — wishlist page
- `/blogs`, `/blogs/categories`, `/blogs/category/[slug]`, `/blogs/[slug]` — blog system
- `/about`, `/contact`, `/privacy`, `/terms` — static pages

### Admin (`app/admin/`)
- `/admin/login` → `/admin/dashboard`
- `/admin/products` (+ `/create`, `/edit`) — catalog management with variants
- `/admin/categories` — hierarchical category management
- `/admin/orders`, `/admin/orders/[orderNo]` — order management
- `/admin/blog/categories`, `/admin/blog/posts` (+ create/edit), `/admin/blog/advertisements`
- `/admin/settings/site`, `/admin/settings/site-config`, `/admin/settings/home`,
  `/admin/settings/hero-sliders`, `/admin/settings/social`, `/admin/settings/backup-db`

### API Routes (`app/api/`)

**Public:**
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/search?q=` | GET | Live product search (top 8) |
| `/api/categories` | GET | List categories |
| `/api/products/recent` | GET | 6 newest published products |
| `/api/wishlist` | POST | Hydrate wishlist IDs into full products |
| `/api/checkout` | POST | Create order (validation, fraud checks, delivery charge, Telegram alert) |
| `/api/checkout/check-blocked?deviceHash=` | GET | Blocked-device lookup |
| `/api/og` | GET | Edge-rendered Open Graph images (1200×630) |

**Admin (JWT-guarded):**
| Endpoint | Method(s) | Purpose |
|---|---|---|
| `/api/admin/login` / `logout` / `me` | POST / POST / GET | Session lifecycle |
| `/api/admin/products` (+`/[id]`) | GET, POST / PUT, DELETE | Product CRUD incl. variant/image diffing |
| `/api/admin/categories` (+`/[id]`) | GET, POST / PUT, DELETE | Category CRUD |
| `/api/admin/orders` (+`/[id]`, `/search`) | GET / GET, PUT | Orders read/update |
| `/api/admin/orders/block` / `unblock` | POST / DELETE | Device blocking |
| `/api/admin/upload` | POST | Multi-file upload to `public/uploads/` (5MB max, type whitelist) |
| `/api/admin/settings/site` | GET, PUT | SiteSetting singleton |
| `/api/admin/settings/site-config` (+`/test`) | GET, PUT / POST | Telegram/GTM/WhatsApp config + test message |
| `/api/admin/settings/hero-sliders` (+`/[id]`) | GET, POST / PUT, DELETE | Hero slider CRUD |
| `/api/admin/settings/social` (+`/[id]`) | GET, POST / PUT, DELETE | Social link CRUD |
| `/api/admin/backup` | GET, POST | pg_dump export download / .sql restore upload |

## Authentication Flow

1. `POST /api/admin/login` verifies credentials (bcrypt) and sets the `admin_session` httpOnly cookie (JWT, HS256, 8h).
2. `proxy.js` matches `/admin/:path*`; it allows `/admin/login` through, verifies the JWT for everything else.
3. Unauthenticated page requests redirect to `/admin/login?redirect=<path>`; API requests get `401 JSON`.
4. Tokens with `role !== 'admin'` are rejected.

## Rendering Strategy

- Storefront product/category/blog/home pages: server components fetching via Prisma directly, with per-page `generateMetadata` and loading states (`loading.js`).
- Cart, checkout, variant selection, search overlay, drawers: client components.
- Admin mutations: mix of server actions (`src/actions/`) for reads/complex updates and REST API routes for client-side fetches.
- SPA navigations fire `page_view` dataLayer events via `usePageView` hook (wrapped in `<Suspense>` because of `useSearchParams`).

## Deployment

- Target: Vercel (`next.config.mjs` is intentionally minimal; `postinstall: prisma generate`).
- Database: external PostgreSQL via `DATABASE_URL`.
- `robots.txt` disallows `/admin/` and `/api/`; dynamic sitemap includes published products, categories, and blog content.
