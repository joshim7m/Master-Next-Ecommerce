# AI Workflow Rules

These rules govern the behavior and constraints for the AI agent working on this Next.js ecommerce project.

## Project Context
- **Project:** Eghuri (`next-ecom`) — a production-oriented Next.js ecommerce application with storefront and admin panel
- **Stack:** Next.js 16 (App Router) + React 19, Tailwind CSS 3.4, Prisma 5 + PostgreSQL, Tiptap v3, jose JWT + bcryptjs, FingerprintJS
- **Regional Focus:** Bangladesh, BDT currency only, Inside Dhaka (৳50) / Outside Dhaka (৳120) shipping options
- **Status:** MVP feature-complete; no payment gateway yet (manual confirmation via phone/WhatsApp)

## AI Agent Rules

### 1. Code Quality & Standards
- Always use JSX for all components (no TypeScript in this codebase)
- Follow the existing folder structure: `app/`, `src/actions/`, `src/components/`, `src/lib/`, `src/hooks/`, `prisma/`
- Use server components for data fetching and SEO in storefront pages
- Use client components for interactive features (cart, checkout, variant selection, search)
- Admin mutations: REST API routes under `app/api/admin/` called from client components; some reads/updates use server actions in `src/actions/`
- Path alias: `@/*` maps to project root (see `jsconfig.json`)

### 2. Component Development
- Storefront components: plain React + Tailwind utility classes in `src/components/storefront/` (+ `partials/`)
- Admin components in `src/components/admin/` — plain React + Tailwind (ShadCN is NOT used despite early plans)
- Reusable shared components at `src/components/` root (e.g., `ThemeInit`, `ConfirmDialog`)
- Always export default for page components

### 3. Database & Schema
- Follow the Prisma schema in `prisma/schema.prisma` (17 models); keep `docs/data-model.md` in sync
- Always use Prisma migrations for schema changes: `npx prisma migrate dev --name [description]`
- Never manually edit the database schema or push without migrations
- Seed data only through the pipeline documented in `docs/seeding.md`

### 4. Authentication & Security
- Admin auth is custom JWT via `jose` (HS256, 8h) in httpOnly cookie `admin_session`; passwords hashed with `bcryptjs`
- Route protection lives in `proxy.js` (Next.js 16's middleware replacement) matching `/admin/:path*`
- Never bypass or weaken the proxy guard; new admin API routes are automatically covered by the matcher
- Never store or log secrets; integration tokens (Telegram/GTM/WhatsApp) live in the SiteSetting DB row, not in code

### 5. Regional Compliance
- Always use BDT (Bangladeshi Taka) as the sole currency, displayed with ৳
- Checkout fields: name, mobile (BD validation), address, shipping_area, delivery charge
- Delivery charges: inside Dhaka = 50 BDT, outside Dhaka = 120 BDT

### 6. Variant & Pricing Logic
- If a product has variants, show variant selector and variant-specific prices
- If no variants, show base product price (`unite_price` or `sale_price` when present)
- Discount amount = `price - sale_price`; discount percent = `((price - sale_price) / price) * 100` (guard division by zero)

### 7. State Management
- Cart and wishlist persist to localStorage via `src/lib/cartStorage.js` / `wishlistStorage.js`, syncing across components with `cart-updated` / `wishlist-updated` window events
- Keep state localized; no global state library (Context only for admin theming)

### 8. Analytics & Notifications
- GTM events go through `pushDataLayer()` from `src/lib/gtm.js`; SPA page views via `usePageView` hook (keep it inside `<Suspense>`)
- Order alerts fire via `src/lib/telegram.js` using SiteSetting credentials
- Preserve fraud-prevention flow: device hash (FingerprintJS), blocked-device rejection, duplicate pending-order prevention

### 9. Testing & Deployment
- No test framework is currently configured; if adding tests, prefer Jest + React Testing Library and justify the dependency
- Ensure `npm run build` passes before deployment (Vercel target; `postinstall` runs `prisma generate`)
- Do not add dependencies without justification

### 10. Documentation
- Update `docs/progress-tracker.md` after each working session
- Maintain `docs/` with accurate, up-to-date information as features change
- Add architecture decisions to relevant docs when features are built

## Constraints
- Do not modify regional requirements (BDT, delivery charges)
- Do not add third-party payment integration without explicit approval
- Do not create authenticated endpoints without session/JWT validation
- Do not duplicate code; reuse existing components and lib helpers
- Do not rename localStorage keys (`cabinet-closet-cart`, `cabinet-closet-wishlist`, `device-hash`, `theme`, `admin-theme`) — they are user-facing persistence
