# Plan — Order Invoice Download (Bangla-capable PDF)

> Status: **Implemented** · Updated: 2026-10-05
> Adds a **Download Invoice** button to `/admin/orders/[orderNo]`. Goal: a print-quality A4 invoice
> per order, in Bengali + English, branded with the logo and company info from Admin → Settings →
> Site Setting.
>
> **As built:** the phases below were followed in order. Two additions beyond the plan — the admin
> layout renders the invoice route bare, and the logo is `stat`ed before use because the stored
> `SiteSetting.logo` points at a file that no longer exists. See §8.

---

## 1. The constraint that drives the design

Bengali requires **complex text shaping**: conjuncts (ক্ষ, র্ম, ণ্ড), reph (র্ reordering above
the line), pre-base vowel signs (ে / ৈ must move *before* the consonant), and above/below marks
with correct advance widths.

Every pure-JS PDF writer embeds a TTF but ships **no shaping engine**:

| Library | Bengali result |
|---|---|
| `jspdf` (`doc.text`) | broken — glyphs emitted in logical order, no reordering, no conjuncts |
| `pdf-lib` + `@pdf-lib/fontkit`, `@react-pdf/renderer` | broken — same reason |
| `pdfmake` | broken — same reason |

A correct Bangla invoice must therefore be rendered by something that shapes text: **the browser**
(print engine or 2D canvas) or headless Chrome. Everything below follows from that.

**Current state:** no PDF library installed at all (no `jspdf` / `pdfkit` / `pdfmake` /
`puppeteer` / `html2canvas` / `react-to-print`), and **zero** `window.print()` or `@media print`
anywhere in the repo. Nothing to unwind.

---

## 2. Requirements

1. **Download Invoice** button on the order detail page (`/admin/orders/[orderNo]`).
2. Invoice reflects the live order: items, delivery charge, **discount** (`OrderDetails.discount`),
   and the stored `Order.total`.
3. Bengali labels, English secondary (bilingual).
4. Bengali text must render correctly (shaped conjuncts, no tofu boxes).
5. Branding from Admin → Settings: logo, site name, address, mobile, email, site URL.
6. Discounted totals must be visible and consistent with `order.total`.

### Decisions (confirmed by owner)

| Question | Decision |
|---|---|
| PDF production | **Print route + one-click download** — vector print path first, raster `.pdf` download as a second button |
| Bengali font | **Hind Siliguri** — Google serves the Bengali subset as a 66 KB variable woff2 covering all 4 weights; highly legible, standard for invoices |
| Label language | **Bilingual**, Bangla primary with small English beneath (e.g. `গ্রাহকের তথ্য` / `Customer`) |
| Button placement | **Order detail page only** — no list or report columns |
| Number format | `৳` + English digits (`toLocaleString()`), matching existing admin UI |

### Font facts (verified against the Google Fonts CSS API)

`https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap`
returns one **66 KB** variable woff2 per weight with
`unicode-range: U+0951-0952, U+0964-0965, U+0980-09FE, …` — so only the Bengali subset is
downloaded, and Latin glyphs keep falling through to Inter. Alternative considered:
`Baloo Da 2` (83 KB, rounded display face) — rejected as too informal for an invoice.

---

## 3. Implementation

### 3.1 Font — `app/layout.jsx`, `tailwind.config.js`

Fonts are raw `<link>` tags at `app/layout.jsx:44-54`; `preconnect` for `fonts.googleapis.com` and
`fonts.gstatic.com` is already present (lines 45-46).

- Line 48 stylesheet URL: append `&family=Hind+Siliguri:wght@400;500;600;700`
- `tailwind.config.js` `fontFamily` (lines 45-48): add `bangla: ['"Hind Siliguri"', 'sans-serif']`
- **Leave `sans` (Inter) untouched** so no existing page shifts

No `@font-face`, no `next/font`, no local font files — the repo has none and needs none.

### 3.2 Invoice document — `src/components/admin/InvoiceDocument.jsx` (new)

Pure presentational component, no `'use client'`, no data fetching. Props `{ order, settings }`.
Mirrors the `src/lib/xlsx.js` precedent of a reusable presentation helper.

A4 sheet (210 × 297 mm) using existing brand tokens from `app/globals.css` (`--primary` `#2f0f6b`,
`--warm-sand` `#F9F7F2`, `--editorial-ink` `#201144`).

1. **Header band** — logo from `settings.logo`; right-aligned `settings.address`,
   `settings.mobile`, `settings.email`, `settings.siteUrl`; `settings.siteName` as wordmark.
   - `settings.logo` is already a site-relative `/api/files/...` URL (written by
     `app/api/admin/upload/route.js:52`, served by `app/api/files/[...path]/route.js`) so it
     resolves in the browser. Fall back to the site name when it is empty.
   - **Never** render `jwtSecret`, `telegramBotToken`, or `telegramChatId` from the same row.
2. **Meta strip** — `ইনভয়েস / Invoice No.` = `INV-<orderNo>`; date + time; order no; status pill
   reusing the `orderStatusColors` map already in `app/admin/orders/[orderNo]/page.jsx:11-18`.
3. **Two columns** —
   - `গ্রাহকের তথ্য / Customer`: `details.customerName`, `details.phoneNumber`,
     `details.shippingAddress`, `details.shippingArea`
   - `ডেলিভারি তথ্য / Delivery`: area, delivery charge (`Free` when 0), payment method (manual
     confirmation / COD — no gateway per project status)
4. **Items table** — `#`, `itemImagePath` thumbnail, `productTitle`, `sku`, `variantName`,
   `quantity`, `purchasePrice`, line total. `<thead>` set to repeat across page breaks.
5. **Totals (right aligned)** — Subtotal = Σ `purchasePrice × quantity`; `−৳X` **Discount** rendered
   only when > 0, from `order.details.discount`; Delivery (`Free` when 0); Grand Total =
   `order.total`.
6. **Footer** — `ধন্যবাদ / Thank you`, `settings.copyrightText`, site URL.
7. **Watermark** — rotated `বাতিল / CANCELLED` overlay when `orderStatus === 'cancelled'`.

Dates use `toLocaleDateString('en-US', …)` + `toLocaleTimeString`, matching the detail page.

### 3.3 Invoice route — `app/admin/orders/[orderNo]/invoice/page.jsx` (new)

Server component.

- `const order = await getOrderByOrderNo(params.orderNo)` — existing action
  (`src/actions/orders.js:55`), includes `details`, `items`, `user`
- `const settings = await getSiteSettings()` — server-only helper
  (`src/lib/getSiteSettings.js`, React `cache()`-wrapped singleton read). Valid here because this
  is a server component; it must **not** be called from a client component.
- `notFound()` when the order is missing
- `export const metadata` → `Invoice ${orderNo}`
- Renders `<InvoiceDocument>` inside a thin client `<InvoiceActions>`:
  - `প্রিন্ট / Print` → `window.print()`
  - `ডাউনলোড PDF / Download PDF` → §3.6 helper
- Auto-print **only** when the URL carries `?autoprint=1` (the detail-page link adds it), so a manual
  visit of the route is not hijacked

### 3.4 Admin chrome — `app/admin/layout.jsx`

Every admin page is wrapped in `AdminSidebar` + `AdminHeader` (lines 52-75). Add the invoice path
to the existing bare-render branch (the `isLogin` pattern at lines 34 and 44) so the chrome never
renders on the invoice route — cleaner and more reliable than hiding it with print CSS.

### 3.5 Print CSS — `app/globals.css`

The repo has **no** `@media print` today, so everything is scoped to `.invoice-*` classes to avoid
giving the rest of the site print behaviour by accident.

```css
@page { size: A4; margin: 12mm; }

@media print {
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .invoice-sheet       { box-shadow: none !important; }
  .invoice-row         { break-inside: avoid; }
  .invoice-table thead { display: table-header-group; }
  .no-print            { display: none !important; }
}
```

### 3.6 One-click `.pdf` — `src/lib/invoicePdf.js` (new)

**Dependencies (the only new ones):** `npm i jspdf html2canvas` (jspdf 4.2.1, html2canvas 1.4.1).
Justification per `docs/ai-workflow-rules.md` rule #9 — required to rasterize a
shaping-engine-rendered DOM, because no shaping-capable pure-JS PDF writer exists.

```js
export async function buildInvoicePdf(node, filename) {
  await document.fonts.ready;                 // critical, else Bangla renders as fallback boxes
  const canvas = await html2canvas(node, {
    scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
  });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  // slice canvas across A4 pages: pdfWidth 210, pageHeight 297
  return pdf.output('blob');
}
```

- Both packages `await import()`-ed **inside** the function → never enter the shared bundle
- Downloaded with the same Blob + anchor pattern as `app/admin/reports/sales/page.jsx:72-79`
- `generating` state disables the button and shows a spinner, matching the report page's `exporting`
  pattern (lines 142, 470-512)

**Caveat, stated honestly:** this path is **raster** — text is not selectable or searchable, print
quality is ~150 DPI at `scale: 2`, and the file is ~300 KB–1 MB. The **Print** button remains the
high-fidelity, vector, tiny-file route. Shipping both is deliberate.

### 3.7 Button — `app/admin/orders/[orderNo]/page.jsx`

Header actions `<div className="flex items-center gap-2">` (line ~202), beside the status pill:

- Label: `ইনভয়েস ডাউনলোড / Download Invoice`
- `href={`/admin/orders/${order.orderNo}/invoice?autoprint=1`}`, `target="_blank"`,
  `rel="noopener"`
- Styled like the existing admin buttons: white/slate surface, `shadow-sm`, brand hover, with the
  same light + dark classes used throughout the page

---

## 4. Files touched

| File | Action |
|---|---|
| `app/layout.jsx` | modify — Google Fonts link |
| `tailwind.config.js` | modify — `bangla` font token |
| `app/globals.css` | modify — `@page` + scoped `@media print` |
| `app/admin/layout.jsx` | modify — bare-render branch for the invoice route |
| `app/admin/orders/[orderNo]/page.jsx` | modify — Download Invoice button |
| `app/admin/orders/[orderNo]/invoice/page.jsx` | **new** — server component route |
| `src/components/admin/InvoiceDocument.jsx` | **new** — presentational invoice |
| `src/lib/invoicePdf.js` | **new** — client PDF helper |
| `package.json` | modify — `jspdf`, `html2canvas` |
| `docs/admin-panel.md` | modify — new route + buttons |
| `docs/progress-tracker.md` | modify — session entry (rule #10) |
| `docs/ui-context.md` | modify if fonts are catalogued there |

**No schema change** — `OrderDetails.discount` already exists, and `order.total` already reflects
it (`total = subtotal + deliveryCharge − discount`, recalculated by `recalculateOrderTotal()` in
`src/actions/orders.js`).

---

## 5. Docs to keep in sync (rule #10)

- `docs/admin-panel.md` — the invoice route, the two buttons, and the print CSS note
- `docs/progress-tracker.md` — session entry
- `docs/ui-context.md` — Hind Siliguri token, if fonts are catalogued there

---

## 6. Verification

1. `npm run build` passes (no regressions)
2. Open `/admin/orders/958970/invoice?autoprint=1`:
   - Bangla conjuncts render correctly (ক্ষ, ণ্ড, ে reordering) — no tofu boxes
   - Single A4 page for a typical order; multi-page for a large one, with `<thead>` repeated
   - No sidebar / header bleed-through
   - Logo + company info pulled from Admin → Settings
   - Discount row appears and matches `order.total`
3. Click `ডাউনলোড PDF` — the file downloads, opens, and Bangla is intact
4. Print preview = 1 page, brand colours preserved

---

## 7. Out of scope — flagged follow-up

`app/api/admin/settings/site/route.js` has **no auth check** on GET (lines 4-15) or PUT (lines
17-39), and `proxy.js:52-54` matches only `/admin/:path*` — so **every** `/api/admin/*` route is
self-unguarded. `requireAdmin()` from `src/lib/catalog/auth.js:3-8` should be applied there, and
audited across `app/api/admin/**`. Separate fix, not part of this plan.

---

## 8. What changed during implementation

Two things were not in the original plan, both discovered by building it.

**The admin layout must render the invoice route bare.** The plan assumed print CSS would hide the
sidebar and header. Hiding them is sufficient for *printing* but not for *rasterising* — the capture
sweeps the whole document, so the admin chrome would be composited into the PDF and the page would
come out several times the size it should. `app/admin/layout.jsx` now has an `isBare` branch
(covering both `/admin/login` and `/admin/orders/[orderNo]/invoice`) that returns the children
without the chrome at all.

**`SiteSetting.logo` points at a file that does not exist.** The stored value is
`/uploads/settings/eghuri-logo.png`; `data/uploads/settings/` holds only timestamp-named files and
nothing by that name, so it 404s. On screen that is a broken image, which is survivable. On a printed
invoice it is a torn placeholder box on a document handed to a customer, which is not. The route now
`stat`s site-relative `/uploads` logos and drops the field when the file is missing, so the sheet
falls back to the site name. Absolute URLs are passed through unverified. The same stale value also
breaks the storefront header and admin sidebar — **not** fixed here, since which of the twelve
uploaded files is the intended logo is the owner's decision. Recorded in `progress-tracker.md` Next
Steps.

### Verification actually performed

The on-screen checks in §6 steps 2–4 could not be run: no desktop browser is attached to this
session. What was done instead:

- `npm run build` passes; `/admin/orders/[orderNo]/invoice` builds as a dynamic route.
- Three throwaway orders were seeded (cancelled-with-discount, a 46-item order to force multi-page, a
  zero-discount free-delivery order), and each invoice was fetched over HTTP as an authenticated
  admin and asserted against the **server-rendered HTML**: Bangla labels intact, watermark present
  only when cancelled, discount row present only when `discount > 0`, all 46 rows present, no
  `jwtSecret` / `telegramBotToken` / `telegramChatId` in any response, no stale logo reference.
- The compiled stylesheet was fetched and checked for every rule the print path depends on —
  `@page`, `@media print`, `.invoice-sheet`, `.invoice-row`, `break-inside`, `table-header-group`,
  `.no-print`, `print-color-adjust` — and `.font-bangla` was confirmed to resolve to Hind Siliguri.
- Bundle isolation confirmed by grepping the build output: neither the storefront nor the order
  detail page references the invoice or PDF chunks, and no jspdf/html2canvas bytes appear in any
  eager chunk.
- Unauthenticated access 307s to the login page; an unknown order number 404s. Scratch orders and
  the temporary QA user were deleted, and orders 958970 / 572979 were confirmed back at their exact
  prior state.

One trap worth recording: React splits adjacent text nodes with `<!-- -->` comments, so `−৳250`
serialises as `−<!-- -->৳250`. HTML assertions on a React-rendered page must account for those
markers or they will report false failures.
