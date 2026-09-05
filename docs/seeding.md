# Seeding Strategy

## Overview
Seeding is a scraper-based pipeline that populates the database with real catalog data (scraped from eghuri.com), site settings, and bilingual blog content. All seed scripts live in `prisma/`.

## Pipeline

```
npm run seed
  └── prisma/seed.js (orchestrator, runs sequentially via execSync)
        ├── prisma/seedSettings.js   → admin user + SiteSetting + sliders + social links
        ├── npm run seed-catalog     → categories + products from catalogData.json
        └── node prisma/seedBlog.js  → blog categories + posts
```

### Catalog sub-pipeline
```
npm run fetch-catalog            → prisma/fetchCatalog.js
  scrapes eghuri.com with cheerio (categories from mobile menu,
  product pages, concurrency 5) → writes prisma/catalogData.json

prisma/processCatalog.js         → post-processes catalogData.json:
  large EN→BN translation map generating Bengali tags/meta descriptions

npm run seed-catalog             → prisma/seedCatalog.js
  upserts parent + sub categories (parentId hierarchy) and products
  (generated unique SKUs/slugs, images, breadcrumb-based categorization)
```

## Scripts Reference

| Script | File | Purpose |
|---|---|---|
| `npm run seed` | `prisma/seed.js` | Orchestrator: settings → catalog → blog |
| `npm run fetch-catalog` | `prisma/fetchCatalog.js` | Scrape source site into `catalogData.json` (~168KB cache) |
| — | `prisma/processCatalog.js` | Translate/augment scraped data (run as part of pipeline) |
| `npm run seed-catalog` | `prisma/seedCatalog.js` | Upsert categories & products from JSON |
| — | `prisma/seedSettings.js` | Admin user (bcrypt), SiteSetting singleton ("Eghuri" identity, Bangla about text, announcement text), 5 hero sliders, 3 social links |
| — | `prisma/seedBlog.js` | 7 bilingual blog categories + ~14 long-form Bengali HTML posts |
| — | `prisma/catalogseedcopy` | Backup copy of an earlier seed script |

## What Gets Seeded
1. **Admin user** — email + bcrypt-hashed password for `/admin/login`
2. **SiteSetting singleton** — site name, logo/favicon refs, contact info, announcement text, about company (EN + BN), integration placeholders
3. **Hero sliders** — 5 slides; **Social links** — 3 entries
4. **Categories** — parent/sub hierarchy matching the source site
5. **Products** — real titles/prices/images, generated unique SKUs and slugs, categorized via breadcrumbs
6. **Blog content** — categories and Bengali posts with HTML content

## Usage

```bash
npx prisma generate          # generate client (also runs on postinstall)
npx prisma migrate dev       # apply schema migrations
npm run seed                 # full seed (settings + catalog + blog)

# Partial / maintenance commands
npm run fetch-catalog        # re-scrape source site
npm run seed-catalog         # re-seed catalog only
node prisma/seedBlog.js      # re-seed blog only
npx prisma db seed           # same as npm run seed (prisma config)
npx prisma migrate reset --force --skip-seed   # drop & re-apply migrations without seeding
npx prisma migrate deploy    # apply migrations in production
```

All seeds use upserts, so they are idempotent and safe to re-run.
