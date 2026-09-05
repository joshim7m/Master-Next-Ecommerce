# Admin Panel

## Purpose
A CMS-style admin interface at `/admin` managing the full store: catalog, orders, blog content, site settings, and database maintenance.

## Authentication & Security
- Custom JWT auth: `POST /api/admin/login` verifies bcrypt-hashed credentials and sets an httpOnly `admin_session` cookie (`jose`, HS256, 8h expiry).
- `proxy.js` (Next.js 16 middleware equivalent) guards all `/admin/:path*` routes:
  - Unauthenticated page visits → redirect to `/admin/login?redirect=<path>`
  - Unauthenticated API calls → `401 JSON`
- Tokens must carry `role: 'admin'`.
- Logout clears the cookie via `/api/admin/logout`; `/api/admin/me` returns current session info.
- All admin API routes additionally assume the proxy guard; never bypass it.

## Pages

| Route | Description |
|---|---|
| `/admin/login` | Credential login form |
| `/admin/dashboard` | Stats cards (orders, revenue, products) + recent orders |
| `/admin/products` | Product table with search/filters, edit/delete |
| `/admin/products/create` | Create product: pricing, categories multi-select, multi-image upload, status |
| `/admin/products/edit` | Edit product with variant generator and per-variant management (size/color/prices/inventory/image/default flag) |
| `/admin/categories` | Hierarchical category CRUD (parent/child) |
| `/admin/orders` | Order list with search |
| `/admin/orders/[orderNo]` | Order detail: customer/shipping info, items, totals; update order status; edit item quantities; delete items; block/unblock customer device |
| `/admin/blog/categories` | Blog category CRUD |
| `/admin/blog/posts` (+ create/edit) | Post CRUD with Tiptap rich-text editor, banner image, tags, meta description, advertisement linking |
| `/admin/blog/advertisements` | Advertisement CRUD (image, text, price, product link) |
| `/admin/settings/site` | Site identity: name, logo, favicon, contact info, copyright, announcement text, about company (EN/BN) |
| `/admin/settings/site-config` | Integrations: Telegram bot token/chat ID (+ test message), GTM ID, WhatsApp number |
| `/admin/settings/home` | Homepage content settings |
| `/admin/settings/hero-sliders` | Hero slider CRUD (title, subtitle, button, image, order, active) |
| `/admin/settings/social` | Social link CRUD (name, URL, icon, order, active) |
| `/admin/settings/backup-db` | Database backup/restore UI |

## Key Features

### Order Management & Fraud Controls
- Status updates: pending → processing → completed / cancelled.
- Inline item quantity editing and item deletion with total recomputation.
- Device blocking: block a FingerprintJS device hash (with reason/order reference) so checkout rejects future orders from that device; unblock supported.
- Blocked-device lookup endpoint used by storefront checkout.

### Product Variants
- Variant generator creates size/color combinations with individual SKU, prices, inventory, image, and default flag.
- Updates diff variants/images against existing records to avoid duplication.

### File Uploads
- `POST /api/admin/upload` accepts multiple files → `public/uploads/<folder>/`.
- Type whitelist, 5MB max per file.

### Database Backup/Restore (new)
- `GET /api/admin/backup`: shells out to `pg_dump` (plain format, `--no-owner --no-acl`) and streams a timestamped `.sql` download.
- `POST /api/admin/backup`: accepts a `.sql` file upload and restores via `psql -f`.
- UI shows progress states and animated success/error toasts.

## UI Patterns
- Sidebar navigation (`AdminSidebar`) + header (`AdminHeader`) shell with logout.
- Data tables for lists with inline actions (edit/delete).
- Dedicated create/edit pages rather than modals for complex forms (products, posts).
- Client components with fetch-based mutations against the admin REST API; server actions used for some reads/updates (`src/actions/`).
- Toast notifications for success/error feedback.

## Theming
- Dark mode via `ThemeProvider` context (localStorage key `admin-theme`, respects OS preference); toggle in AdminHeader. All admin components carry paired light/dark Tailwind classes.
