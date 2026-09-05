# SEO Best Practices — admin-driven

> **Strategy:** All branding and SEO output must come from the admin panel (`SiteSetting` singleton).
> Site name, meta title/description/keywords, OG image, JSON-LD names, and page titles are composed
> dynamically from settings — **no hardcoded brand in render output**. See
> `docs/plan-site-settings-dynamic.md` for the implementation plan.

This document covers the current SEO implementation, best practices applied, and remaining improvements for the ecommerce application.

---

## Current SEO Architecture

| Feature | Status | Implementation |
|---|---|---|
| Dynamic Sitemap | ✅ | `app/sitemap.js` — Prisma-powered, includes products/categories/blog |
| Robots.txt | ✅ | `app/robots.js` — disallows `/admin/`, `/api/` |
| OG Image Generation | ✅ | `app/api/og/route.js` — Edge-rendered 1200×630 images |
| Per-page Metadata | ✅ | `generateMetadata` on all storefront pages |
| JSON-LD Structured Data | ✅ | Product, BlogPosting, CollectionPage, Organization, WebSite, BreadcrumbList |
| Canonical URLs | ✅ | Every page sets a canonical |
| OpenGraph + Twitter Cards | ✅ | Full OG and Twitter metadata on all pages |
| Google Tag Manager | ✅ | Configurable via SiteSetting, SPA page_view events |
| HTML lang attribute | ✅ | `<html lang="en">` on root layout |
| Mobile-first Responsive | ✅ | Tailwind CSS, viewport meta tag |
| Semantic HTML | ✅ | `<article>`, `<nav>`, `<section>`, heading hierarchy |

---

## 1. Sitemap (`app/sitemap.js`)

The sitemap is generated dynamically using the App Router's native `sitemap.js` convention.

### What's included
- **Static pages:** `/`, `/products`, `/categories`, `/blogs`, `/blogs/categories`, `/cart`, `/checkout`
- **Products:** All published products (priority 0.9, weekly)
- **Categories:** All categories (priority 0.7, weekly)
- **Blog posts:** All published posts (priority 0.7, monthly)
- **Blog categories:** All published categories (priority 0.6, weekly)

### Best practices applied
- Dynamic generation from database — always up-to-date
- `lastModified` from `updatedAt` column — crawlers see fresh content
- Priority levels reflect content importance
- `changeFrequency` hints help crawler scheduling

### Recommended improvements
- Add `/about`, `/contact`, `/privacy`, `/terms` to static pages list
- Remove `/cart` and `/checkout` from sitemap (they're disallowed in robots.txt — contradictory signals)
- Consider adding `<xhtml:link rel="alternate">` for Bengali content if bilingual URLs are added later

---

## 2. Robots.txt (`app/robots.js`)

```js
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://radiantpicks.com/sitemap.xml
```

### Best practices applied
- Disallows admin panel and API routes from indexing
- Points to sitemap URL
- Simple, clean rules

### Recommended improvements
- Add `Disallow: /thankyou` — order confirmation pages should not be indexed
- Consider adding crawl-delay for aggressive bots if server load becomes an issue

---

## 3. Open Graph Images (`app/api/og/route.js`)

Dynamic OG images generated at the edge using `next/og` `ImageResponse`.

### Features
- 1200×630px (optimal for social sharing)
- Type-aware styling: `website`, `product`, `category`
- Dynamic title/subtitle/price rendering
- Brand-consistent design with Eghuri colors
- "Cash on Delivery - Nationwide Shipping" badge

### Best practices applied
- Edge runtime for fast generation
- Dynamic content from query params
- Consistent branding across all page types

### Recommended improvements
- Add `Cache-Control` headers (`s-maxage=86400, stale-while-revalidate`) to reduce re-rendering
- Pre-generate OG images for top products during build
- Add `alt` text equivalent in the image for accessibility

---

## 4. Metadata Strategy

### Root Layout (`app/layout.jsx`)
```jsx
export const metadata = {
  title: { default: `${siteName} -- ...`, template: `%s | ${siteName}` },
  description: '...',
  icons: { icon: favicon },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};
```

### Storefront Layout (`app/(storefront)/layout.jsx`)
- Title template: `%s | {siteName}`
- Full OpenGraph: type, locale (`en_BD`), title, description, images, url
- Twitter cards: `summary_large_image`
- Robots: `index: true`, `follow: true`, Googlebot-specific rules
- Canonical URL to root
- `metadataBase` for resolving relative URLs

### Per-page overrides
Each page overrides layout metadata with page-specific values. Every title/description is **composed with the dynamic site name** (`{siteName}`) read from `SiteSetting` — page metadata never hardcodes a brand.

| Page | Title pattern | Canonical | JSON-LD |
|---|---|---|---|
| Homepage | `{siteName} -- Shop ...` | `/` | ItemList (products) |
| Product | `{title}` (template adds `| {siteName}`) | `/products/{slug}` | Product + Offer |
| Category | `{name} -- Buy Online in Bangladesh | {siteName}` | `/categories/{slug}` | CollectionPage |
| Blog listing | `Blog | {siteName} -- ...` | `/blogs` | Blog + BreadcrumbList |
| Blog post | `{title} | {siteName} Blog` | `/blogs/{slug}` | BlogPosting + BreadcrumbList |
| About | `About Us | {siteName}` | `/about` | — |
| Contact | `Contact Us | {siteName}` | `/contact` | LocalBusiness |
| Privacy | `Privacy Policy | {siteName}` | `/privacy` | — |
| Terms | `Terms of Service | {siteName}` | `/terms` | — |

### Admin-driven SEO defaults
The admin **Site Setting → SEO & Sharing** section (planned in `docs/plan-site-settings-dynamic.md`) provides global defaults used by the layouts:
- `metaTitle` — global title suffix (falls back to `siteName`)
- `metaDescription` — global default `<meta name="description">`
- `metaKeywords` — global comma-separated keywords
- `ogImage` — optional default OG image

### Admin-driven Site URL & JWT (Site Config)
The admin **Site Config** page (`/admin/settings/site-config`) now manages two keys that were previously env-only:

| Key | Field | Effect | Fallback |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Site URL** (`SiteSetting.siteUrl`) | Base URL for canonical, OG/`og:url`, JSON-LD, `robots.txt` sitemap link, `sitemap.xml` URLs, and the host shown on generated OG images | `process.env.NEXT_PUBLIC_SITE_URL`, else `https://radiantpicks.com` |
| `JWT_SECRET` | **JWT Secret — Admin Login** (`SiteSetting.jwtSecret`) | Signs/verifies the admin session cookie at `/admin/login`; the `proxy.js` (Node runtime, Next 16 default) reads it on every `/admin` request | `process.env.JWT_SECRET`, else dev fallback |

Resolution order is **env → DB → default**, and it happens per-request, so admin edits take effect immediately without a rebuild. Rotating the JWT secret invalidates all active admin sessions (they are redirected to `/admin/login`).

### Best practices applied
- Title template prevents duplicate title patterns
- Every page has a unique, descriptive `<title>` and `<meta name="description">`
- `metadataBase` resolves all relative OG URLs correctly
- `locale: en_BD` targets Bangladeshi audience
- Canonical URLs prevent duplicate content issues

---

## 5. JSON-LD Structured Data

### Implemented schemas

**Organization** (storefront layout)
```json
{
  "@type": "Organization",
  "name": "{siteName}",
  "url": "https://example.com",
  "logo": "...",
  "areaServed": "Bangladesh",
  "sameAs": ["facebook.com/{brand}", "instagram.com/{brand}", "youtube.com/@ {brand}"]
}
```
- Helps Google understand the business entity
- `sameAs` links social profiles for Knowledge Panel
- `name` is populated from `SiteSetting.siteName` — never hardcoded

**WebSite** (storefront layout)
```json
{
  "@type": "WebSite",
  "name": "{siteName}",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/categories?search={search_term_string}"
  }
}
```
- Enables sitelinks searchbox in Google results
- SearchAction allows Google to show a search box

**Product** (product detail pages)
```json
{
  "@type": "Product",
  "name": "...",
  "description": "...",
  "image": "...",
  "sku": "...",
  "brand": { "@type": "Organization", "name": "{siteName}" },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "BDT",
    "price": "...",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "{siteName}" }
  }
}
```
- Enables rich product results in Google Shopping and search
- Price, availability, and SKU shown in search results

**CollectionPage** (category pages)
```json
{
  "@type": "CollectionPage",
  "name": "...",
  "description": "...",
  "numberOfItems": 20,
  "hasPart": [{ "@type": "Product", ... }]
}
```

**BlogPosting** (blog posts)
```json
{
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "image": "...",
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Person", "name": "..." },
  "publisher": { "@type": "Organization", "name": "{siteName}", "logo": "..." },
  "wordCount": 500,
  "articleSection": "...",
  "keywords": "..."
}
```
- Enables rich blog results with author, date, and image

**BreadcrumbList** (blog listing, blog posts)
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://example.com/blogs" }
  ]
}
```
- Shows breadcrumb trail in Google search results

**ItemList** (homepage)
- Lists up to 20 products with position, URL, and name

---

## 6. Technical SEO Checklist

### Crawlability
- [x] `robots.txt` present and accessible at `/robots.txt`
- [x] XML sitemap present at `/sitemap.xml`
- [x] Sitemap referenced in `robots.txt`
- [x] No orphan pages (all pages linked from navigation)
- [x] Clean URL structure (`/products/{slug}`, `/categories/{slug}`, `/blogs/{slug}`)
- [x] No infinite crawl loops (proper pagination with load-more)

### Indexability
- [x] Every page has unique `<title>` tag
- [x] Every page has unique `<meta name="description">`
- [x] Canonical URLs set on every page
- [x] No duplicate content (canonicals point to correct URLs)
- [x] `noindex` not accidentally set on important pages
- [x] Admin and API routes blocked in robots.txt

### Rendering
- [x] Server-side rendering for all storefront pages (Next.js App Router)
- [x] Critical content rendered server-side (not hidden behind client-side JS)
- [x] Loading skeletons for better UX during data fetching
- [x] `loading.js` files for route-level loading states

### Performance (Core Web Vitals)
- [x] Next.js Image optimization (lazy loading, srcset, WebP)
- [x] Font optimization (Inter with `display=swap` via preconnect)
- [x] Minimal JavaScript bundle (no heavy state management libraries)
- [x] Server components reduce client-side JS
- [x] Debounced search (reduces unnecessary API calls)

### Mobile SEO
- [x] Responsive design (mobile-first)
- [x] Viewport meta tag configured
- [x] Touch-friendly UI (no hover-dependent interactions)
- [x] Font sizes readable without zooming

### Security
- [x] HTTPS enforced (`NEXT_PUBLIC_SITE_URL` uses https)
- [x] No mixed content
- [x] httpOnly cookies for admin auth (no XSS exposure)

---

## 7. Content SEO Best Practices

### Product Pages
- **Title format:** `{Product Name} | {siteName}`
- **Description:** Use `metaDescription` field in admin (150-160 chars recommended)
- **Image alt text:** Set via `altText` on ProductImage
- **Tags:** Comma-separated keywords in the `tags` field
- **Unique content:** Avoid duplicate descriptions across products

### Category Pages
- **Title format:** `{Category Name} -- Buy Online in Bangladesh | {siteName}`
- **Description:** Use the `description` field on Category (150-160 chars)
- **Internal linking:** Categories link to products, products link back to categories

### Blog Posts
- **Title format:** `{Post Title} | {siteName} Blog`
- **Description:** Use `metaDescription` or auto-generated from content (first 160 chars)
- **Tags:** Use blog post tags for topic clustering
- **Reading time:** Calculated automatically (word count / 200)
- **Internal linking:** Link to relevant products within blog content
- **Ad injection:** Advertisements injected into content via `blog-ads.js`

### URLs
- **Product URLs:** `/products/{slug}` — lowercase, hyphenated, descriptive
- **Category URLs:** `/categories/{slug}` — same convention
- **Blog URLs:** `/blogs/{slug}` — same convention
- **No query params for content:** Filtering uses `?category=` but canonical points to the proper URL

---

## 8. Social Media SEO

### OpenGraph Tags
Every page includes:
```html
<meta property="og:type" content="website|product|article" />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://example.com/api/og?..." />
<meta property="og:url" content="https://example.com/..." />
<meta property="og:locale" content="en_BD" />
<meta property="og:site_name" content="{siteName}" />
```

### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="..." />
<meta name="twitter:creator" content="@{brand}" />
```

### Best practices applied
- `summary_large_image` card type for maximum visibility
- Dynamic OG images per page type
- Locale set to `en_BD` for Bangladeshi audience
- `og:site_name` and creator handle are populated from `SiteSetting` — never hardcoded

---

## 9. Local SEO (Bangladesh Focus)

### What's implemented
- BDT currency throughout (no USD)
- "Inside Dhaka" / "Outside Dhaka" delivery mentions in metadata
- City names (Dhaka, Chittagong, Sylhet) in page descriptions
- "Cash on Delivery" and "Nationwide Shipping" in OG images
- Bangla content support (`aboutCompanyBn` in SiteSetting)

### Recommended improvements
- Add `LocalBusiness` schema to contact page with address, phone, hours
- Add Google Business Profile link in footer
- Create location-specific landing pages (`/delivery/dhaka`, `/delivery/chittagong`)
- Add `hreflang` tags if Bengali-language pages are added with different URLs

---

## 10. Recommended Improvements

### High Priority

| # | Improvement | File to modify | Status |
|---|---|---|---|
| 1 | Fully dynamic site branding/SEO from `SiteSetting` (no hardcoded brand) | All storefront pages + layouts | ✅ Done |
| 2 | Admin SEO settings section (`metaTitle`, `metaDescription`, `metaKeywords`, `ogImage`) | `prisma/schema.prisma`, `app/api/admin/settings/site/route.js`, `app/admin/settings/site/page.jsx` | ✅ Done |
| 3 | Add `/about`, `/contact`, `/privacy`, `/terms` to sitemap | `app/sitemap.js` | ✅ Done |
| 4 | Remove `/cart`, `/checkout` from sitemap | `app/sitemap.js` | ✅ Done |
| 5 | Add `noindex` to `/thankyou` page | `app/(storefront)/thankyou/page.jsx` | ✅ Done |
| 6 | Add `Disallow: /thankyou` to robots.txt | `app/robots.js` | ✅ Done |
| 7 | Admin-managed `NEXT_PUBLIC_SITE_URL` + `JWT_SECRET` | `prisma/schema.prisma`, `app/api/admin/settings/site-config/route.js`, `app/admin/settings/site-config/page.jsx`, `src/lib/auth*.js`, `src/lib/jwt-secret.js`, `proxy.js`, `app/robots.js`, `app/sitemap.js`, `app/api/og/route.js` | ✅ Done |

> Already implemented (moved out of backlog): `LocalBusiness` JSON-LD on contact page, `Cache-Control` headers on OG route, `BreadcrumbList` JSON-LD on product and category pages.

### Medium Priority

| # | Improvement | File to modify |
|---|---|---|
| 9 | Add `AggregateRating` schema when ratings exist | Product JSON-LD |
| 10 | Add `hreflang` for Bengali content | Layout metadata |
| 11 | Add Google Search Console verification code | `app/(storefront)/layout.jsx` |
| 12 | Add `sameAs` links to JSON-LD Organization | Storefront layout |
| 13 | Remove redundant microdata from blog posts (keep JSON-LD only) | `app/(storefront)/blogs/[slug]/page.jsx` |
| 14 | Add `datePublished`/`dateModified` `<meta>` tags to blog posts | Blog post metadata |

### Low Priority

| # | Improvement | File to modify |
|---|---|---|
| 15 | Add `WebPage` schema to static pages | About/Contact/Privacy/Terms |
| 16 | Add `FAQ` schema to relevant pages | Static pages |
| 17 | Create RSS feed for blog | New `app/feed/route.js` |
| 18 | Add `rel="alternate"` for RSS feed | Storefront layout `<head>` |

---

## 11. SEO Monitoring

### Tools to use
- **Google Search Console:** Submit sitemap, monitor indexing, check coverage
- **Google PageSpeed Insights:** Core Web Vitals scores
- **Google Rich Results Test:** Validate JSON-LD structured data
- **Ahrefs/SEMrush:** Keyword tracking, backlink analysis
- **Screaming Frog:** Technical SEO audits

### Key metrics to track
- Organic traffic (Google Analytics / GTM)
- Indexed pages (Google Search Console)
- Core Web Vitals (LCP, FID, CLS)
- Click-through rate from search results
- Average position for target keywords
- Rich result appearance rate

---

## 12. SEO-Friendly Content Guidelines

### Product descriptions
- Minimum 100 words per product
- Include target keywords naturally (e.g., "buy lingerie in Bangladesh")
- Unique content per product (avoid copy-paste)
- Use the `metaDescription` field for search-optimized summaries (150-160 chars)

### Blog posts
- Minimum 500 words per post
- Use heading hierarchy (H1 → H2 → H3)
- Include internal links to relevant products
- Add alt text to all images
- Use the `tags` field for topic clustering
- Target long-tail keywords (e.g., "how to choose the right bra size in Bangladesh")

### Category descriptions
- Write unique descriptions for each category (150-300 words)
- Include relevant keywords
- Use the `description` field on the Category model

---

## 13. Quick Reference

### Meta tag template per page type

**Product:**
```html
<title>{title} | {siteName}</title>
<meta name="description" content="{metaDescription or auto-generated}" />
<meta name="keywords" content="{tags}" />
<link rel="canonical" href="https://example.com/products/{slug}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{title} | {siteName}" />
<meta property="og:image" content="{firstProductImage or /api/og?title=...}" />
```

**Blog Post:**
```html
<title>{title} | {siteName} Blog</title>
<meta name="description" content="{metaDescription or first 160 chars}" />
<meta name="keywords" content="{tags}" />
<link rel="canonical" href="https://example.com/blogs/{slug}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="{title} | {siteName} Blog" />
<meta property="article:published_time" content="{createdAt}" />
<meta property="article:modified_time" content="{updatedAt}" />
```

**Category:**
```html
<title>{name} -- Buy Online in Bangladesh | {siteName}</title>
<meta name="description" content="{description or auto-generated}" />
<link rel="canonical" href="https://example.com/categories/{slug}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{name} | {siteName}" />
```
