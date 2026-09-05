# Plan — Fully Dynamic Site Settings & SEO (Admin-Driven)

> Status: **Implemented** · Updated: 2026-09-05
> Following `docs/seo.md`, this plan removes every hardcoded `Eghuri` from the storefront and makes all branding + SEO output come from the admin panel (`SiteSetting` singleton row). Part A (A1–A17), Part B (B1–B3) and Part C are complete; all High-Priority items in `docs/seo.md` §10 are marked ✅ Done.

---

## Background & Root Cause

The DB `SiteSetting.siteName` is correctly `"Radiant Picks"`, and the layout **templates** (`%s | {siteName}`) already render it. However, ~12 storefront pages define their own page-level metadata with **hardcoded `Eghuri`**, and in Next.js a page's `generateMetadata`/`metadata` overrides the layout default. Result in the browser tab:

```
Eghuri — Shop Lingerie, Bras, Panties & Nightwear Online in Bangladesh | Radiant Picks
```

(i.e. hardcoded page title prefix + dynamic layout template suffix — confirmed in GTM `page_view` logs).

Every brand/SEO surface that still hardcodes `Eghuri` must be driven by settings.

---

## Part A — Make all branding/SEO dynamic from `SiteSetting`

### A1. New shared helper — `src/lib/siteSettings.js`
- `getSiteSettings()` wrapped in React `cache()` so a single request performs the DB lookup once (today the query is duplicated in ~8 files).
- `buildTitle(pageTitle, settings)` / `siteNameOf(settings)` helpers.
- Fallback brand = **no** brand hardcode. Use `settings.siteName || ''`; layouts degrade gracefully.
- `getMetadataBase()/getSiteUrl()` reads `NEXT_PUBLIC_SITE_URL || <env default>`.

### A2. Files to update (Part A sweep)

| # | File | Change |
|---|------|--------|
| 1 | `app/(storefront)/(home)/page.jsx` | `generateMetadata`: fetch settings; title/description/keywords/OG/Twitter/OG-image built from `siteName`; JSON-LD `ItemList.name` uses `siteName`. (This is THE tab-title bug.) |
| 2 | `app/(storefront)/layout.jsx` | Default title, description, keywords, `og:site_name`, OG image all from settings; remove `Eghuri` from copy + keywords; JSON-LD `Organization`/`WebSite` names use `siteName`. |
| 3 | `app/layout.jsx` | Root default title already uses `siteName`; make description use `settings.metaDescription`/`aboutCompany`; remove hardcoded copy. |
| 4 | `app/(storefront)/about/page.jsx` | `export const metadata` → async `generateMetadata` (dynamic); title `About Us | {siteName}`; prune `Eghuri` from `fallbackAbout`; `<h1>` uses `siteName`. |
| 5 | `app/(storefront)/contact/page.jsx` | async `generateMetadata`; JSON-LD `LocalBusiness.name` → `siteName`, `url` → `SITE_URL`. |
| 6 | `app/(storefront)/privacy/page.jsx` | async `generateMetadata`; body copy brand mentions replaced with `siteName`. |
| 7 | `app/(storefront)/terms/page.jsx` | async `generateMetadata`; body copy brand mentions replaced with `siteName`. |
| 8 | `app/(storefront)/categories/page.jsx` | Title/desc/OG/JSON-LD use `siteName`. |
| 9 | `app/(storefront)/categories/[slug]/page.jsx` | Title/desc/OG/JSON-LD use `siteName`. |
| 10 | `app/(storefront)/products/[slug]/page.jsx` | `og:site_name`, `og:title`/`twitter:title` (`{title} | {siteName}`), JSON-LD `Brand`/`seller`/description use `siteName`. |
| 11 | `app/(storefront)/blogs/page.jsx` | Titles, descriptions, `og.siteName`, JSON-LD `Blog.name` dynamic. |
| 12 | `app/(storefront)/blogs/[slug]/page.jsx` | `{post.title} | {siteName} Blog`; `og.siteName`; JSON-LD names dynamic. |
| 13 | `app/(storefront)/blogs/category/[slug]/page.jsx` | Same as blogs detail. |
| 14 | `app/(storefront)/blogs/categories/page.jsx` | `metadata` → async `generateMetadata`; dynamic. |
| 15 | `app/api/og/route.js` | Accept `siteName` query param for brand badge + text; replace hardcoded `Eghuri` letter/text and `eghuri.com` (host now from DB `siteUrl` via `siteUrlOf(settings)`, Node runtime). |
| 16 | `src/components/storefront/Header.jsx`, `Footer.jsx` | Neutral fallbacks instead of `'Eghuri'`. |
| 17 | `app/(storefront)/(home)/_partials/Hero.jsx` | `alt` fallback neutral. |

---

## Part B — Admin SEO settings (new DB fields + UI)

### B1. Prisma schema — `SiteSetting` additions
```
metaTitle           String?   // global title suffix/template brand, e.g. "Radiant Picks"
metaDescription     String?   // global default meta description
metaKeywords        String?   // global comma-separated keywords
ogImage             String?   // optional default OG image URL
```
- Add migration (`prisma migrate dev --name add_seo_site_settings`).
- Synchronize seed in `prisma/seedSettings.js` (optional, adds sane defaults).

### B2. Admin API — `app/api/admin/settings/site/route.js`
- `GET` already returns the full row → auto-includes new fields (no change needed).
- `PUT` — whitelist the new fields in the destructure + `upsert`.

### B3. Admin UI — `app/admin/settings/site/page.jsx`
- New SectionCard **"SEO & Sharing"**:
  - `metaTitle` (global title suffix)
  - `metaDescription` (global default description)
  - `metaKeywords` (comma-separated)
  - `ogImage` image upload (reuse existing `ImageUpload`)
- Extend `form` state + load mapping + `handleSave` payload.
- Add a **"SEO"** entry to `settingsSubItems` in `app/admin/partials/AdminSidebar.jsx` if we split it into its own subpage (optional).

---

## Part C — Wire SEO fields into metadata

- **Global defaults** (root + storefront layouts, home page):
  - `title.template: %s | {settings.metaTitle || settings.siteName}`
  - `description: settings.metaDescription || (aboutCompany-based fallback)`
  - `keywords: (settings.metaKeywords || default list).split(',')`
  - `og.image`: `settings.ogImage || /api/og?...`
- **Per-page**: pages keep their specific text but **never** a hardcoded brand — always composed with `siteName` (or the global `metaTitle`) so there is a single source of truth.

---

## Out of scope / later

- ~~`.env` / `NEXT_PUBLIC_SITE_URL` / domain configuration~~ — ✅ **done.** Both keys are now admin-managed from **Site Config** (`/admin/settings/site-config`): **Site URL** (`SiteSetting.siteUrl`) drives canonical/OG/sitemap/robots/OG-image host, and **JWT Secret** (`SiteSetting.jwtSecret`) signs/verifies admin sessions. Resolution is **env → DB → default** per request (see `docs/seo.md` §Admin-driven SEO defaults). Env fallback is now `https://radiantpicks.com`; the DB value overrides it live without a rebuild.
- Sitemap/robots existing improvement list is tracked in `docs/seo.md` §10 (kept separate).
- Production caching/ISR considerations: in **dev** mode metadata re-reads the DB per request (already proven — layout template updated live). In **production**, dynamic routes re-read per request; fully-static routes cached with `sitemap`/`robots` revalidate on their own schedule. Add `export const revalidate`/`dynamic` guidance at that time if needed.

---

## Verification

1. `npm run seed` unaffected; `prisma migrate` applied.
2. Dev server: change `siteName`/`metaTitle`/`metaDescription` in admin → reload storefront → browser tab, `<meta>` tags, OG, JSON-LD all reflect new brand.
3. `grep -rE "Eghuri" app/` should return **zero** matches in rendered storefront metadata (script/seed/docs exemptions only).
4. `npm run build` passes.