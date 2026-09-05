# Testing & QA

## Current State
- **No test framework is currently configured** (no Jest/Vitest/Playwright in `package.json`).
- Quality is currently ensured via manual QA and `npm run build` passing before deployment.

## Recommended Setup

### Unit & Component Tests
- Jest + React Testing Library for components and utilities.
- Priority targets: pricing/discount logic, cart & wishlist storage helpers (`src/lib/`), blog ad injection (`src/lib/blog-ads.js`), checkout validation.

### Integration Tests
- Test API routes and Prisma queries against a test database (Docker Postgres).
- Priority: `/api/checkout` (validation, fraud checks, delivery charge math), admin CRUD routes.

### E2E
- Playwright or Cypress for critical flows: browse → variant select → add-to-cart → checkout → order confirmation; admin login → product CRUD → order status update.

### Accessibility
- Integrate `axe-core` checks; manual keyboard navigation passes on storefront and admin.

## CI
- GitHub Actions: lint, build, unit tests; optionally run E2E on major branches.
- Note: deployment target is Vercel; `postinstall` runs `prisma generate`, so CI must provide `DATABASE_URL` (or skip data-dependent steps) for builds.
