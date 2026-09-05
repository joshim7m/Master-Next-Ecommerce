# Project Overview

- **Name:** Eghuri (`next-ecom`)
- **Purpose:** A production-oriented, single Next.js ecommerce application serving the Bangladeshi market, combining a customer-facing storefront and a full admin management panel in one project.
- **Primary stack:** Next.js 16 (App Router) + React 19, Tailwind CSS 3.4, Prisma 5 + PostgreSQL. All code is JSX (no TypeScript). Admin panel uses plain React + Tailwind (ShadCN is not used in practice).
- **Status:** MVP feature-complete and deployed to Vercel. Payment gateway integration is not implemented yet (orders are confirmed manually via phone/WhatsApp).

## Goals
- Browse categories and products with fast discovery (live search, category hierarchy, sorting/filtering)
- Product pages with image gallery, variant selection (size/color), and accurate pricing/discount display
- Add-to-cart with variant support and localStorage-persisted cart + wishlist
- Guest checkout flow with BD phone validation, shipping area selection, and Bangladesh-specific delivery charges
- Order placement safeguards: device fingerprinting, blocked-device rejection, duplicate-order prevention, Telegram alerts
- Admin UI for products/variants, categories, orders, blog CMS, site settings, and DB backup/restore
- SEO-friendly pages: dynamic sitemap, robots.txt, per-page metadata, Open Graph image generation, JSON-LD structured data
- GTM analytics with SPA page-view tracking

## Regional Focus
- This application is designed for Bangladeshi customers and sellers.
- Currency is always Bangladeshi Taka (BDT); do not support USD or other currencies.
- Checkout includes fields: name, mobile, address, shipping_area, and delivery charge selection.
- Delivery charge options: inside Dhaka = 50 taka, outside Dhaka = 120 taka.
- Content is bilingual where relevant (English UI, Bengali product/blog content).

## Key Feature Summary

### Storefront
- Homepage with DB-driven hero slider, category sidebar, product grid with sort bar, mobile category chips
- Product detail pages: image gallery, size/color variants, related products, tabs, share, WhatsApp "Order Now" button
- Live product search with debounced API autocomplete
- Cart (localStorage) with slide-out drawer; wishlist page hydrated from stored IDs
- Checkout with BD phone validation, delivery charge selection, device-hash fraud checks
- Blog listing with load-more pagination, category browsing, ad injection into post content
- Dark mode (class-based, persisted), announcement bar, responsive mobile-first layout

### Admin Panel (`/admin`)
- JWT-authenticated login (httpOnly cookie) guarded by `proxy.js`
- Dashboard with stats cards and recent orders
- Products CRUD with variants, multi-image upload, category assignment
- Categories CRUD (hierarchical parent/child)
- Orders list/detail with status updates, item quantity editing, device blocking/unblocking
- Blog management: categories, posts (Tiptap rich text editor), advertisements with post-linking
- Settings: site identity, announcement text, notification config (Telegram bot, GTM ID, WhatsApp number), hero sliders, social links
- Database backup (pg_dump download) and restore (.sql upload)

## Deliverables
- Prisma schema (17 models) and scraper-based seed pipeline
- Storefront pages (`app/(storefront)/`) for home, products, categories, cart, checkout, wishlist, blogs, static pages
- Admin panel (`app/admin/`) for dashboard, catalog, orders, blog, settings
- ~30 API routes under `app/api/` (public storefront + JWT-guarded admin)
- Deployment-ready configuration for Vercel (`next.config.mjs`, `postinstall: prisma generate`)
