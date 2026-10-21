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
| `/admin/categories` | Hierarchical category CRUD (parent/child) with an editable **display order** column |
| `/admin/orders` | Order list with search — flat table, status editable inline, invoice preview modal |
| `/admin/orders/[orderNo]` | Order detail: customer/shipping info, items, totals; update order status; edit item quantities; delete items; edit delivery charge and **flat discount**; block/unblock customer device |
| `/admin/blog/categories` | Blog category CRUD |
| `/admin/blog/posts` (+ create/edit) | Post CRUD with Tiptap rich-text editor, banner image, tags, meta description, advertisement linking |
| `/admin/blog/advertisements` | Advertisement CRUD (image, text, price, product link) |
| `/admin/settings/site` | Site identity: name, logo, favicon, contact info, copyright, announcement text, about company (EN/BN) |
| `/admin/settings/site-config` | Integrations: Telegram bot token/chat ID (+ test message), GTM ID, WhatsApp number |
| `/admin/settings/home` | Homepage content settings |
| `/admin/settings/hero-sliders` | Hero slider CRUD (title, subtitle, button, image, order, active) |
| `/admin/settings/pages` (+ create/edit) | Page CRUD: name, slug, Tiptap rich-text content, meta description, status; rendered at `/pages/[slug]` |
| `/admin/settings/social` | Social link CRUD (name, URL, icon, order, active) |
| `/admin/settings/backup-db` | Database backup/restore UI |

## Key Features

### Order Management & Fraud Controls
- Status updates: pending → processing → completed / cancelled.
- **The order list is a flat table — no accordion.** Each row shows the order number (linking to the detail page), customer, total, status, date and IP address, and the status cell is itself a dropdown, so a status can be changed without opening anything. Everything else (items, customer details, delivery charge, discount, courier booking, invoice) lives on the order detail page.
- **An eye button on each row opens the invoice in a modal** — a preview, not a PDF and not an A4 page. The same `InvoiceDocument` component renders in `compact` mode (no fixed page box), so the modal shows the full sheet: customer block, delivery, items, subtotal, delivery charge, discount and grand total.
- Inline item quantity editing and item deletion with total recomputation.
- **Delivery charge and discount editing** on the order detail page. The discount is a **flat BDT amount, not a percentage**, and is locked once the order is `completed` or `cancelled`.
- `Order.total` is always derived by `recalculateOrderTotal()`: `subtotal + deliveryCharge − discount`, floored at 0. Every path that can change the money (item quantity, item deletion, delivery charge, discount) recomputes through that one helper, so no edit can leave the stored total stale.
- A discount above `subtotal + deliveryCharge` is capped server-side; the UI warns before saving. The cap is measured against the **new** delivery charge, so lowering the delivery charge re-clamps a discount that was entered earlier, and the input is refreshed with the value actually stored.
- Device blocking: block a FingerprintJS device hash (with reason/order reference) so checkout rejects future orders from that device; unblock supported.
- Blocked-device lookup endpoint used by storefront checkout.

### Invoice
- Per-order invoice at `/admin/orders/[orderNo]/invoice`, reached from a **Download Invoice** button in the order detail header.
- Bilingual: Bangla labels primary, English beneath. Branded from the Site Setting singleton — name, logo, address, mobile, email, site URL, copyright line. Secrets (`jwtSecret`, `telegramBotToken`, `telegramChatId`) are never rendered.
- Includes the customer block, delivery summary, item table with variant/SKU, subtotal, delivery, **discount line (only when non-zero, after the delivery charge)**, and grand total. Cancelled orders carry a rotated `বাতিল · CANCELLED` watermark.
- **One output path: Download PDF.** It rasterises the sheet at ~150 DPI, which is the trade-off for correct Bangla (see `plan-invoice-download.md` for why no pure-JS PDF writer can shape the script). The **Print** button and the `?autoprint=1` shortcut were removed — the page is opened to be downloaded, and a print dialog popping up on arrival was more surprising than useful. The `@media print` CSS was kept, so a manual Ctrl+P still prints a clean A4 sheet.
- `html2canvas` and `jspdf` are dynamically imported inside the click handler, so neither enters the shared bundle.
- The route renders **bare** — no admin sidebar or header — because the raster path captures the page, and hiding chrome with CSS would still have baked it into the PDF.
- Lives under `/admin/` rather than `/api/admin/`, so the existing `proxy.js` matcher guards it without new auth code.
- Logo rendering is verified against disk first: a `SiteSetting.logo` pointing at a missing file is dropped so the sheet falls back to the site name instead of printing a broken-image box.
- **The list preview is fed by `GET /api/admin/orders/invoice-preview?orderNo=…`**, which returns the order fields the sheet draws plus the brand fields only. The route checks the session token itself (the proxy matcher covers `/admin/*`, not `/api/admin/*`), and selects `OrderDetails` field by field so the internal-only `orderNote` and `deviceHash` never leave the server. `src/lib/invoiceBrand.js` holds the brand whitelist and the missing-logo rule, so the A4 page and the modal resolve the logo identically and no secret can reach a rendered invoice.

### Product Variants
- Variant generator creates size/color combinations with individual SKU, prices, inventory, image, and default flag.
- Updates diff variants/images against existing records to avoid duplication.

### Category Order
- Every category carries a **manual display order** (`Category.sortOrder`, 1, 2, 3 …). The `/admin/categories` table shows it in an **Order No** column — a plain, read-only cell, so the number can never be half-edited in the list itself.
- The number is set from the **Create/Edit Category** form, in an **Order No** field next to Description. Editing a row's position is therefore an ordinary form save, and the table re-sorts the moment the save lands.
- The number is the sort key for **every** category listing — the admin table, the mega-menu, the storefront category grid and both category APIs — via the shared `CATEGORY_ORDER_BY` in `src/lib/categoryOrder.js`, so the owner decides the order customers see instead of the alphabet.
- A new category is pre-filled with the next free position; a category saved without a number goes to the end of the list rather than silently taking a position.
- Validation lives in the action (`parseSortOrder`): a negative number is clamped to 0, a decimal is truncated, and junk is ignored. A blank number in the form means "leave it as it is" — it never resets a stored position to 0.
- The `SN` column was dropped, so the table carries exactly one number per row: **Category · Slug · Parent · Order No · Actions**.

### File Uploads
- `POST /api/admin/upload` accepts multiple files → `public/uploads/<folder>/`.
- Type whitelist, 5MB max per file.

### Database Backup/Restore (new)
- `GET /api/admin/backup`: shells out to `pg_dump` (plain format, `--no-owner --no-acl`) and streams a timestamped `.sql` download.
- `POST /api/admin/backup`: accepts a `.sql` file upload and restores via `psql -f`.
- UI shows progress states and animated success/error toasts.

### Content Pages (CMS)
- `/admin/settings/pages` lists pages (search + status filter); create/edit live at `/admin/settings/pages/create` and `/admin/settings/pages/edit/[slug]`.
- Fields: `name`, `slug` (unique, auto-generate from name), `content` via the shared Tiptap editor, `metaDescription` (SEO), `status` (`publish`/`draft`, default `publish`).
- Storefront renders only published pages at `/pages/[slug]` (drafts 404) with metadata/OG/canonical; saving a page revalidates the admin list and the `/pages/[slug]` routes.
- Duplicate-slug attempts surface an inline error instead of failing silently.

## UI Patterns
- Sidebar navigation (`AdminSidebar`) + header (`AdminHeader`) shell with logout.
- Data tables for lists with inline actions (edit/delete).
- Dedicated create/edit pages rather than modals for complex forms (products, posts).
- Client components with fetch-based mutations against the admin REST API; server actions used for some reads/updates (`src/actions/`).
- Toast notifications for success/error feedback.

## Theming
- Dark mode via `ThemeProvider` context (localStorage key `admin-theme`, respects OS preference); toggle in AdminHeader. All admin components carry paired light/dark Tailwind classes.
